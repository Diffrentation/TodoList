# To-Do List Web Application with OTP Authentication

A production-ready, full-stack To-Do List application built with Next.js, featuring advanced OTP-based authentication, JWT tokens, and comprehensive task management.

## 🚀 Features

### Authentication System

- **User Registration** with email verification via OTP
- **OTP Verification** (6-digit code, 5-minute expiry)
- **Login** with regular authentication or optional OTP-based two-factor authentication
- **JWT Tokens** (Access token: 15 min, Refresh token: 7 days)
- **Automatic Token Refresh** via HTTP-only cookies
- **Secure Logout** with token invalidation
- **Password Hashing** using bcrypt
- **Rate Limiting** for OTP requests and login attempts

### Task Management

- **CRUD Operations** (Create, Read, Update, Delete tasks)
- **Task Status** (Pending/Completed)
- **Search Functionality** (Search tasks by title)
- **Filter Tasks** (Filter by status: All/Pending/Completed)
- **User-Specific Tasks** (Each task is linked to the user)
- **Responsive UI** with loading and empty states

### Security Features

- HTTP-only cookies for token storage
- OTP hashing before database storage
- Maximum OTP attempt limits (5 attempts)
- Account lockout after failed attempts
- Input validation on both frontend and backend
- Protected routes with authentication middleware
- Role-based access control (user/admin)

## 📋 Tech Stack

### Frontend

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Client-side form validation** (without Zod as requested)

### Backend

- **Next.js API Routes** (Serverless functions)
- **MongoDB** with Mongoose ODM
- **JWT** (jsonwebtoken) for authentication
- **bcryptjs** for password hashing
- **Nodemailer** for sending OTP emails
- **Rate Limiting** middleware

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)
- Email account for sending OTPs (Gmail recommended)

### Step 1: Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### Step 2: Environment Variables

**Option A: Automatic Setup (Recommended)**

```bash
npm run setup-env
```

This creates `.env.local` with auto-generated JWT secrets.

**Option B: Manual Setup**

```bash
cp env.template .env.local
```

Then edit `.env.local` and update the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/todolist
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todolist

# JWT Secrets (Generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-min-32-characters

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Environment
NODE_ENV=development
```

**Note for Gmail:**

- Enable 2-factor authentication
- Generate an "App Password" from Google Account settings
- Use the app password in `SMTP_PASS`

### Step 3: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### 1. Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email with OTP.",
  "userId": "user_id_here"
}
```

#### 2. Verify OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### 3. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### 4. Login with OTP (Two-Factor)

```http
# Step 1: Request OTP
POST /api/auth/login-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "step": "request"
}

# Step 2: Verify OTP
POST /api/auth/login-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "step": "verify",
  "otp": "123456"
}
```

#### 5. Refresh Token

```http
POST /api/auth/refresh-token
```

#### 6. Logout

```http
POST /api/auth/logout
```

#### 7. Get Profile

```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

#### 8. Update Profile

```http
PUT /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Updated"
}
```

### Task Endpoints

#### 1. Get All Tasks

```http
GET /api/tasks?status=pending&search=meeting
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `status` (optional): `pending` | `completed`
- `search` (optional): Search term for task title

#### 2. Create Task

```http
POST /api/tasks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Complete project",
  "description": "Finish the todo list app",
  "status": "pending"
}
```

#### 3. Get Single Task

```http
GET /api/tasks/:id
Authorization: Bearer <access_token>
```

#### 4. Update Task

```http
PUT /api/tasks/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed"
}
```

#### 5. Delete Task

```http
DELETE /api/tasks/:id
Authorization: Bearer <access_token>
```

## 🗂️ Project Structure

```
todolist/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.js
│   │   │   │   ├── verify-otp/route.js
│   │   │   │   ├── login/route.js
│   │   │   │   ├── login-otp/route.js
│   │   │   │   ├── refresh-token/route.js
│   │   │   │   ├── logout/route.js
│   │   │   │   └── profile/route.js
│   │   │   └── tasks/
│   │   │       ├── route.js
│   │   │       └── [id]/route.js
│   │   ├── dashboard/page.js
│   │   ├── login/page.js
│   │   ├── login-otp/page.js
│   │   ├── register/page.js
│   │   ├── verify-otp/page.js
│   │   ├── layout.js
│   │   └── page.js
│   ├── components/
│   │   ├── ProtectedRoute.js
│   │   ├── SearchFilter.js
│   │   ├── TaskForm.js
│   │   └── TaskList.js
│   ├── lib/
│   │   ├── axios.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── email.js
│   │   ├── validation.js
│   │   └── middleware/
│   │       ├── auth.js
│   │       ├── errorHandler.js
│   │       └── rateLimiter.js
│   └── models/
│       ├── User.js
│       ├── Task.js
│       └── OTP.js
├── .env.example
├── package.json
└── README.md
```

