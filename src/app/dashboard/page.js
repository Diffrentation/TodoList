"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import TaskList from "@/components/TaskList";
import SearchFilter from "@/components/SearchFilter";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { clearAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/auth/profile");
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      if (error.response?.status === 401) {
        return;
      }
    }
  };

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const response = await api.get(`/tasks?${params.toString()}`);
      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);

      if (error.response?.status === 401) {
        console.log("Unauthorized - token refresh in progress or failed");
        return;
      }

      toast.error(error.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      clearAuth();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background transition-colors duration-200">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="bg-card border-b shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-opacity-95"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  To-Do List
                </h1>
                {user && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Welcome, <span className="font-medium">{user.name}</span> (
                    {user.email})
                  </p>
                )}
              </motion.div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="transition-all hover:scale-105 active:scale-95"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SearchFilter
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
              />
              <TaskList tasks={tasks} onUpdate={setTasks} />
            </motion.div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
