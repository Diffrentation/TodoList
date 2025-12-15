# API Troubleshooting Guide

## Common API Issues and Solutions

### Issue 1: APIs Return 401 Unauthorized

**Symptoms:**

- All API calls return 401
- User gets redirected to login
- Tasks fail to load

**Possible Causes:**

1. **Cookies not being sent**

   - Check browser DevTools → Network → Request Headers
   - Look for `Cookie` header
   - Ensure `withCredentials: true` in axios config

2. **Token expired**

   - Access tokens expire in 15 minutes
   - Refresh token should auto-refresh
   - Check console for refresh errors

3. **Cookies blocked**
   - Browser might be blocking cookies
   - Check browser settings
   - Try in incognito/private mode

**Solutions:**

```javascript
// Check axios config
// src/lib/axios.js should have:
withCredentials: true;

// Check cookies in browser:
// DevTools → Application → Cookies → localhost:3000
// Should see: accessToken, refreshToken
```

### Issue 2: APIs Return 500 Internal Server Error

**Symptoms:**

- Server errors in console
- APIs fail with 500 status

**Possible Causes:**

1. **MongoDB not connected**

   - Check `.env.local` has correct `MONGODB_URI`
   - Check MongoDB is running (if local)
   - Check MongoDB Atlas IP whitelist

2. **Environment variables missing**

   - Check `.env.local` exists
   - Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
   - Restart server after changing `.env.local`

3. **Database connection error**
   - Check console for MongoDB connection errors
   - Verify connection string format

**Solutions:**

```bash
# Check environment variables
cat .env.local

# Restart server
npm run dev

# Check MongoDB connection
# Should see: "✅ MongoDB connected successfully"
```

### Issue 3: APIs Return 404 Not Found

**Symptoms:**

- API routes not found
- 404 errors in network tab

**Possible Causes:**

1. **Wrong API path**

   - Check API route file exists
   - Verify path matches route structure

2. **Route handler not exported**
   - Ensure `export async function GET/POST/etc.` exists
   - Check file is named `route.js` (not `routes.js`)

**Solutions:**

```javascript
// Correct structure:
// src/app/api/tasks/route.js
export async function GET(req) { ... }
export async function POST(req) { ... }

// Dynamic routes:
// src/app/api/tasks/[id]/route.js
export async function GET(req, { params }) {
  const { id } = params; // Not awaited in Next.js 16.0.10
  ...
}
```

### Issue 4: CORS Errors

**Symptoms:**

- CORS errors in browser console
- Requests blocked

**Solutions:**

- Next.js API routes don't need CORS for same-origin requests
- If accessing from different origin, add CORS headers:

```javascript
const response = NextResponse.json(data);
response.headers.set("Access-Control-Allow-Origin", "*");
return response;
```

### Issue 5: Params Not Working in Dynamic Routes

**Symptoms:**

- `[id]` routes not working
- Params undefined

**Solutions:**

```javascript
// Next.js 16.0.10 - params are synchronous
export async function GET(req, { params }) {
  const { id } = params; // Direct access, no await
}

// Next.js 15+ (if params were async):
// const { id } = await params;
```

### Issue 6: Cookies Not Being Set

**Symptoms:**

- Login works but cookies not saved
- Subsequent requests fail

**Solutions:**

1. **Check cookie settings:**

```javascript
response.cookies.set("accessToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60,
});
```

2. **Check browser settings:**
   - Allow cookies for localhost
   - Check if browser blocks third-party cookies
   - Try different browser

### Issue 7: Rate Limiting Issues

**Symptoms:**

- Too many requests errors
- APIs blocked after few attempts

**Solutions:**

- Rate limiter is in-memory (resets on server restart)
- For production, use Redis-based rate limiting
- Check rate limit settings in route files

## Debugging Steps

### Step 1: Check Server Logs

```bash
# Run dev server and watch console
npm run dev

# Look for:
# - "✅ MongoDB connected successfully"
# - "Email server is ready to send messages"
# - API request logs
# - Error messages
```

### Step 2: Check Browser Network Tab

1. Open DevTools → Network
2. Make API request
3. Check:
   - Request URL (correct?)
   - Request Method (GET/POST/etc.)
   - Request Headers (cookies present?)
   - Response Status (200/401/500?)
   - Response Body (error message?)

### Step 3: Check Browser Console

1. Open DevTools → Console
2. Look for:
   - JavaScript errors
   - API call errors
   - Authentication errors

### Step 4: Test API Directly

```bash
# Using curl (replace with your values)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Check response
cat cookies.txt
```

### Step 5: Verify Environment

```bash
# Check .env.local exists
ls -la .env.local

# Check MongoDB connection
# Should see connection success message

# Check JWT secrets are set
grep JWT_SECRET .env.local
```

## Common Fixes

### Fix 1: Restart Development Server

```bash
# Stop server (Ctrl+C)
# Clear .next cache
rm -rf .next
# Restart
npm run dev
```

### Fix 2: Clear Browser Data

1. Clear cookies for localhost
2. Clear localStorage
3. Hard refresh (Ctrl+Shift+R)

### Fix 3: Check MongoDB Connection

```bash
# Test MongoDB connection string
# Update .env.local with correct MONGODB_URI
# Restart server
```

### Fix 4: Verify API Route Structure

```
src/app/api/
├── auth/
│   ├── login/
│   │   └── route.js  ✅ Correct
│   └── register/
│       └── route.js  ✅ Correct
└── tasks/
    ├── route.js      ✅ Correct
    └── [id]/
        └── route.js   ✅ Correct
```

## Testing APIs

### Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt -v
```

### Test Tasks (with auth)

```bash
# First login to get cookies, then:
curl -X GET http://localhost:3000/api/tasks \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

## Still Having Issues?

1. **Check specific error message** in browser console or server logs
2. **Verify MongoDB is connected** - should see success message
3. **Check environment variables** - all required vars should be set
4. **Test with Postman/Insomnia** - isolate frontend vs backend issues
5. **Check Next.js version** - ensure compatibility
6. **Review server logs** - look for specific error messages

## Quick Checklist

- [ ] MongoDB connected (check console)
- [ ] Environment variables set (.env.local)
- [ ] Server restarted after env changes
- [ ] Cookies enabled in browser
- [ ] API routes exist in correct location
- [ ] Route handlers exported correctly
- [ ] No syntax errors in route files
- [ ] Network requests show correct URLs
- [ ] Response status codes are correct
- [ ] Error messages are clear
