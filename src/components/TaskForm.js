"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function TaskForm({ onSubmit, initialData = null, onCancel }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [status, setStatus] = useState(initialData?.status || "pending");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({ title, description, status });
      if (!initialData) {
        setTitle("");
        setDescription("");
        setStatus("pending");
      }
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Label htmlFor="title" className="mb-2">
          Title *
        </Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
          disabled={loading}
          suppressHydrationWarning
          className="transition-all focus:scale-[1.01]"
        />
      </motion.div>

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Label htmlFor="description" className="mb-2">
          Description
        </Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          suppressHydrationWarning
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:scale-[1.01] resize-none"
          placeholder="Enter task description (optional)"
          disabled={loading}
        />
      </motion.div>

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Label htmlFor="status" className="mb-2">
          Status
        </Label>
        <Select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          suppressHydrationWarning
          disabled={loading}
          className="transition-all focus:scale-[1.01]"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </Select>
      </motion.div>

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        <Button
          type="submit"
          disabled={loading || !title.trim()}
          suppressHydrationWarning
          className="flex-1 transition-all hover:scale-105 active:scale-95"
        >
          {loading ? "Saving..." : initialData ? "Update Task" : "Create Task"}
        </Button>
        {initialData && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            suppressHydrationWarning
            className="transition-all hover:scale-105 active:scale-95"
          >
            Cancel
          </Button>
        )}
      </motion.div>
    </motion.form>
  );
}
