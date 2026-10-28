
const refreshButton = document.querySelector("#refresh-button");

function formatUptime(seconds) {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;

  return `${remainingSeconds}s`;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value ?? "Unavailable";
}

async function loadDashboard() {
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";

  const healthValue = document.querySelector("#health-value");
  const errorMessage = document.querySelector("#error-message");

  errorMessage.textContent = "";

  try {
    const [healthResponse, infoResponse] = await Promise.all([
      fetch("/health", { cache: "no-store" }),
      fetch("/api/info", { cache: "no-store" })
    ]);

    if (!healthResponse.ok || !infoResponse.ok) {
      throw new Error("The backend returned an unsuccessful response.");
    }

    const health = await healthResponse.json();
    const info = await infoResponse.json();

    const isHealthy = health.status === "healthy";

    setText("#health-value", isHealthy ? "Healthy" : "Unhealthy");
    healthValue.classList.toggle("healthy", isHealthy);
    healthValue.classList.toggle("unhealthy", !isHealthy);

    setText(
      "#health-detail",
      isHealthy ? "Health check passed" : "Health check reported a problem"
    );

    setText("#version-value", info.version);
    setText("#commit-sha-value", info.commitSha);
    setText("#hostname-value", info.hostname);
    setText("#uptime-value", formatUptime(info.uptime));
    setText("#runtime-value", info.nodeVersion);
    setText("#platform-value", info.platform);

    setText(
      "#last-updated",
      `Updated ${new Date().toLocaleTimeString()}`
    );
  } catch (error) {
    setText("#health-value", "Unavailable");
    setText("#health-detail", "Could not reach the backend");

    healthValue.classList.remove("healthy");
    healthValue.classList.add("unhealthy");

    errorMessage.textContent =
      "Unable to load application data. Check the backend service.";
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh";
  }
}

refreshButton.addEventListener("click", () => { loadDashboard(); loadAutoScaling(); loadCloudWatch(); });

loadDashboard();

async function loadAutoScaling() {
  const status = document.querySelector("#asg-status");

  try {
    const response = await fetch("/api/autoscaling", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`AWS API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    document.querySelector("#asg-name-value").textContent = data.name;
    document.querySelector("#asg-desired-value").textContent =
      data.desiredCapacity;
    document.querySelector("#asg-current-value").textContent =
      data.currentCapacity;
    document.querySelector("#asg-inservice-value").textContent =
      data.inServiceInstances;
    document.querySelector("#asg-range-value").textContent =
      `${data.minSize} / ${data.maxSize}`;

    status.textContent = "Connected to AWS";
  } catch (error) {
    status.textContent = "Auto Scaling data unavailable";
    console.error("Auto Scaling dashboard error:", error);
  }
}
loadAutoScaling();

function displayMetric(selector, value, suffix = "") {
  const output = document.querySelector(selector);
  if (!output) return;

  output.textContent =
    value === null || value === undefined
      ? "No data"
      : `${value}${suffix}`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "No data";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1
  });
}

async function loadCloudWatch() {
  const error = document.querySelector("#cw-error");
  const alarmsList = document.querySelector("#cw-alarms-list");

  error.textContent = "";

  try {
    const response = await fetch("/api/cloudwatch", {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    displayMetric(
      "#cw-cpu",
      data.cpu.averagePercent === null
        ? null
        : Number(data.cpu.averagePercent).toFixed(1),
      data.cpu.averagePercent === null ? "" : "%"
    );

    displayMetric(
      "#cw-healthy",
      formatNumber(data.loadBalancer.healthyTargets)
    );
    displayMetric(
      "#cw-unhealthy",
      formatNumber(data.loadBalancer.unhealthyTargets)
    );
    displayMetric(
      "#cw-requests",
      formatNumber(data.loadBalancer.requestsLastHour)
    );
    displayMetric(
      "#cw-5xx",
      formatNumber(data.loadBalancer.elb5xxErrorsLastHour)
    );
    displayMetric(
      "#cw-inservice",
      formatNumber(data.autoScaling.inServiceInstances)
    );

    document.querySelector("#cw-cpu-detail").textContent =
      `${data.cpu.instancesReporting} instance(s) reporting`;
    document.querySelector("#cw-capacity-detail").textContent =
      `Desired: ${data.autoScaling.desiredCapacity ?? "—"} · Range: ` +
      `${data.autoScaling.minSize ?? "—"}–${data.autoScaling.maxSize ?? "—"}`;

    document.querySelector("#cw-updated").textContent =
      `Updated ${new Date().toLocaleTimeString()}`;

    const alarms = data.alarms || [];

    if (alarms.length === 0) {
      alarmsList.textContent = "No matching CloudWatch alarms found.";
    } else {
      alarmsList.replaceChildren();

      for (const alarm of alarms) {
        const row = document.createElement("div");
        row.className = "cw-alarm-row";

        const name = document.createElement("strong");
        name.className = "cw-alarm-name";
        name.textContent = alarm.name;

        const state = document.createElement("span");
        state.className = `cw-alarm-state ${String(alarm.state).toLowerCase()}`;
        state.textContent = alarm.state;

        const reason = document.createElement("p");
        reason.className = "metric-detail";
        reason.textContent = alarm.reason || "No additional state details";

        row.append(name, state, reason);
        alarmsList.appendChild(row);
      }
    }
  } catch (err) {
    error.textContent = `CloudWatch unavailable: ${err.message}`;
    document.querySelector("#cw-updated").textContent = "Update failed";
    console.error("CloudWatch dashboard error:", err);
  }
}

// Refresh CloudWatch automatically every minute.\nloadCloudWatch();
setInterval(loadCloudWatch, 60000);
