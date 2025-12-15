"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setStatus(initialData.status || "pending");
    }
  }, [initialData]);

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
      } else {
        // Reset form after successful edit
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
      <div>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
          disabled={loading}
          suppressHydrationWarning
          className="h-12 text-base border-0 bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary rounded-xl transition-all"
          autoFocus
        />
      </div>

      {title && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            suppressHydrationWarning
            className="w-full rounded-xl border-0 bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary px-4 py-3 text-sm placeholder:text-muted-foreground transition-all resize-none"
            placeholder="Add description (optional)"
            disabled={loading}
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          suppressHydrationWarning
          disabled={loading}
          className="w-32 h-9 text-sm border-0 bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary rounded-lg"
        >
          <option value="pending">Pending</option>
          <option value="progress">Progress</option>
          <option value="completed">Completed</option>
        </Select>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              suppressHydrationWarning
              className="rounded-xl"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !title.trim()}
            suppressHydrationWarning
            className="rounded-xl px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {loading
              ? "Saving..."
              : initialData
                ? "Save Changes"
                : "Add Task"}
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
