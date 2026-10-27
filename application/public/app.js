
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

refreshButton.addEventListener("click", loadDashboard);

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