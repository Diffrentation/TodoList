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
import { LogOut, User, Settings, Circle, Clock } from "lucide-react";
import { Avatar, Badge, Statistic, Card as AntCard, Skeleton } from "antd";
import { Card } from "@mui/material";
import { CheckCircle, PlayCircle } from "@mui/icons-material";

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

  // Calculate statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    progress: tasks.filter((t) => t.status === "progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

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
                <Badge dot color="hsl(var(--color-primary))" offset={[-2, 2]}>
                  <Avatar
                    size={48}
                    src={user?.profileImage}
                    icon={!user?.profileImage && <User className="h-6 w-6" />}
                    className="border-2 border-primary shadow-lg shadow-primary/20"
                    style={{
                      backgroundColor: "hsl(var(--color-primary))",
                    }}
                  >
                    {!user?.profileImage &&
                      user &&
                      `${user.firstname?.[0]}${user.lastname?.[0]}`}
                  </Avatar>
                </Badge>
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
              className="space-y-6"
            >
              <Skeleton active paragraph={{ rows: 2 }} />
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Statistics Cards */}
              {!status && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  <AntCard
                    className="border-border bg-card hover:shadow-lg transition-shadow"
                    bordered
                  >
                    <Statistic
                      title="Total Tasks"
                      value={stats.total}
                      valueStyle={{ color: "hsl(var(--color-primary))" }}
                      prefix={<Circle className="h-4 w-4" />}
                    />
                  </AntCard>
                  <AntCard
                    className="border-border bg-card hover:shadow-lg transition-shadow"
                    bordered
                  >
                    <Statistic
                      title="Pending"
                      value={stats.pending}
                      valueStyle={{ color: "#f59e0b" }}
                      prefix={<Clock className="h-4 w-4" />}
                    />
                  </AntCard>
                  <AntCard
                    className="border-border bg-card hover:shadow-lg transition-shadow"
                    bordered
                  >
                    <Statistic
                      title="In Progress"
                      value={stats.progress}
                      valueStyle={{ color: "#3b82f6" }}
                      prefix={<PlayCircle className="h-4 w-4" />}
                    />
                  </AntCard>
                  <AntCard
                    className="border-border bg-card hover:shadow-lg transition-shadow"
                    bordered
                  >
                    <Statistic
                      title="Completed"
                      value={stats.completed}
                      valueStyle={{ color: "#10b981" }}
                      prefix={<CheckCircle className="h-4 w-4" />}
                    />
                  </AntCard>
                </motion.div>
              )}

              {/* Completion Progress */}
              {!status && stats.total > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--color-card))",
                      border: "1px solid hsl(var(--color-border))",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Completion Rate
                      </span>
                      <Badge
                        count={`${completionRate}%`}
                        style={{
                          backgroundColor: "hsl(var(--color-primary))",
                        }}
                      />
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </Card>
                </motion.div>
              )}

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
