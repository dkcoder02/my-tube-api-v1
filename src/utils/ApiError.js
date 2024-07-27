class ApiError extends Error {
  constructor(
    statusCode,
    message = "something went to wrong!!",
    errors = [],
    stack = ""
  ) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.data = null;
    this.success = false;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
