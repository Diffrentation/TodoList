// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map();

export function rateLimiter(maxRequests = 5, windowMs = 15 * 60 * 1000) {
  return (req) => {
    // Get IP from headers (Next.js Request object)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const identifier = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Get URL from request
    const url = req.url || "";
    const key = `${identifier}-${url}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    const record = rateLimitStore.get(key);

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return { allowed: true };
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      return {
        allowed: false,
        message: `Too many requests. Please try again after ${Math.ceil(
          (record.resetTime - now) / 1000
        )} seconds`,
      };
    }

    record.count++;
    return { allowed: true };
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute
