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
        message: "Some information is invalid. Please check it and try again.",
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
        message: field === "email" ? "An account already uses this email address." : "This value is already in use.",
      },
      { status: 400 }
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return NextResponse.json(
      {
        success: false,
        message: "Your session is no longer valid. Please sign in again.",
      },
      { status: 401 }
    );
  }

  if (err.name === "TokenExpiredError") {
    return NextResponse.json(
      {
        success: false,
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 }
    );
  }

  // Default error
  return NextResponse.json(
    {
      success: false,
      message: "We couldn’t complete that request. Please try again.",
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
