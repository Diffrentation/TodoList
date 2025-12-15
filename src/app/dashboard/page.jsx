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
import { LogOut, Loader2, User, Settings } from "lucide-react";

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
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      clearAuth();
      router.push("/auth/login");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background transition-colors duration-300">
        {/* Clean Minimalist Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
        >
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4"
              >
                {user?.profileImage ? (
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-primary/20">
                    <img
                      src={user.profileImage}
                      alt={`${user.firstname} ${user.lastname}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                    My Tasks
                  </h1>
                  {user && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {user.firstname} {user.lastname}
                    </p>
                  )}
                </div>
              </motion.div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/profile")}
                  className="h-10 w-10 rounded-xl"
                  title="Edit Profile"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleLogout}
                  className="h-10 w-10 rounded-xl"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content - Any.do Style */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">Loading tasks...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <SearchFilter
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
              />
              <TaskList
                tasks={tasks}
                filterStatus={status}
                onUpdate={(updatedTasks) => {
                  setTasks(updatedTasks);
                }}
              />
            </motion.div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
