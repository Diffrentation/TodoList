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
    <div
      className="
        shadow-input mx-auto mt-20 sm:mt-24 md:mt-26
        w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] xl:w-[55vw] 2xl:w-[50vw]
        max-w-5xl rounded-lg sm:rounded-xl md:rounded-2xl bg-white p-4 sm:p-6 md:p-8 lg:p-10 dark:bg-black
      "
    >
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-200">
        Welcome Back
      </h2>

      <p className="mt-2 sm:mt-3 max-w-sm text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-300">
        Log in to manage your tasks and account settings.
      </p>

      <form className="mt-8" onSubmit={handleSubmit}>
        <LabelInputContainer>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </LabelInputContainer>

        <LabelInputContainer className="mt-4 relative">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute top-1/2 right-4 cursor-pointer"
          >
            {showPass ? <FaRegEye /> : <FaRegEyeSlash />}
          </button>
        </LabelInputContainer>

        <p
          className="text-right text-sm text-blue-600 cursor-pointer mt-2"
          onClick={handleforgotPass}
        >
          Forgot Password?
        </p>

        <button
          className="group/btn mt-6 relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-700 font-medium text-white"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log in →"}
          <BottomGradient />
        </button>

        <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mt-6">
          Don&apos;t have an account?{" "}
          <span className="underline cursor-pointer text-blue-600" onClick={handleSignup}>
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({ children, className }) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>{children}
  </div>
);

