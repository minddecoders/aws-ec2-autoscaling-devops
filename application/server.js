
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand
} = require("@aws-sdk/client-auto-scaling");

const {
  CloudWatchClient,
  GetMetricDataCommand,
  DescribeAlarmsCommand
} = require("@aws-sdk/client-cloudwatch");

const {
  ElasticLoadBalancingV2Client,
  DescribeTargetGroupsCommand
} = require("@aws-sdk/client-elastic-load-balancing-v2");

const PORT = Number(process.env.PORT) || 3000;
const APP_VERSION = "1.0.0";
const GIT_COMMIT_SHA = process.env.GIT_COMMIT_SHA || "unknown";
const AWS_REGION = process.env.AWS_REGION || "eu-west-1";
const AUTO_SCALING_GROUP_NAME =
  process.env.AUTO_SCALING_GROUP_NAME || "";
const TARGET_GROUP_ARN = process.env.TARGET_GROUP_ARN || "";
const ALARM_PREFIX =
  process.env.CLOUDWATCH_ALARM_PREFIX || "aws-ec2-autoscaling-devops";

const PUBLIC_DIR = path.join(__dirname, "public");
const startedAt = Date.now();

const autoScalingClient = new AutoScalingClient({ region: AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: AWS_REGION });
const loadBalancerClient = new ElasticLoadBalancingV2Client({
  region: AWS_REGION
});

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });

  res.end(JSON.stringify(data));
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJson(res, 500, {
        error: "Unable to read the requested file."
      });
    }

    const contentType =
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });

    res.end(content);
  });
}

function metricQuery(id, namespace, metricName, dimensions, statistic) {
  return {
    Id: id,
    MetricStat: {
      Metric: {
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: dimensions
      },
      Period: 300,
      Stat: statistic
    },
    ReturnData: true
  };
}

function latestValue(result, id) {
  const metric = result.MetricDataResults?.find(item => item.Id === id);

  if (!metric || !metric.Values?.length) {
    return null;
  }

  const points = metric.Timestamps.map((timestamp, index) => ({
    timestamp: new Date(timestamp),
    value: metric.Values[index]
  })).sort((a, b) => b.timestamp - a.timestamp);

  return points[0]?.value ?? null;
}

