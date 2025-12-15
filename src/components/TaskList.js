"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskForm from "./TaskForm";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TaskList({ tasks: initialTasks, onUpdate }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setLoading(true);
    try {
      await api.delete(`/tasks/${taskId}`);
      const updatedTasks = tasks.filter((t) => t._id !== taskId);
      setTasks(updatedTasks);
      onUpdate?.(updatedTasks);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (taskData) => {
    setLoading(true);
    try {
      if (editingTask) {
        const response = await api.put(`/tasks/${editingTask._id}`, taskData);
        const updatedTasks = tasks.map((t) =>
          t._id === editingTask._id ? response.data.task : t
        );
        setTasks(updatedTasks);
        onUpdate?.(updatedTasks);
        setEditingTask(null);
        toast.success("Task updated successfully");
      } else {
        const response = await api.post("/tasks", taskData);
        setTasks([response.data.task, ...tasks]);
        onUpdate?.([response.data.task, ...tasks]);
        toast.success("Task created successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const response = await api.put(`/tasks/${task._id}`, {
        status: newStatus,
      });
      const updatedTasks = tasks.map((t) =>
        t._id === task._id ? response.data.task : t
      );
      setTasks(updatedTasks);
      onUpdate?.(updatedTasks);
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  if (tasks.length === 0 && !editingTask) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mb-6"
        >
          <Plus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4 text-lg">
            No tasks yet. Create your first task!
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TaskForm onSubmit={handleUpdate} />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!editingTask && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm onSubmit={handleUpdate} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {editingTask && (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Edit Task</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm
                  initialData={editingTask}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingTask(null)}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence>
          {tasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              layout
            >
              <Card
                className={cn(
                  "transition-all duration-200 hover:shadow-lg",
                  task.status === "completed" &&
                    "bg-muted/50 border-muted-foreground/20"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 flex items-start gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleStatus(task)}
                        className="mt-1"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </motion.button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3
                            className={cn(
                              "text-lg font-semibold transition-all",
                              task.status === "completed" &&
                                "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </h3>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn(
                              "px-2 py-1 text-xs rounded-full font-medium",
                              task.status === "completed"
                                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                            )}
                          >
                            {task.status}
                          </motion.span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created:{" "}
                          {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingTask(task)}
                        disabled={loading}
                        className="h-9 w-9"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(task._id)}
                        disabled={loading}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
