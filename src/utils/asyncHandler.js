import { ApiError } from "./ApiError.js";

//higher order function
const asyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      msg: error.message,
    });
  }
};

const asyncHandler2 = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
export { asyncHandler, asyncHandler2 };
