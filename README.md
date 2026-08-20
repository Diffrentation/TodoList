# Taskspace

A full-stack task, project, and team management app built with Next.js — OTP-verified authentication (with a one-click guest mode), a Kanban board and list view with server-side pagination, subtasks, comments, file attachments, team roles, and saved views.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 🔐 Authentication & Account

- Email/OTP registration (6-digit code, 5-minute expiry) with a resend cooldown
- **Guest mode** — a one-click, no-signup workspace that expires after 24 hours
- Login with JWT access + refresh tokens (HTTP-only cookies, automatic refresh via an axios interceptor)
- Forgot / reset password via OTP
- Profile editing with avatar upload to **Cloudinary**
- Security page: active sessions per device, sign-out-everywhere, recent account activity log, and self-service account deletion (cascades across owned teams/tasks/projects)
- Rate limiting on auth endpoints

### 📋 Tasks

- Kanban **board** and **list** views, switchable per session
- Statuses: To Do / Doing / Completed / On Hold, with drag-and-drop between board columns
- Priorities, start/due dates, labels, descriptions
- **Subtasks** nested under a parent task
- **Comments** (with an optional file/image attachment per comment)
- **File attachments** per task (PDF, image, text, CSV — up to 10MB, served through an authenticated route)
- Assignees, a reporter, and watchers; per-task lock (only the reporter or a team owner/admin can edit a locked task) and a private flag for team tasks
- Archiving instead of hard deletion for tasks and projects
- Per-task activity log and due-date reminders
- **Server-side pagination** — each status column loads 12 tasks at a time; "Show more" fetches the next page directly from the database (desktop shows one combined button across all columns; mobile keeps a per-column button since only one column is visible at a time there)
- Server-side search and priority filtering

### 🗂️ Projects & Teams

- Projects with a lead, members, priority, and due date; project-level activity log
- Teams with role-based access (owner / admin / editor / viewer) and email invitations
- A "Personal" scope (no team) alongside any number of teams, switchable from the sidebar

### 🔖 Saved Views & Notifications

- Save the current filter/field combination as a named view, scoped to Tasks or Projects
- In-app notifications (assignments, due-soon reminders, team activity) with a "mark all read" action

### 🎨 UI/UX

- Dark / light / system theme, with a user-selectable accent color
- Sticky sidebar navigation
- Fully responsive board, list, and task-detail layouts
- Toast notifications, skeleton loading states, keyboard-friendly forms

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS 4**
- **Ant Design** + **Material UI** (select surfaces) and a small **shadcn/ui**-style component set (`src/components/ui`)
- **Framer Motion** — animations
- **React Hook Form** + **Zod** — form handling and validation
- **React Hot Toast** — notifications
- **Lucide React** — icons
- **Axios** — HTTP client with a token-refresh interceptor
- **next-themes** — theme management

### Backend

