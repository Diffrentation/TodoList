"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Input as AntInput, Select as AntSelect, Space } from "antd";

export default function SearchFilter({
  search,
  onSearchChange,
  status,
  onStatusChange,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col sm:flex-row gap-3"
    >
      <div className="flex-1 search-input-wrapper">
        <AntInput
          size="large"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={<Search className="h-5 w-5 text-muted-foreground" />}
          className="rounded-xl"
          style={{
            height: "48px",
            fontSize: "16px",
            borderRadius: "12px",
          }}
        />
      </div>
      <div className="sm:w-48 filter-select-wrapper">
        <AntSelect
          value={status}
          onChange={onStatusChange}
          size="large"
          placeholder="Filter by status"
          prefix={<Filter className="h-5 w-5" />}
          style={{ 
            width: "100%", 
            height: "48px",
            fontSize: "16px",
            borderRadius: "12px" 
          }}
          options={[
            { value: "", label: "All Tasks" },
            { value: "pending", label: "Pending" },
            { value: "progress", label: "Progress" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>
    </motion.div>
  );
}
