import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import { authenticateToken } from "@/lib/middleware/auth";
import { validateTaskTitle, validateTaskDescription } from "@/lib/validation";
import { errorHandler } from "@/lib/middleware/errorHandler";

// GET all tasks for authenticated user
export async function GET(req) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      console.error("[TASKS GET] Auth error:", error);
      console.error("[TASKS GET] Request headers:", {
        cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
        authorization: req.headers.get("authorization") ? "present" : "missing",
      });
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build query
    const query = { user: user._id };
    if (status && (status === "pending" || status === "progress" || status === "completed")) {
      query.status = status;
    }
    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: "i" };
    }

    // Fetch tasks
    const tasks = await Task.find(query).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        tasks,
        count: tasks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

// CREATE a new task
export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      console.error("[TASKS POST] Auth error:", error);
      console.error("[TASKS POST] Request headers:", {
        cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
        authorization: req.headers.get("authorization") ? "present" : "missing",
      });
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    let { title, description, status } = body;

    // Normalize status to lowercase and handle empty strings
    if (status && typeof status === 'string') {
      status = status.toLowerCase().trim();
      if (status === '') {
        status = undefined;
      }
    } else {
      status = undefined;
    }

    console.log("[TASKS POST] Creating task with status:", status, "Type:", typeof status);

    // Validation
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { success: false, message: titleValidation.message },
        { status: 400 }
      );
    }

    const descValidation = validateTaskDescription(description || "");
    if (!descValidation.valid) {
      return NextResponse.json(
        { success: false, message: descValidation.message },
        { status: 400 }
      );
    }

    if (status && status !== "pending" && status !== "progress" && status !== "completed") {
      console.log("[TASKS POST] Invalid status:", status);
      return NextResponse.json(
        { success: false, message: "Status must be pending, progress, or completed" },
        { status: 400 }
      );
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      status: status || "pending",
      user: user._id,
    });
    
    console.log("[TASKS POST] Task created successfully:", task._id, "Status:", task.status);

    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully",
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
