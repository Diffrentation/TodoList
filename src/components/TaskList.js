"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskForm from "./TaskForm";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, MoreVertical, Plus, X, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TaskList({ tasks: initialTasks, onUpdate, filterStatus = "" }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setLoading(true);
    try {
      console.log("[TaskList] Deleting task:", taskId);
      const response = await api.delete(`/tasks/${taskId}`);
      if (response.data.success) {
        const updatedTasks = tasks.filter((t) => t._id !== taskId);
        setTasks(updatedTasks);
        onUpdate?.(updatedTasks);
        toast.success("Task deleted");
      } else {
        throw new Error(response.data.message || "Failed to delete task");
      }
    } catch (error) {
      console.error("[TaskList] Delete error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (taskData) => {
    setLoading(true);
    try {
      if (editingTask) {
        console.log("[TaskList] Updating task:", editingTask._id, taskData);
        const response = await api.put(`/tasks/${editingTask._id}`, taskData);
        if (response.data.success) {
          const updatedTasks = tasks.map((t) =>
            t._id === editingTask._id ? response.data.task : t
          );
          setTasks(updatedTasks);
          onUpdate?.(updatedTasks);
          setEditingTask(null);
          setExpandedTask(null);
          toast.success("Task updated");
        } else {
          throw new Error(response.data.message || "Failed to update task");
        }
      } else {
        const response = await api.post("/tasks", taskData);
        if (response.data.success) {
          const updatedTasks = [response.data.task, ...tasks];
          setTasks(updatedTasks);
          onUpdate?.(updatedTasks);
          setShowForm(false);
          toast.success("Task created");
        } else {
          throw new Error(response.data.message || "Failed to create task");
        }
      }
    } catch (error) {
      console.error("[TaskList] Update error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const response = await api.put(`/tasks/${task._id}`, { status: newStatus });
      const updatedTasks = tasks.map((t) =>
        t._id === task._id ? response.data.task : t
      );
      setTasks(updatedTasks);
      onUpdate?.(updatedTasks);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Filter tasks based on filterStatus
  const filteredTasks = filterStatus
    ? filterStatus === "pending"
      ? pendingTasks
      : filterStatus === "completed"
      ? completedTasks
      : tasks
    : tasks;

  // Determine which sections to show
  const showPending = !filterStatus || filterStatus === "pending";
  const showCompleted = !filterStatus || filterStatus === "completed";

  return (
    <div className="space-y-8">
      {/* Quick Add Task - Any.do Style */}
      {!showForm && !editingTask && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-2 border-dashed"
          >
            <Plus className="h-5 w-5 mr-3" />
            <span>Add a task</span>
          </Button>
        </motion.div>
      )}

      {/* Task Form */}
      <AnimatePresence mode="wait">
        {(showForm || editingTask) && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingTask ? "Edit Task" : "New Task"}
                </h3>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <TaskForm
                key={editingTask?._id || 'new'}
                initialData={editingTask}
                onSubmit={async (data) => {
                  await handleUpdate(data);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingTask(null);
                  setExpandedTask(null);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredTasks.length === 0 && !showForm && !editingTask && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Plus className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {filterStatus
              ? `No ${filterStatus} tasks found`
              : "No tasks yet"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {filterStatus
              ? `Try changing the filter or create a new ${filterStatus} task`
              : "Create your first task to get started"}
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="rounded-xl px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </motion.div>
      )}

      {/* Pending Tasks */}
      {showPending && pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Pending ({pendingTasks.length})
          </h2>
          <AnimatePresence>
            {pendingTasks.map((task, index) => (
              <TaskItem
                key={task._id}
                task={task}
                index={index}
                onToggle={toggleStatus}
                onEdit={() => setEditingTask(task)}
                onDelete={handleDelete}
                expanded={expandedTask === task._id}
                onExpand={() =>
                  setExpandedTask(expandedTask === task._id ? null : task._id)
                }
                loading={loading}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Tasks */}
      {showCompleted && completedTasks.length > 0 && (
        <div className={cn("space-y-2", !filterStatus && "pt-6 border-t border-border/50")}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Completed ({completedTasks.length})
          </h2>
          <AnimatePresence>
            {completedTasks.map((task, index) => (
              <TaskItem
                key={task._id}
                task={task}
                index={index}
                onToggle={toggleStatus}
                onEdit={() => setEditingTask(task)}
                onDelete={handleDelete}
                expanded={expandedTask === task._id}
                onExpand={() =>
                  setExpandedTask(expandedTask === task._id ? null : task._id)
                }
                loading={loading}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  index,
  onToggle,
  onEdit,
  onDelete,
  expanded,
  onExpand,
  loading,
}) {

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      layout
      className="group"
    >
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-lg hover:border-primary/30",
          task.status === "completed" && "opacity-70"
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onToggle(task)}
              className="h-8 w-8 rounded-full flex-shrink-0 mt-0.5"
            >
              {task.status === "completed" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </motion.div>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>

            {/* Task Content */}
            <div
              className="flex-1 cursor-pointer min-w-0"
              onClick={(e) => {
                if (!e.target.closest('.menu-container') && !e.target.closest('button')) {
                  onExpand();
                }
              }}
            >
              <h3
                className={cn(
                  "text-lg font-semibold text-foreground mb-2 transition-all",
                  task.status === "completed" &&
                    "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h3>
              {task.description && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: expanded ? "auto" : 0,
                    opacity: expanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-muted-foreground overflow-hidden mb-2"
                >
                  {task.description}
                </motion.p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    task.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                >
                  {task.status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 menu-container">
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onDelete(task._id);
                }}
                className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
