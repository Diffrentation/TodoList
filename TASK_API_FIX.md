# Task API 401 Error Fix

## Problem

Task APIs were returning 401 Unauthorized errors even when users were logged in.

## Root Causes Identified

1. **Cookie Reading Issues**: Cookies might not be read properly in all contexts
2. **Token Expiration**: Access tokens expire after 15 minutes, requiring refresh
3. **Cookie Header Fallback**: Need to check cookie header directly as fallback

## Fixes Applied

### 1. Enhanced Authentication Middleware (`src/lib/middleware/auth.js`)

**Changes:**

- Added fallback to read cookies directly from `cookie` header
- Improved error logging with `[AUTH]` prefix
- Better handling of cookie reading errors

**Code:**

```javascript
// Also check cookie header directly as fallback
if (!cookieToken) {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});
    cookieToken = cookies["accessToken"];
  }
}
```

### 2. Improved Task API Error Logging (`src/app/api/tasks/route.js`)

**Changes:**

- Added detailed logging for authentication failures
- Log cookie and authorization header status
- Better debugging information

**Code:**

```javascript
console.error("[TASKS GET] Auth error:", error);
console.error("[TASKS GET] Request headers:", {
  cookie: req.headers.get("cookie")?.substring(0, 50) + "...",
  authorization: req.headers.get("authorization") ? "present" : "missing",
});
```

### 3. Updated Refresh Token Response (`src/app/api/auth/refresh-token/route.js`)

**Changes:**

- Include `accessToken` in response body (though httpOnly cookie is primary)
- Helps with debugging

## Testing Steps

1. **Check Server Logs:**

   - Look for `[AUTH]` and `[TASKS]` prefixed logs
   - Check if cookies are being received
   - Verify token verification status

2. **Check Browser:**

   - Open DevTools → Application → Cookies
   - Verify `accessToken` and `refreshToken` cookies exist
   - Check cookie domain and path are correct

3. **Check Network Tab:**
   - Verify cookies are being sent in request headers
   - Check response status codes
   - Look for Set-Cookie headers in responses

## Common Issues and Solutions

### Issue 1: Cookies Not Being Sent

**Symptoms:** `cookieToken` is null in logs

**Solutions:**

- Verify `withCredentials: true` in axios config ✅ (already set)
- Check browser cookie settings
- Try in incognito mode
- Clear cookies and re-login

### Issue 2: Token Expired

**Symptoms:** "Invalid or expired token" error

**Solutions:**

- Token refresh should happen automatically ✅ (axios interceptor handles this)
- If refresh fails, user will be redirected to login
- Check refresh token endpoint is working

### Issue 3: Cookie Domain/Path Issues

**Symptoms:** Cookies exist but not sent with requests

**Solutions:**

- Verify cookies are set for correct domain (localhost:3000)
- Check cookie path is `/` or matches API path
- Ensure `sameSite: "lax"` is set correctly ✅

## Debugging Commands

### Check Cookies in Browser Console

```javascript
// Check if cookies exist
document.cookie;

// Check specific cookie
document.cookie.split(";").find((c) => c.includes("accessToken"));
```

### Test API Directly

```bash
# Get cookies from browser DevTools → Application → Cookies
# Then test with curl:
curl -X GET http://localhost:3000/api/tasks \
  -H "Cookie: accessToken=YOUR_TOKEN_HERE" \
  -v
```

## Expected Behavior

1. **After Login:**

   - `accessToken` cookie set (15 min expiry)
   - `refreshToken` cookie set (7 days expiry)
   - User redirected to dashboard

2. **Task API Calls:**

   - Cookies automatically sent with requests
   - If token expired, refresh happens automatically
   - New access token set as cookie
   - Original request retried

3. **If Refresh Fails:**
   - User redirected to login
   - Old cookies cleared

## Next Steps if Still Not Working

1. **Check server logs** for `[AUTH]` and `[TASKS]` messages
2. **Verify cookies exist** in browser DevTools
3. **Test refresh token endpoint** directly
4. **Check MongoDB connection** - user lookup might be failing
5. **Verify user is verified** - `isVerified` must be `true`

## Files Modified

- ✅ `src/lib/middleware/auth.js` - Enhanced cookie reading
- ✅ `src/app/api/tasks/route.js` - Better error logging
- ✅ `src/app/api/auth/refresh-token/route.js` - Include token in response
