# 📝 Todo List Application

A modern, production-ready full-stack Todo List application built with Next.js, featuring OTP-based authentication, premium UI components, and comprehensive task management.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 🔐 Authentication System

- **User Registration** with email verification via OTP
- **OTP Verification** (6-digit code, 5-minute expiry)
- **Secure Login** with JWT tokens
- **Password Reset** via email OTP
- **Profile Management** with image upload
- **Automatic Token Refresh** via HTTP-only cookies
- **Rate Limiting** for security

### 📋 Task Management

- **Full CRUD Operations** (Create, Read, Update, Delete)
- **Task Status Tracking** (Pending, In Progress, Completed)
- **Real-time Search** functionality
- **Status Filtering** (All, Pending, Progress, Completed)
- **Task Descriptions** with expandable details
- **User-Specific Tasks** (isolated per user)
- **Statistics Dashboard** with completion rates

### 🎨 Premium UI/UX

- **Modern Design** with Ant Design and Material UI components
- **Dark/Light Mode** support
- **Smooth Animations** with Framer Motion
- **Responsive Design** for all devices
- **Interactive Components** with hover effects
- **Loading States** and skeleton screens
- **Toast Notifications** for user feedback
- **Glassmorphism Effects** and gradients

### 🔒 Security Features

- HTTP-only cookies for token storage
- OTP hashing before database storage
- Password hashing with bcrypt
- JWT token expiration (15min access, 7day refresh)
- Rate limiting on sensitive endpoints
- Input validation on frontend and backend
- Protected routes with authentication middleware
- CORS configuration

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** (App Router) - React framework
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first CSS
- **Ant Design** - Enterprise UI components
- **Material UI** - React component library
- **Framer Motion** - Animation library
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icon library
- **Axios** - HTTP client
- **Next Themes** - Theme management

### Backend

- **Next.js API Routes** - Serverless functions
- **MongoDB** with Mongoose ODM
- **JWT** (jsonwebtoken) - Authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service
- **Rate Limiting** - Security middleware

### Development Tools

