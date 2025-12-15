"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as AntInput, Select as AntSelect, Space } from "antd";

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
        <AntInput
          size="large"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          disabled={loading}
          className="rounded-xl"
          style={{
            height: "48px",
            fontSize: "16px",
            borderRadius: "12px",
          }}
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
          <AntInput.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add description (optional)"
            disabled={loading}
            className="rounded-xl"
            style={{
              borderRadius: "12px",
            }}
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <AntSelect
          value={status}
          onChange={setStatus}
          disabled={loading}
          size="large"
          style={{ width: 140, borderRadius: "12px" }}
          options={[
            { value: "pending", label: "Pending" },
            { value: "progress", label: "Progress" },
            { value: "completed", label: "Completed" },
          ]}
        />

        <Space>
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
            size="default"
          >
            {loading ? "Saving..." : initialData ? "Save Changes" : "Add Task"}
          </Button>
        </Space>
      </div>
    </motion.form>
  );
}
