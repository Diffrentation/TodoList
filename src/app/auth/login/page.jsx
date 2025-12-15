"use client";
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { saveUserToLocalStorage } from "@/utils/localStorage";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";

function Login() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });

      if (res.data.success) {
        toast.success(res.data.message || "Logged in successfully");
        
        // ✅ Save user data to localStorage after successful login
        // Login only works for verified users, so isVerified should be true
        if (res.data.user) {
          const userData = {
            id: res.data.user.id,
            firstname: res.data.user.firstname,
            lastname: res.data.user.lastname,
            email: res.data.user.email,
            phone: res.data.user.phone,
            role: res.data.user.role,
            profileImage: res.data.user.profileImage,
            address: res.data.user.address,
            isVerified: res.data.user.isVerified,
            token: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          };
          
          // Use utility function - only saves if verified
          saveUserToLocalStorage(userData, res.data.user.isVerified);
          
          // Dispatch event to update navbar
          window.dispatchEvent(new Event('userUpdated'));
        }

        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => router.push("/auth/signup");
  const handleforgotPass = () => router.push("/auth/forgot-password");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
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
            Welcome Back
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Log in to manage your tasks and account settings.
          </p>
        </motion.div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LabelInputContainer>
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </LabelInputContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LabelInputContainer className="relative">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPass ? <FaRegEye className="h-5 w-5" /> : <FaRegEyeSlash className="h-5 w-5" />}
              </button>
            </LabelInputContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end"
          >
            <button
              type="button"
              onClick={handleforgotPass}
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Forgot Password?
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              className={cn(
                "group/btn relative w-full h-11 rounded-xl font-semibold text-primary-foreground",
                "bg-primary hover:bg-primary/90 transition-all duration-300",
                "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center"
              )}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Log in →"
              )}
              <BottomGradient />
            </button>
          </motion.div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-center text-muted-foreground"
          >
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={handleSignup}
              className="font-semibold text-primary hover:text-primary/80 underline transition-colors"
            >
              Sign up
            </button>
          </motion.p>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({ children, className }) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>{children}
  </div>
);