- **Next.js Route Handlers** (`src/app/api/**`) — 29 endpoints across auth, tasks, projects, teams, saved views, and notifications
- **MongoDB** with **Mongoose**
- **jsonwebtoken** — access/refresh tokens
- **bcryptjs** — password and OTP hashing
- **Nodemailer** — OTP and team-invitation email (falls back to logging the OTP to the server console if SMTP isn't configured)
- **Cloudinary** — profile image storage

## 📦 Installation

### Prerequisites

- Node.js 18+
- A MongoDB database (local or MongoDB Atlas)
- (Optional but recommended) SMTP credentials for real email delivery, and a Cloudinary account for profile images — both degrade gracefully if omitted (OTPs log to the console; profile image upload will fail without Cloudinary)

### Step 1: Clone & Install

```bash
git clone https://github.com/Diffrentation/TodoList.git
cd TodoList
npm install
```

### Step 2: Environment Variables

Create `.env.local` in the project root:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskspace
JWT_SECRET=<32+ random characters>
JWT_REFRESH_SECRET=<32+ random characters>

# Optional — MongoDB
TASKSPACE_DB_NAME=taskspace        # keep this app's data isolated on a shared cluster
MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1  # only if your network blocks Atlas SRV DNS lookups

# Optional — email (OTPs are logged to the server console if omitted)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SENDER_EMAIL=your-email@gmail.com

# Optional — profile image uploads
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Gmail SMTP:** enable 2FA on the account, then generate an [App Password](https://myaccount.google.com/apppasswords) and use it as `SMTP_PASS`.

> `npm run setup-env` exists as a convenience script but expects an `env.template` file that isn't currently checked into the repo — create `.env.local` by hand using the block above instead.

### Step 3: Run

```bash
npm run dev      # development
npm run build && npm start   # production build
```

The app runs at `http://localhost:3000`.

### Step 4 (optional): Seed demo data

Once you've registered a real account through the app, populate it with a realistic demo workspace — a team, six projects, 500 team tasks, 300 personal tasks, thousands of dated subtasks, comments, and activity log entries:

```bash
npm run seed -- your-account@email.com
```

This **wipes and rebuilds** that account's own tasks, projects, and owned teams every time it's run — see [scripts/seed.mjs](scripts/seed.mjs).

## 📁 Project Structure

```
TodoList/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # register, login, guest, logout, refresh-token,
│   │   │   │                      #   profile, account, security, change-password,
│   │   │   │                      #   forgot/reset-password, resend/verify-otp
│   │   │   ├── tasks/             # CRUD, [id]/comments, [id]/attachments,
│   │   │   │                      #   [id]/watch, [id]/activity
│   │   │   ├── projects/          # CRUD, [id]/activity
│   │   │   ├── teams/             # CRUD, [id]/members, [id]/members/[userId]
│   │   │   ├── saved-views/       # CRUD
│   │   │   └── notifications/     # list, mark read
│   │   ├── auth/                  # login, signup, otp, forgot-password, change-password
│   │   ├── dashboard/             # the board/list/task-detail app shell
│   │   ├── profile/               # profile edit + security subpage
│   │   ├── icon.js, apple-icon.js # generated favicon / touch icon
│   │   └── layout.js
│   ├── components/
│   │   ├── WorkspaceApp.jsx       # the dashboard: board, list, task detail, dialogs
│   │   └── ui/                    # shared button/card/input/select/form primitives
│   ├── lib/
│   │   ├── axios.js               # client with refresh-token interceptor
│   │   ├── db.js                  # Mongoose connection
│   │   ├── email.js                # Nodemailer + dev-mode console fallback
│   │   ├── cloudinary.js          # profile image upload/destroy helpers
│   │   ├── task-access.js         # visibility scoping shared by tasks/projects
│   │   ├── team-invitations.js, team-work.js, collaboration.js
│   │   └── middleware/            # auth, rate limiting, error handling
│   ├── models/                    # User, Task, Project, Team, TeamInvitation,
│   │                               #   Notification, ActivityLog, AuditLog, OTP, SavedView
│   └── utils/localStorage.js
├── scripts/
│   ├── setup-env.js                # (see the env.template caveat above)
│   └── seed.mjs                    # demo-data generator
├── private-uploads/                # task attachments (served via an authenticated route)
├── public/uploads/profiles/        # legacy local profile images (new uploads go to Cloudinary)
└── package.json
```

## 🚀 API Overview

All endpoints live under `/api` and are cookie-authenticated (`authenticateToken` middleware) unless noted. This is a summary, not a full request/response reference — see the route handler under `src/app/api/**` for exact payloads.

### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account, send a registration OTP |
| POST | `/api/auth/verify-register-otp` | Verify OTP, activate the account, set session cookies |
| POST | `/api/auth/resend-otp` | Resend a registration or forgot-password OTP |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/guest` | Start a 24-hour guest workspace, no signup |
| POST | `/api/auth/logout` | Clear session cookies |
| POST | `/api/auth/refresh-token` | Exchange the refresh cookie for a new access token |
| GET / PUT | `/api/auth/profile` | Read / update profile (multipart for avatar upload) |
| GET | `/api/auth/security` | Active sessions + recent account activity |
| POST | `/api/auth/security` | Sign out all other sessions |
| DELETE | `/api/auth/account` | Permanently delete the account and everything it owns |
| POST | `/api/auth/change-password` | Change password while logged in |
| POST | `/api/auth/forgot-password` | Send a password-reset OTP |
| POST | `/api/auth/verify-forgot-password-otp` | Verify reset OTP, issue a short-lived reset token |
| POST | `/api/auth/reset-password` | Set a new password using that reset token |

### Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks — filters: `status`, `priority`, `project`, `team`, `search`; pagination: `skip`, `limit` |
| POST | `/api/tasks` | Create a task (or subtask, via `parentTask`) |
| GET / PUT / DELETE | `/api/tasks/:id` | Read / update / delete a task |
| GET | `/api/tasks/:id/activity` | Task activity log |
| POST | `/api/tasks/:id/comments` | Add a comment (optionally with an attachment) |
| POST | `/api/tasks/:id/attachments` | Upload a file attachment |
| GET / DELETE | `/api/tasks/:id/attachments/:attachmentId` | Download / remove an attachment |
| POST | `/api/tasks/:id/watch` | Toggle watching a task |

### Projects, Teams, Saved Views, Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| GET / POST | `/api/projects` | List / create projects |
| GET / PUT / DELETE | `/api/projects/:id` | Read / update / delete a project |
| GET | `/api/projects/:id/activity` | Project activity log |
| GET / POST | `/api/teams` | List / create teams |
| GET / PUT / DELETE | `/api/teams/:id` | Read / rename / delete a team |
| POST | `/api/teams/:id/members` | Invite a member by email |
| DELETE | `/api/teams/:id/members/:userId` | Remove a member |
| GET / POST | `/api/saved-views` | List / create saved views |
| DELETE | `/api/saved-views/:id` | Delete a saved view |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications` | Mark one or all as read |

## 🚀 Deployment

Deploys cleanly to Vercel — push to a connected repo and set the environment variables from the [Environment Variables](#step-2-environment-variables) section above in the Vercel dashboard (Production, Preview, and Development).

**Known limitation:** task attachments and legacy profile images are written to the local filesystem (`private-uploads/`, `public/uploads/profiles/`). That works on a persistent server but **will not survive a serverless deploy** (Vercel's filesystem is ephemeral) — uploaded files can disappear after a redeploy or cold start. Profile images already moved to Cloudinary; task attachments have not been migrated yet.

## 🆘 Troubleshooting

**MongoDB won't connect** — verify `MONGODB_URI`, that the cluster's network access allows your IP (or `0.0.0.0/0` for development), and try setting `MONGODB_DNS_SERVERS` if your network blocks Atlas's SRV DNS lookups.

**OTP emails aren't arriving** — if `SMTP_USER`/`SMTP_PASS` aren't set, OTPs are logged to the server console instead of emailed (this is expected in dev). If SMTP *is* configured and the code still isn't arriving, check spam — it can take a minute to land, and the OTP page shows a resend cooldown rather than letting you spam Resend before that.

**Profile image upload fails** — Cloudinary credentials aren't configured; add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

**Build errors** — delete `.next` and `node_modules`, then `npm install` again; confirm Node.js 18+.

## 📝 Notes for Contributors

- Access tokens expire in 15 minutes, refresh tokens in 7 days, both as HTTP-only cookies (see `src/lib/middleware/auth.js`).
- OTPs expire after 5 minutes.
- Task/project visibility is scoped in `src/lib/task-access.js` — a task is visible if you created it, or it belongs to a team you're in and (it isn't private, or you're the reporter/an assignee/on a shared project).
- There is no automated test suite yet — changes are currently verified manually / via the `run` skill.

## 👤 Author

**Bhupendra Singh** — [@Diffrentation](https://github.com/Diffrentation) · [TodoList repository](https://github.com/Diffrentation/TodoList)

---

Built with Next.js, React, and MongoDB.
