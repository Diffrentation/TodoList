"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function OtpSendTo() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Email validation
  const validateEmail = (value) => {
    const emailRegex =
      /^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { data, status } = await api.post("/auth/forgot-password", {
        email,
      });

      const userId = data?.userId;
      const isSuccess = status === 200 && Boolean(userId);

      if (!isSuccess) {
        toast.error(data?.message || "Unable to process request");
        return;
      }

      toast.success(data?.message || "OTP sent successfully!");

      // Navigate to OTP page with id & type
      router.push(`/auth/otp?type=forgot&userId=${userId}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      <Toaster position="top-right" />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border bg-card shadow-xl shadow-primary/5",
          "p-6 sm:p-8 md:p-10"
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Forgot Password
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your registered email to receive a one-time password (OTP) to reset your password.
          </p>
        </motion.div>

        <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={cn(
                "bg-background border-input text-foreground placeholder:text-muted-foreground",
                "transition-all duration-300",
                validateEmail(email)
                  ? "focus:border-primary focus:ring-primary/20"
                  : "border-destructive focus:border-destructive focus:ring-destructive/20"
              )}
            />
            {email && !validateEmail(email) && (
              <p className="text-sm text-destructive mt-1">
                Please enter a valid email address
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              type="submit"
              disabled={loading || !validateEmail(email)}
              className={cn(
                "group/btn relative w-full h-11 rounded-xl font-semibold text-primary-foreground",
                "bg-primary hover:bg-primary/90 transition-all duration-300",
                "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send OTP →"
              )}
              <BottomGradient />
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

