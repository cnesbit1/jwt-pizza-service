const config = require("./config.js");

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        resBody: JSON.stringify(resBody),
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, "http", logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  log(level, type, logData) {
    const labels = {
      component: config.logging.source,
      level: level,
      type: type,
    };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  logSqlQuery(query, params) {
    this.log("info", "sql", { query, params });
  }

  logServiceRequest(serviceName, action, input) {
    this.log("info", "service", { serviceName, action, input });
  }

  logException(error) {
    this.log("error", "exception", {
      message: error.message,
      stack: error.stack,
    });
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);
    return logData
      .replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"')
      .replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\": \\"*****\\"')
      .replace(/\\"email\\":\s*\\"[^"]*\\"/g, '\\"email\\": \\"*****\\"');
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: "post",
      body: body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    }).then((res) => {
      if (!res.ok) console.log("Failed to send log to Grafana");
    });
  }
}
module.exports = new Logger();
