class HeartbeatError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
};

class ValidationError extends Error {
  constructor(message) {
    super(message);
  }
};

module.exports = {
	HeartbeatError,
	ValidationError
}