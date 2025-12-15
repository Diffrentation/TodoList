"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

export default function SearchFilter({
  search,
  onSearchChange,
  status,
  onStatusChange,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row gap-3"
    >
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          suppressHydrationWarning
          className="pl-12 h-12 text-base border-0 bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary rounded-xl transition-all"
        />
      </div>
      <div className="sm:w-40">
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            suppressHydrationWarning
            className="pl-12 h-12 text-base border-0 bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary rounded-xl transition-all appearance-none cursor-pointer"
          >
            <option value="">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}
