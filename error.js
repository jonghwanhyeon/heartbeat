module.exports = class HeartbeatError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
};