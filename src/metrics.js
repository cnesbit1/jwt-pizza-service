const os = require("os");
const config = require("./config");
const fetch = require("node-fetch");

const requests = {};
const authAttempts = { success: 0, failure: 0 };
const purchaseStats = { success: 0, failure: 0, revenue: 0, latency: [] };
const activeUsers = new Set();

function getCpuUsagePercentage() {
  const cpus = os.cpus();

  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    const { user, nice, sys, idle, irq } = cpu.times;
    totalIdle += idle;
    totalTick += user + nice + sys + idle + irq;
  });

  const usage = 1 - totalIdle / totalTick;
  return +(usage * 100).toFixed(2);
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  return +((usedMemory / totalMemory) * 100).toFixed(2);
}

function sendMetricToGrafana(metricName, metricValue, attributes = {}) {
  const timestamp = Date.now() * 1e6;
  const tags = { source: config.metrics.source, ...attributes };

  const tagString = Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");

  const line = `${metricName},${tagString} value=${metricValue} ${timestamp}`;

  //   console.log(`\n Sending Metric → ${metricName}`);
  //   console.log(`   Value: ${metricValue}`);
  //   if (Object.keys(attributes).length > 0) {
  //     console.log(`   Tags: ${JSON.stringify(attributes)}`);
  //   }
  //   console.log(`   Line Protocol: ${line}\n`);

  fetch(config.metrics.url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(config.metrics.apiKey).toString(
        "base64"
      )}`,
      "Content-Type": "text/plain",
    },
    body: line,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        // console.error("Failed to push to Influx:", res.status, text);
      } else {
        // console.log(`Successfully pushed ${metricName}`);
      }
    })
    .catch((err) => {
      //   console.error("Error pushing to Influx:", err);
    });
}

function requestTracker(req, res, next) {
  const method = req.method;
  requests[method] = (requests[method] || 0) + 1;

  const user = req.user?.email;
  if (user) activeUsers.add(user);

  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    sendMetricToGrafana("http_request_latency", latency, {
      method,
      path: req.route?.path || req.path,
    });
  });
  next();
}

function recordAuthAttempt(success) {
  if (success) authAttempts.success++;
  else authAttempts.failure++;
}

function recordPizzaPurchase(success, latency, cost) {
  if (success) {
    purchaseStats.success++;
    purchaseStats.revenue += cost;
    purchaseStats.latency.push(latency);
  } else {
    purchaseStats.failure++;
  }
}

function sendMetricsPeriodically(period = 10000) {
  setInterval(() => {
    try {
      for (const method in requests) {
        sendMetricToGrafana("http_requests", requests[method], { method });
        requests[method] = 0;
      }

      sendMetricToGrafana("active_users", activeUsers.size, {});

      sendMetricToGrafana("auth_success", authAttempts.success, {});
      sendMetricToGrafana("auth_failure", authAttempts.failure, {});
      authAttempts.success = 0;
      authAttempts.failure = 0;

      sendMetricToGrafana("pizza_success", purchaseStats.success, {});
      sendMetricToGrafana("pizza_failure", purchaseStats.failure, {});
      sendMetricToGrafana(
        "pizza_revenue",
        purchaseStats.revenue.toFixed(2),
        {}
      );

      const avgLatency = purchaseStats.latency.length
        ? (
            purchaseStats.latency.reduce((a, b) => a + b, 0) /
            purchaseStats.latency.length
          ).toFixed(2)
        : 0;
      sendMetricToGrafana("pizza_latency", avgLatency, {});

      purchaseStats.success = 0;
      purchaseStats.failure = 0;
      purchaseStats.revenue = 0;
      purchaseStats.latency = [];

      sendMetricToGrafana("cpu_usage", getCpuUsagePercentage(), {});
      sendMetricToGrafana("memory_usage", getMemoryUsagePercentage(), {});
    } catch (error) {
      console.error("Error sending metrics:", error);
    }
  }, period);
}

module.exports = {
  requestTracker,
  recordAuthAttempt,
  recordPizzaPurchase,
  sendMetricsPeriodically,
  activeUsers,
};
