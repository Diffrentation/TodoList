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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
                className="flex items-center gap-4"
              >
                <Badge dot color="hsl(var(--color-primary))" offset={[-2, 2]}>
                  <Avatar
                    size={48}
                    src={user?.profileImage}
                    icon={!user?.profileImage && <User className="h-6 w-6" />}
                    className="border-2 border-primary shadow-lg shadow-primary/20 cursor-pointer transition-all duration-200 ease-out hover:border-blue-500 hover:shadow-blue-500/30 hover:scale-105"
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
                  className="h-10 w-10 rounded-xl hover:bg-yellow-500 hover:text-white transition-colors duration-200 ease-out"
                  title="Edit Profile"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleLogout}
                  className="h-10 w-10 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors duration-200 ease-out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content - Any.do Style */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Statistics Cards */}
              {!status && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
                >
                  <AntCard
                    className="border-border bg-gradient-to-br from-blue-50 via-blue-50/50 to-blue-100/30 dark:from-blue-950/50 dark:via-blue-950/30 dark:to-blue-900/20 hover:shadow-lg hover:border-blue-500 transition-all duration-200 ease-out cursor-pointer backdrop-blur-sm"
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
                    className="border-border bg-gradient-to-br from-yellow-50 via-yellow-50/50 to-yellow-100/30 dark:from-yellow-950/50 dark:via-yellow-950/30 dark:to-yellow-900/20 hover:shadow-lg hover:border-yellow-500 transition-all duration-200 ease-out cursor-pointer backdrop-blur-sm"
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
                    className="border-border bg-gradient-to-br from-blue-50 via-blue-50/50 to-blue-100/30 dark:from-blue-950/50 dark:via-blue-950/30 dark:to-blue-900/20 hover:shadow-lg hover:border-blue-500 transition-all duration-200 ease-out cursor-pointer backdrop-blur-sm"
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
                    className="border-border bg-gradient-to-br from-green-50 via-green-50/50 to-green-100/30 dark:from-green-950/50 dark:via-green-950/30 dark:to-green-900/20 hover:shadow-lg hover:border-green-500 transition-all duration-200 ease-out cursor-pointer backdrop-blur-sm"
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
                  transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
                >
                  <Card
                    sx={{
                      background: "linear-gradient(to bottom right, hsl(var(--color-card)), hsl(var(--color-card) / 0.95), hsl(var(--color-muted) / 0.2))",
                      backdropFilter: "blur(4px)",
                      border: "1px solid hsl(var(--color-border))",
                      borderRadius: 2,
                      p: 3,
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Circular Progress */}
                      <div className="relative flex-shrink-0">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="hsl(var(--color-muted))"
                            strokeWidth="8"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - completionRate / 100) }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="50%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* Center percentage */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                              className="text-2xl font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent"
                            >
                              {completionRate}%
                            </motion.div>
                            <div className="text-xs text-muted-foreground mt-0.5">Complete</div>
                          </div>
                        </div>
                      </div>

                      {/* Breakdown Stats */}
                      <div className="flex-1 w-full sm:w-auto">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                          Task Breakdown
                        </h3>
                        <div className="space-y-3">
                          {/* Completed */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm text-foreground">Completed</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                                />
                              </div>
                              <span className="text-sm font-semibold text-foreground w-8 text-right">
                                {stats.completed}
                              </span>
                            </div>
                          </div>

                          {/* In Progress */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-foreground">In Progress</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stats.total > 0 ? (stats.progress / stats.total) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                                />
                              </div>
                              <span className="text-sm font-semibold text-foreground w-8 text-right">
                                {stats.progress}
                              </span>
                            </div>
                          </div>

                          {/* Pending */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-foreground">Pending</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"
                                />
                              </div>
                              <span className="text-sm font-semibold text-foreground w-8 text-right">
                                {stats.pending}
                              </span>
                            </div>
                          </div>

                          {/* Total */}
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">Total Tasks</span>
                              <span className="text-sm font-bold text-foreground">{stats.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>
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
