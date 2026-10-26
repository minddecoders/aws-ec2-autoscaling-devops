
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PORT = Number(process.env.PORT) || 3000;
const APP_VERSION = "1.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const startedAt = Date.now();

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
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: "Unable to read the requested file."
        });
      }
      return;
    }

    const contentType =
      MIME_TYPES[path.extname(filePath)] ||
      "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });

    res.end(content);
  });
}

const server = http.createServer((req, res) => {
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

    return sendJson(res, 405, {
      error: "Method not allowed."
    });
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
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor((Date.now() - startedAt) / 1000)
    });
  }

  const publicFiles = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js"
  };

  const fileName = publicFiles[pathname];

  if (!fileName) {
    return sendJson(res, 404, {
      error: "Route not found."
    });
  }

  const filePath = path.join(PUBLIC_DIR, fileName);

  if (req.method === "HEAD") {
    const contentType =
      MIME_TYPES[path.extname(filePath)] ||
      "application/octet-stream";

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
    timestamp: new Date().toISOString()
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({
    level: "info",
    message: "Shutdown requested",
    signal
  }));

  server.close((error) => {
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
