"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import {
  saveUserToLocalStorage,
  saveOTPToLocalStorage,
  deleteOTPFromLocalStorage,
  cleanupExpiredData,
} from "@/utils/localStorage";

const FormSchema = z.object({
  pin: z.string().length(6, "OTP must be 6 digits"),
});

function OTPPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Get userId and type directly from URL
  const userId = searchParams?.get("userId");
  const type = searchParams?.get("type"); // "register" | "forgot"
  const email = searchParams?.get("email");

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { pin: "" },
  });

  // Cleanup expired data on mount
  useEffect(() => {
    cleanupExpiredData();
  }, []);

  // Save OTP data when component mounts (for tracking expiration)
  useEffect(() => {
    if (userId && type === "register") {
      saveOTPToLocalStorage({
        userId,
        type,
      });
    }
  }, [userId, type]);

  // A short cooldown on "Resend" — an email that was just sent on this same
  // page load can take a moment to arrive, so give it time before offering
  // another send instead of inviting an immediate re-click.
  const [resendCooldown, setResendCooldown] = useState(30);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (data) => {
    if (type === "forgot" && !email) {
      return toast.error("Start again from the password reset page.");
    }
    if (type !== "forgot" && !userId) {
      return toast.error("Your verification link is incomplete. Please sign up again.");
    }

    // Ensure OTP is a string and trim whitespace
    const otpValue = String(data.pin).trim();

    if (otpValue.length !== 6) {
      return toast.error("OTP must be 6 digits");
    }

    try {
      const endpoint =
        type === "forgot"
          ? "/api/auth/verify-forgot-password-otp"
          : "/api/auth/verify-register-otp";

      const res = await axios.post(
        endpoint,
        type === "forgot" ? { email, otp: otpValue } : { userId, otp: otpValue }
      );

      if (res.data.success) {
        toast.success(res.data.message || "OTP verified successfully!");

        // ✅ Save user data to localStorage ONLY AFTER successful OTP verification
        if (type === "register" && res.data.user) {
          const userData = {
            id: res.data.user.id || userId,
            firstname: res.data.user.firstname,
            lastname: res.data.user.lastname,
            email: res.data.user.email,
            phone: res.data.user.phone,
            role: res.data.user.role || "user",
            profileImage: res.data.user.profileImage,
            address: res.data.user.address,
            isVerified: res.data.user.isVerified, // Should be true after verification
          };

          // Only save if user is verified (which should be true at this point)
          if (userData.isVerified) {
            saveUserToLocalStorage(userData, true);
            // Delete OTP after successful verification
            deleteOTPFromLocalStorage();
            // Dispatch event to update navbar
            window.dispatchEvent(new Event("userUpdated"));
            toast.success("Account verified! Welcome.");
          } else {
            toast.error("Verification failed. Please try again.");
          }
        }

        // Redirect based on flow
        if (type === "register") {
          // Redirect to dashboard
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else {
          // Delete OTP after successful forgot password verification
          deleteOTPFromLocalStorage();
          router.push(`/auth/change-password?resetToken=${encodeURIComponent(res.data.resetToken)}`);
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        <div className="border border-border bg-gradient-to-br from-card via-card/95 to-muted/20 p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl shadow-primary/10 backdrop-blur-sm">
        <h2 className="text-2xl font-bold mb-2 text-center">Enter OTP</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {email ? (
            <>We sent a 6-digit code to <strong>{email}</strong>.</>
          ) : (
            <>We sent a 6-digit code to your email.</>
          )}{" "}
          It can take a minute to arrive — check your spam folder if you don&apos;t see it.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-lg">OTP Code</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field} className="scale-110">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-md" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full text-lg py-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 ease-out"
            >
              Verify OTP
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={async () => {
                  if (type === "forgot" && !email) {
                    toast.error("Start again from the password reset page.");
                    return;
                  }
                  if (type !== "forgot" && !userId) {
                    toast.error("Your verification link is incomplete.");
                    return;
                  }
                  try {
                    const resendType =
                      type === "forgot" ? "forgot" : "registration";
                    const res = await axios.post(
                      "/api/auth/resend-otp",
                      type === "forgot" ? { email, type: resendType } : { userId, type: resendType }
                    );
                    if (res.data.success) {
                      toast.success(
                        res.data.message || "OTP resent successfully!"
                      );
                      setResendCooldown(30);
                    }
                  } catch (error) {
                    toast.error(
                      error?.response?.data?.message || "Failed to resend OTP"
                    );
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-all duration-200 ease-out cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:disabled:text-slate-500"
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        </Form>
        </div>
      </div>
    </div>
  );
}

function OTPFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg font-semibold text-gray-600">Preparing OTP form…</p>
    </div>
  );
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";

export default function OTPPage() {
  return (
    <Suspense fallback={<OTPFallback />}>
      <OTPPageContent />
    </Suspense>
  );
}
