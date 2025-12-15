import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import { authenticateToken } from "@/lib/middleware/auth";
import { validateTaskTitle, validateTaskDescription } from "@/lib/validation";
import { errorHandler } from "@/lib/middleware/errorHandler";

// GET single task
export async function GET(req, { params }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      console.error("[TASKS GET id] Auth error:", error);
      console.error("[TASKS GET id] Request headers:", {
        cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
        authorization: req.headers.get("authorization") ? "present" : "missing",
      });
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    const task = await Task.findOne({ _id: id, user: user._id });
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        task,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

// UPDATE task
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      console.error("[TASKS PUT] Auth error:", error);
      console.error("[TASKS PUT] Request headers:", {
        cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
        authorization: req.headers.get("authorization") ? "present" : "missing",
      });
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, status } = body;

    // Find task
    const task = await Task.findOne({ _id: id, user: user._id });
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }

    // Validation and update
    if (title !== undefined) {
      const titleValidation = validateTaskTitle(title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { success: false, message: titleValidation.message },
          { status: 400 }
        );
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      const descValidation = validateTaskDescription(description);
      if (!descValidation.valid) {
        return NextResponse.json(
          { success: false, message: descValidation.message },
          { status: 400 }
        );
      }
      task.description = description.trim();
    }

    if (status !== undefined) {
      if (status !== "pending" && status !== "completed") {
        return NextResponse.json(
          { success: false, message: "Status must be pending or completed" },
          { status: 400 }
        );
      }
      task.status = status;
    }

    await task.save();

    return NextResponse.json(
      {
        success: true,
        message: "Task updated successfully",
        task,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

// DELETE task
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      console.error("[TASKS DELETE] Auth error:", error);
      console.error("[TASKS DELETE] Request headers:", {
        cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
        authorization: req.headers.get("authorization") ? "present" : "missing",
      });
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    const task = await Task.findOneAndDelete({ _id: id, user: user._id });
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Task deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
