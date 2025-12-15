"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { validateEmail } from "@/lib/validation";
import { storeUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogIn, Mail, Lock, CheckSquare } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [useOTP, setUseOTP] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRegularLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      setErrors({ email: "Invalid email format" });
      return;
    }

    if (!formData.password) {
      setErrors({ password: "Password is required" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", formData);
      if (response.data.success) {
        storeUser(response.data.user);
        toast.success("Login successful!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      setErrors({ email: "Invalid email format" });
      return;
    }

    if (!formData.password) {
      setErrors({ password: "Password is required" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login-otp", {
        ...formData,
        step: "request",
      });
      if (response.data.success) {
        if (response.data.otp) {
          toast.success(
            `OTP: ${response.data.otp} (Email not configured - check console)`,
            {
              duration: 10000,
            }
          );
          console.log(
            `\n📧 Login OTP for ${formData.email}: ${response.data.otp}`
          );
        } else {
          toast.success("OTP sent to your email!");
        }
        router.push(
          `/login-otp?email=${encodeURIComponent(
            formData.email
          )}&password=${encodeURIComponent(formData.password)}`
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="mt-8 space-y-6"
              onSubmit={useOTP ? handleOTPLogin : handleRegularLogin}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    suppressHydrationWarning
                    placeholder="you@example.com"
                    className="transition-all focus:scale-[1.01]"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive animate-fade-in">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    suppressHydrationWarning
                    placeholder="Enter your password"
                    className="transition-all focus:scale-[1.01]"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive animate-fade-in">
                      {errors.password}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center space-x-2"
              >
                <input
                  id="use-otp"
                  name="use-otp"
                  type="checkbox"
                  checked={useOTP}
                  onChange={(e) => setUseOTP(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="use-otp"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4" />
                  Use OTP for two-factor authentication
                </Label>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full transition-all hover:scale-105 active:scale-95"
                  suppressHydrationWarning
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-sm text-muted-foreground"
              >
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:underline transition-all"
                >
                  Create one now
                </Link>
              </motion.p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
