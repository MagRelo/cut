import { Context } from "hono";

export const errorHandler = (error: Error, c: Context) => {
  console.error("Error:", error);

  // Default error status and message
  let status = 500;
  let message = "Internal Server Error";

  // Handle specific error types
  if (error.name === "ValidationError") {
    status = 400;
    message = error.message;
  } else if (error.name === "UnauthorizedError") {
    status = 401;
    message = "Unauthorized";
  } else if (error.name === "ForbiddenError") {
    status = 403;
    message = "Forbidden";
  } else if (error.name === "NotFoundError") {
    status = 404;
    message = "Not Found";
  }

  return c.json(
    {
      error: {
        message,
        status,
      },
    },
    status as any
  );
};

export const notFoundHandler = (c: Context) => {
  return c.json(
    {
      error: {
        message: "Not Found",
        status: 404,
      },
    },
    404
  );
};
