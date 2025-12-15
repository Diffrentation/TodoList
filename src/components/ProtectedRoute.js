"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const redirectToLogin = useCallback(() => {
    // Only redirect if not already on login/register page
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login" &&
      window.location.pathname !== "/register"
    ) {
      router.push("/login");
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile");
      if (response.data.success) {
        setAuthenticated(true);
      } else {
        // Response was not successful
        redirectToLogin();
      }
    } catch (error) {
      // Check if it's a 401 error (unauthorized)
      if (error.response?.status === 401) {
        // Token might be expired, wait for refresh token attempt
        // The axios interceptor will handle refresh
        try {
          // Wait a bit for refresh to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Retry the request after potential refresh
          const retryResponse = await api.get("/auth/profile");
          if (retryResponse.data.success) {
            setAuthenticated(true);
            return;
          }
        } catch (retryError) {
          // Refresh failed or retry failed, redirect to login
          redirectToLogin();
        }
      } else {
        // Other errors (network, server, etc.)
        console.error("Auth check error:", error);
        redirectToLogin();
      }
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