- **ESLint** - Code linting
- **TypeScript** - Type checking
- **PostCSS** - CSS processing

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)
- Email account for sending OTPs (Gmail recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/Diffrentation/TodoList.git
cd todolist
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Setup

**Option A: Automatic Setup (Recommended)**

```bash
npm run setup-env
```

This creates `.env.local` with auto-generated JWT secrets.

**Option B: Manual Setup**

```bash
cp env.template .env.local
```

Edit `.env.local` with your configuration:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/todolist
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todolist

# JWT Secrets (Generate strong random strings - minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-min-32-characters

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Environment
NODE_ENV=development
```

**Generate Secure JWT Secrets:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

**Gmail Setup:**

1. Enable 2-factor authentication
2. Generate an "App Password" from [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASS`

### Step 4: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
todolist/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/              # Authentication endpoints
│   │   │   │   ├── register/
│   │   │   │   ├── login/
│   │   │   │   ├── logout/
│   │   │   │   ├── profile/
│   │   │   │   ├── refresh-token/
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── reset-password/
│   │   │   │   ├── change-password/
│   │   │   │   ├── verify-register-otp/
│   │   │   │   └── verify-forgot-password-otp/
│   │   │   └── tasks/             # Task endpoints
│   │   │       ├── route.js       # GET, POST /api/tasks
│   │   │       └── [id]/route.js  # GET, PUT, DELETE /api/tasks/:id
│   │   ├── auth/                  # Auth pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── otp/
│   │   │   ├── forgot-password/
│   │   │   └── change-password/
│   │   ├── dashboard/             # Main dashboard
│   │   ├── profile/               # User profile
│   │   ├── layout.js              # Root layout
│   │   ├── page.jsx               # Home page
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   └── ...
│   │   ├── TaskList.js            # Task list component
│   │   ├── TaskForm.js            # Task form component
│   │   ├── SearchFilter.js        # Search and filter
│   │   ├── ProtectedRoute.js      # Route protection
│   │   ├── theme-toggle.jsx       # Dark mode toggle
│   │   └── providers.jsx          # Ant Design & MUI providers
│   ├── lib/
│   │   ├── axios.js               # Axios configuration
│   │   ├── auth.js                # Auth utilities
│   │   ├── db.js                  # MongoDB connection
│   │   ├── email.js               # Email service
│   │   ├── validation.js          # Input validation
│   │   └── middleware/
│   │       ├── auth.js            # Auth middleware
│   │       ├── errorHandler.js    # Error handling
│   │       └── rateLimiter.js     # Rate limiting
│   ├── models/
│   │   ├── User.js                # User model
│   │   ├── Task.js                # Task model
│   │   └── OTP.js                 # OTP model
│   └── utils/
│       └── localStorage.js        # Local storage utilities
├── public/                        # Static assets
├── scripts/
│   └── setup-env.js              # Environment setup script
├── .gitignore
├── env.template                  # Environment variables template
├── package.json
├── tailwind.config.js
└── README.md
```

## 🚀 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Verify Registration OTP

```http
POST /api/auth/verify-register-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Refresh Token

```http
POST /api/auth/refresh-token
```

#### Logout

```http
POST /api/auth/logout
```

#### Get Profile

```http
GET /api/auth/profile
```

#### Update Profile

```http
PUT /api/auth/profile
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Updated",
  "profileImage": "base64_image_data"
}
```

#### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

### Task Endpoints

#### Get All Tasks

```http
GET /api/tasks?status=pending&search=meeting
```

**Query Parameters:**

- `status` (optional): `pending` | `progress` | `completed`
- `search` (optional): Search term for task title

#### Create Task

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Complete project",
  "description": "Finish the todo list app",
  "status": "pending"
}
```

#### Get Single Task

```http
GET /api/tasks/:id
```

#### Update Task

```http
PUT /api/tasks/:id
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed"
}
```

#### Delete Task

```http
DELETE /api/tasks/:id
```

## 🎨 UI Components

### Premium Libraries Used

- **Ant Design** - Statistics cards, badges, avatars, tooltips, tags
- **Material UI** - Cards, icon buttons, chips
- **shadcn/ui** - Base components (buttons, inputs, cards)
- **Framer Motion** - Smooth animations and transitions
- **Lucide React** - Beautiful icons

### Features

- Dark/Light theme support
- Responsive design
- Smooth animations
- Interactive hover effects
- Loading skeletons
- Toast notifications
- Glassmorphism effects

## 🚀 Deployment (Vercel)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings

### Step 3: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**Required Variables:**

```env
JWT_SECRET=<generate-secure-secret>
JWT_REFRESH_SECRET=<generate-secure-secret>
MONGODB_URI=<your-mongodb-connection-string>
NODE_ENV=production
```

**Email Configuration (Optional but Recommended):**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

**Generate Secure Secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important:**

- Set variables for **Production**, **Preview**, and **Development** environments
- Never commit `.env.local` to git
- Use MongoDB Atlas for production database

### Step 4: Deploy

Vercel will automatically deploy on every push to main branch. Or manually trigger:

- Go to Deployments → Click "..." → Redeploy

## 🧪 Testing

### Manual Testing Checklist

1. **Authentication**

   - [ ] Register new user
   - [ ] Verify OTP via email
   - [ ] Login with credentials
   - [ ] Test password reset flow
   - [ ] Test token refresh
   - [ ] Test logout

2. **Tasks**

   - [ ] Create new task
   - [ ] Update task status
   - [ ] Edit task details
   - [ ] Delete task
   - [ ] Search tasks
   - [ ] Filter by status

3. **UI/UX**

   - [ ] Test dark/light mode
   - [ ] Test responsive design
   - [ ] Test animations
   - [ ] Test loading states

4. **Security**
   - [ ] Test protected routes
   - [ ] Test token expiration
   - [ ] Test rate limiting
   - [ ] Test input validation

## 🆘 Troubleshooting

### MongoDB Connection Issues

- Verify `MONGODB_URI` is correct
- Check MongoDB is running (if local)
- Verify network access (if Atlas)
- Check IP whitelist in MongoDB Atlas

### Email Not Sending

- Verify SMTP credentials
- Check Gmail app password is correct
- Check spam folder
- In development, check console for OTP
- Verify SMTP_HOST and SMTP_PORT

### Authentication Issues

- Verify JWT secrets are set
- Check token expiration
- Clear cookies and try again
- Check browser console for errors

### Build Errors

- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Check Node.js version (18+)
- Verify all environment variables are set

### Vercel Deployment Issues

- Ensure all environment variables are added
- Check build logs in Vercel dashboard
- Verify MongoDB Atlas allows Vercel IPs
- Check that JWT secrets are properly generated

## 📝 Development Notes

### Development Mode

- OTPs are logged to console if email is not configured
- Check server logs for OTP codes during development
- Hot reload enabled for faster development

### OTP Expiry

- OTPs expire after 5 minutes
- Maximum 5 verification attempts per OTP
- Old OTPs are automatically deleted

### Token Management

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Automatic refresh handled by axios interceptor
- Tokens stored in HTTP-only cookies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Bhupendra Singh**

- GitHub: [@Diffrentation](https://github.com/Diffrentation)
- Project: [TodoList](https://github.com/Diffrentation/TodoList)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Ant Design and Material UI for premium components
- MongoDB for the database solution
- All open-source contributors

---

**Built with ❤️ using Next.js, React, MongoDB, and modern web technologies**
