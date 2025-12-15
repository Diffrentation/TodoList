"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { Suspense, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
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

  const onSubmit = async (data) => {
    if (!userId) {
      return toast.error("User not found. Please signup again.");
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

      console.log("[OTP PAGE] Submitting OTP:", {
        userId,
        otp: otpValue,
        otpLength: otpValue.length,
        type,
      });

      const res = await axios.post(endpoint, {
        userId,
        otp: otpValue,
      });

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
            role: res.data.user.role || "buyer",
            profileImage: res.data.user.profileImage,
            address: res.data.user.address,
            isVerified: res.data.user.isVerified, // Should be true after verification
            token: res.data.accessToken, // Save access token if available
            refreshToken: res.data.refreshToken, // Save refresh token if available
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
          router.push(`/auth/change-password?type=forgot&userId=${userId}`);
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Toaster position="top-right" />
      <div className="border p-10 rounded-2xl w-[450px] shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Enter OTP</h2>

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

            <Button type="submit" className="w-full text-lg py-6 rounded-xl">
              Verify OTP
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={async () => {
                  if (!userId) {
                    toast.error("User not found");
                    return;
                  }
                  try {
                    const resendType =
                      type === "forgot" ? "forgot" : "registration";
                    const res = await axios.post("/api/auth/resend-otp", {
                      userId,
                      type: resendType,
                    });
                    if (res.data.success) {
                      toast.success(
                        res.data.message || "OTP resent successfully!"
                      );
                      if (res.data.devMode && res.data.otp) {
                        toast.success(`OTP: ${res.data.otp}`, {
                          duration: 10000,
                        });
                      }
                    }
                  } catch (error) {
                    toast.error(
                      error?.response?.data?.message || "Failed to resend OTP"
                    );
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Resend OTP
              </button>
            </div>
          </form>
        </Form>
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