function totalValue(result, id) {
  const metric = result.MetricDataResults?.find(item => item.Id === id);

  if (!metric || !metric.Values?.length) {
    return 0;
  }

  return metric.Values.reduce((total, value) => total + value, 0);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  const pathname = requestUrl.pathname;

  console.log(JSON.stringify({
    level: "info",
    message: "HTTP request",
    method: req.method,
    path: pathname,
    timestamp: new Date().toISOString()
  }));

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (pathname === "/health") {
    return sendJson(res, 200, {
      status: "healthy",
      version: APP_VERSION
    });
  }

  if (pathname === "/api/info") {
    return sendJson(res, 200, {
      name: "CloudOps Infrastructure Dashboard",
      version: APP_VERSION,
      commitSha: GIT_COMMIT_SHA,
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor((Date.now() - startedAt) / 1000)
    });
  }

  if (pathname === "/api/autoscaling") {
    if (!AUTO_SCALING_GROUP_NAME) {
      return sendJson(res, 503, {
        error: "Auto Scaling Group is not configured."
      });
    }

    try {
      const result = await autoScalingClient.send(
        new DescribeAutoScalingGroupsCommand({
          AutoScalingGroupNames: [AUTO_SCALING_GROUP_NAME]
        })
      );

      const group = result.AutoScalingGroups?.[0];

      if (!group) {
        return sendJson(res, 404, {
          error: "Auto Scaling Group not found."
        });
      }

      const instances = group.Instances || [];

      return sendJson(res, 200, {
        name: group.AutoScalingGroupName,
        minSize: group.MinSize,
        maxSize: group.MaxSize,
        desiredCapacity: group.DesiredCapacity,
        currentCapacity: instances.length,
        inServiceInstances: instances.filter(
          instance => instance.LifecycleState === "InService"
        ).length,
        status: "available"
      });
    } catch (error) {
      console.error("Auto Scaling lookup failed:", error.name || error.message);
      return sendJson(res, 502, {
        error: "Unable to retrieve Auto Scaling capacity."
      });
    }
  }

  if (pathname === "/api/cloudwatch") {
    if (!AUTO_SCALING_GROUP_NAME || !TARGET_GROUP_ARN) {
      return sendJson(res, 503, {
        error: "Auto Scaling Group or target group ARN is not configured."
      });
    }

    try {
      const [groupResult, targetResult, alarmResult] = await Promise.all([
        autoScalingClient.send(
          new DescribeAutoScalingGroupsCommand({
            AutoScalingGroupNames: [AUTO_SCALING_GROUP_NAME]
          })
        ),
        loadBalancerClient.send(
          new DescribeTargetGroupsCommand({
            TargetGroupArns: [TARGET_GROUP_ARN]
          })
        ),
        cloudWatchClient.send(
          new DescribeAlarmsCommand({
            AlarmNamePrefix: ALARM_PREFIX,
            MaxRecords: 100
          })
        )
      ]);

      const group = groupResult.AutoScalingGroups?.[0];
      const targetGroup = targetResult.TargetGroups?.[0];

      if (!group) {
        return sendJson(res, 404, {
          error: "Auto Scaling Group not found."
        });
      }

      if (!targetGroup) {
        return sendJson(res, 404, {
          error: "Target group not found."
        });
      }

      const loadBalancerArn = targetGroup.LoadBalancerArns?.[0];

      if (!loadBalancerArn) {
        return sendJson(res, 503, {
          error: "Target group is not associated with a load balancer."
        });
      }

      // AWS/EC2 CPUUtilization uses InstanceId as its dimension.
      const instances = (group.Instances || []).filter(
        instance => instance.InstanceId
      );

      const queries = instances.map((instance, index) =>
        metricQuery(
          `cpu_${index}`,
          "AWS/EC2",
          "CPUUtilization",
          [{ Name: "InstanceId", Value: instance.InstanceId }],
          "Average"
        )
      );

      const asgDimension = [{
        Name: "AutoScalingGroupName",
        Value: AUTO_SCALING_GROUP_NAME
      }];

      queries.push(
        metricQuery("desired", "AWS/AutoScaling", "GroupDesiredCapacity",
          asgDimension, "Average"),
        metricQuery("inservice", "AWS/AutoScaling", "GroupInServiceInstances",
          asgDimension, "Average"),
        metricQuery("minimum", "AWS/AutoScaling", "GroupMinSize",
          asgDimension, "Average"),
        metricQuery("maximum", "AWS/AutoScaling", "GroupMaxSize",
          asgDimension, "Average")
      );

      const lbSuffix = loadBalancerArn.split(":loadbalancer/")[1];
      const tgSuffix = TARGET_GROUP_ARN.split(":targetgroup/")[1];

      if (!lbSuffix || !tgSuffix) {
        return sendJson(res, 500, {
          error: "Unable to determine load balancer metric dimensions."
        });
      }

      queries.push(
        metricQuery("healthy", "AWS/ApplicationELB", "HealthyHostCount", [
          { Name: "LoadBalancer", Value: lbSuffix },
          { Name: "TargetGroup", Value: tgSuffix }
        ], "Average"),
        metricQuery("unhealthy", "AWS/ApplicationELB", "UnHealthyHostCount", [
          { Name: "LoadBalancer", Value: lbSuffix },
          { Name: "TargetGroup", Value: tgSuffix }
        ], "Maximum"),
        metricQuery("requests", "AWS/ApplicationELB", "RequestCount", [
          { Name: "LoadBalancer", Value: lbSuffix }
        ], "Sum"),
        metricQuery("elb_5xx", "AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", [
          { Name: "LoadBalancer", Value: lbSuffix }
        ], "Sum")
      );

      const now = new Date();
      const metricsResult = await cloudWatchClient.send(
        new GetMetricDataCommand({
          StartTime: new Date(now.getTime() - 60 * 60 * 1000),
          EndTime: now,
          MetricDataQueries: queries,
          ScanBy: "TimestampDescending"
        })
      );

      const cpuValues = instances
        .map((instance, index) => latestValue(metricsResult, `cpu_${index}`))
        .filter(value => value !== null);

      const cpuAverage = cpuValues.length
        ? cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length
        : null;

      const alarms = (alarmResult.MetricAlarms || []).map(alarm => ({
        name: alarm.AlarmName,
        state: alarm.StateValue,
        reason: alarm.StateReason || "",
        updatedAt: alarm.StateUpdatedTimestamp || null
      }));

      return sendJson(res, 200, {
        region: AWS_REGION,
        timestamp: now.toISOString(),
        period: "Last hour; metric points use 5-minute periods",
        cpu: {
          averagePercent: cpuAverage,
          instancesReporting: cpuValues.length
        },
        autoScaling: {
          groupName: group.AutoScalingGroupName,
          desiredCapacity: latestValue(metricsResult, "desired"),
          inServiceInstances: latestValue(metricsResult, "inservice"),
          minSize: latestValue(metricsResult, "minimum"),
          maxSize: latestValue(metricsResult, "maximum"),
          currentCapacity: (group.Instances || []).length
        },
        loadBalancer: {
          targetGroup: targetGroup.TargetGroupName,
          healthyTargets: latestValue(metricsResult, "healthy"),
          unhealthyTargets: latestValue(metricsResult, "unhealthy"),
          requestsLastHour: totalValue(metricsResult, "requests"),
          elb5xxErrorsLastHour: totalValue(metricsResult, "elb_5xx")
        },
        alarms
      });
    } catch (error) {
      console.error("CloudWatch lookup failed:", error.name || error.message);

      return sendJson(res, 502, {
        error: "Unable to retrieve CloudWatch metrics. Check the EC2 role permissions and AWS configuration."
      });
    }
  }

  const publicFiles = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js"
  };

  const fileName = publicFiles[pathname];

  if (!fileName) {
    return sendJson(res, 404, { error: "Route not found." });
  }

  const filePath = path.join(PUBLIC_DIR, fileName);

  if (req.method === "HEAD") {
    const contentType =
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    });

    return res.end();
  }

  serveStaticFile(res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({
    level: "info",
    message: "Application started",
    port: PORT,
    version: APP_VERSION,
    region: AWS_REGION,
    timestamp: new Date().toISOString()
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({
    level: "info",
    message: "Shutdown requested",
    signal
  }));

  server.close(error => {
    if (error) {
      console.error("Server shutdown failed:", error);
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
