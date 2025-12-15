import { NextResponse } from "next/server";

// Centralized error handler for Next.js
export function errorHandler(err) {
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    console.error("Mongoose Validation Error:", err.errors);
    return NextResponse.json(
      {
        success: false,
        message: "Validation error",
        errors,
        details: err.errors,
      },
      { status: 400 }
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return NextResponse.json(
      {
        success: false,
        message: `${field} already exists`,
      },
      { status: 400 }
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid token",
      },
      { status: 401 }
    );
  }

  if (err.name === "TokenExpiredError") {
    return NextResponse.json(
      {
        success: false,
        message: "Token expired",
      },
      { status: 401 }
    );
  }

  // Default error
  return NextResponse.json(
    {
      success: false,
      message: err.message || "Internal server error",
    },
    { status: err.statusCode || 500 }
  );
}

// Async handler wrapper for Next.js API routes
export function asyncHandler(fn) {
  return async (req, ...args) => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      return errorHandler(error);
    }
  };
}
