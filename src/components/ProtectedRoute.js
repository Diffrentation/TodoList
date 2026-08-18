"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const redirectToLogin = useCallback(() => {
    // Only redirect if not already on login/signup page
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/auth/login" &&
      window.location.pathname !== "/auth/signup"
    ) {
      router.push("/auth/login");
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

  // Access tokens live 15 minutes. While the user is actually on the site,
  // renew the session proactively instead of waiting for a request to fail
  // and rely on the axios interceptor's reactive retry-after-401 path.
  useEffect(() => {
    if (!authenticated) return;
    const REFRESH_INTERVAL_MS = 12 * 60 * 1000;
    let cancelled = false;
    const refresh = async () => {
      try {
        await api.post("/auth/refresh-token");
      } catch {
        // A truly expired/revoked session is still handled by the axios
        // interceptor and this component's own 401 redirect on next request.
      }
    };
    const timer = window.setInterval(() => { if (!cancelled) refresh(); }, REFRESH_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authenticated]);

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