## 🔒 Security Best Practices

### Implemented

- ✅ Password hashing with bcrypt
- ✅ OTP hashing before storage
- ✅ HTTP-only cookies for tokens
- ✅ JWT token expiration
- ✅ Rate limiting
- ✅ Input validation
- ✅ Protected routes
- ✅ CORS configuration

### Production Recommendations

1. **Refresh Tokens**

   - ✅ Already implemented with 7-day expiry
   - Consider token rotation on refresh

2. **Role-Based Access**

   - ✅ Basic role system implemented
   - Extend for admin-only endpoints

3. **Pagination**

   - Add pagination to task list endpoint:

   ```javascript
   GET /api/tasks?page=1&limit=10
   ```

4. **API Rate Limiting**

   - ✅ Basic rate limiting implemented
   - For production, use Redis-based rate limiting:

   ```bash
   npm install ioredis express-rate-limit
   ```

5. **Token Blacklisting**

   - Implement Redis-based token blacklist for logout
   - Store invalidated tokens until expiry

6. **Audit Logs**

   - Log authentication events
   - Track failed login attempts
   - Monitor OTP generation/verification

7. **Email Queue**

   - Use BullMQ for email queue management:

   ```bash
   npm install bullmq
   ```

8. **Redis for OTP Storage**

   - Replace MongoDB OTP storage with Redis:

   ```bash
   npm install ioredis
   ```

9. **Environment Variables**

   - Use secrets management (AWS Secrets Manager, Vercel Secrets)
   - Never commit `.env.local`

10. **HTTPS**
    - Always use HTTPS in production
    - Set `secure: true` for cookies in production

## 🚀 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI` environment variable

### Environment Variables for Production

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todolist
JWT_SECRET=<generate-strong-random-string>
JWT_REFRESH_SECRET=<generate-strong-random-string>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NODE_ENV=production
```

## 🧪 Testing

### Manual Testing Flow

1. **Registration**

   - Register a new user
   - Check email for OTP
   - Verify OTP

2. **Login**

   - Login with credentials
   - Test OTP-based login (optional)

3. **Tasks**

   - Create a task
   - Update task status
   - Search tasks
   - Filter by status
   - Delete task

4. **Security**
   - Test protected routes without auth
   - Test token expiration
   - Test rate limiting

## 📝 Notes

### Development Mode

- OTPs are logged to console if email is not configured
- Check server logs for OTP codes during development

### OTP Expiry

- OTPs expire after 5 minutes
- Maximum 5 verification attempts per OTP
- Old OTPs are automatically deleted

### Token Refresh

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Automatic refresh handled by axios interceptor

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🚀 Deployment (Vercel)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js settings

### Step 3: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**Required Variables:**

```env
JWT_SECRET=generate-a-secure-32-character-secret-here
JWT_REFRESH_SECRET=generate-another-secure-32-character-secret-here
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=production
```

**Note:** Generate secure secrets using the command below. Never use the example values above.

**Email Configuration (for OTP):**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

**Important:**

- Generate new JWT secrets for production (use the command below)
- Never commit `.env.local` to git
- Use MongoDB Atlas for production database
- Set all variables for **Production**, **Preview**, and **Development** environments

### Generate Secure JWT Secrets

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

### Step 4: Redeploy

After adding environment variables, trigger a new deployment:

- Go to Deployments → Click "..." → Redeploy
- Or push a new commit to trigger automatic deployment

## 🆘 Troubleshooting

### MongoDB Connection Issues

- Verify `MONGODB_URI` is correct
- Check MongoDB is running (if local)
- Verify network access (if Atlas)

### Email Not Sending

- Verify SMTP credentials
- Check Gmail app password is correct
- Check spam folder
- In development, check console for OTP

### Authentication Issues

- Verify JWT secrets are set
- Check token expiration
- Clear cookies and try again

### Build Errors

- Run `npm install` again
- Clear `.next` folder
- Check Node.js version (18+)

---

Built with ❤️ using Next.js and MongoDB
#   T o d o L i s t 
 
 
