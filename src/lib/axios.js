import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies
});

// Track if refresh is in progress to prevent multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          "/api/auth/refresh-token",
          {},
          { withCredentials: true }
        );

        // If refresh successful, retry original request
        if (refreshResponse.data.success) {
          // The new access token is set as a cookie by the server
          // No need to manually set it in headers since it's httpOnly
          processQueue(null, null);
          isRefreshing = false;
          // Retry the original request - cookies will be sent automatically
          return api(originalRequest);
        } else {
          throw new Error("Token refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Only redirect if we're not already on login/register page
        // and if it's not a protected route check
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const isAuthPage =
            currentPath === "/login" ||
            currentPath === "/register" ||
            currentPath === "/verify-otp" ||
            currentPath === "/login-otp";
          const isProtectedRouteCheck =
            originalRequest.url?.includes("/auth/profile");

          // Don't redirect if already on auth page or if it's a protected route check
          // ProtectedRoute will handle the redirect
          if (!isAuthPage && !isProtectedRouteCheck) {
            // Clear any stored user data
            if (localStorage.getItem("user")) {
              localStorage.removeItem("user");
            }
            // Only redirect if not already redirecting
            if (currentPath !== "/login") {
              window.location.href = "/login";
            }
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
