const logger = require("../logging.js");

async function logAndQuery(connection, sql, params) {
  logger.logSqlQuery(sql, params);
  return connection.execute(sql, params);
}

module.exports = { logAndQuery };
