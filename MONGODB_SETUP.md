# MongoDB Setup Guide

## Error: `ECONNREFUSED ::1:27017` or `ECONNREFUSED 127.0.0.1:27017`

This error means MongoDB is not running on your local machine. You have two options:

## Option 1: Use MongoDB Atlas (Cloud) - Recommended for Beginners

MongoDB Atlas is a free cloud database service. No local installation needed!

### Steps:

1. **Create a MongoDB Atlas Account**

   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for a free account

2. **Create a Cluster**

   - Click "Build a Database"
   - Choose "FREE" (M0) tier
   - Select a cloud provider and region (closest to you)
   - Click "Create"

3. **Create Database User**

   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Whitelist Your IP** ⚠️ **IMPORTANT - This is required!**

   - Go to "Network Access" → "Add IP Address"
   - **Option A (Recommended for Development):**
     - Click "Add Current IP Address"
     - This automatically adds your current IP
   - **Option B (Quick Development - Less Secure):**
     - Enter `0.0.0.0/0` to allow access from anywhere
     - ⚠️ **Warning:** Only use this for development/testing, never for production!
   - Click "Confirm"
   - **Wait 1-2 minutes** for changes to take effect

   **Common Error:** If you see "Could not connect to any servers" or "IP whitelist" error,
   your IP is not whitelisted. Follow the steps above.

5. **Get Connection String**

   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/...`)
   - Replace `<password>` with your database user password
   - Replace `<database>` with `todolist` (or your preferred database name)

6. **Update .env.local**

   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/todolist?retryWrites=true&w=majority
   ```

7. **Restart your development server**
   ```bash
   npm run dev
   ```

## Option 2: Install MongoDB Locally

### Windows:

1. **Download MongoDB Community Server**

   - Go to https://www.mongodb.com/try/download/community
   - Select Windows → MSI package
   - Download and run the installer

2. **Install MongoDB**

   - Run the installer
   - Choose "Complete" installation
   - Install MongoDB as a Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)

3. **Verify Installation**

   - MongoDB should start automatically as a Windows service
   - Check Windows Services (services.msc) for "MongoDB"

4. **Test Connection**

   ```bash
   # Open PowerShell or Command Prompt
   mongod --version
   ```

5. **Start MongoDB (if not running)**

   ```bash
   # If MongoDB service is not running, start it:
   net start MongoDB
   ```

6. **Update .env.local** (should already be correct)
   ```env
   MONGODB_URI=mongodb://localhost:27017/todolist
   ```

### macOS:

1. **Install using Homebrew**

   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB**

   ```bash
   brew services start mongodb-community
   ```

3. **Verify it's running**
   ```bash
   brew services list
   ```

### Linux (Ubuntu/Debian):

1. **Install MongoDB**

   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb
   ```

2. **Start MongoDB**

   ```bash
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   ```

3. **Verify it's running**
   ```bash
   sudo systemctl status mongodb
   ```

## Verify Connection

After setting up MongoDB (either Atlas or local), test the connection:

1. **Check if MongoDB is running** (for local installation):

   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   brew services list  # macOS
   sudo systemctl status mongodb  # Linux
   ```

2. **Test connection in your app**:
   - Start your Next.js app: `npm run dev`
   - Try to register a new user
   - Check the console for connection messages

## Troubleshooting

### Local MongoDB Issues:

- **Port 27017 already in use**: Another MongoDB instance might be running
- **Permission denied**: Run MongoDB with appropriate permissions
- **Service won't start**: Check MongoDB logs (usually in `/var/log/mongodb/` on Linux)

### MongoDB Atlas Issues:

- **"Could not connect to any servers" / "IP whitelist" error**:

  - Your IP address is not whitelisted
  - Go to Atlas Dashboard → Network Access → Add IP Address
  - Click "Add Current IP Address" or use `0.0.0.0/0` for development
  - Wait 1-2 minutes for changes to propagate
  - See detailed steps in section "4. Whitelist Your IP" above

- **Authentication failed**:

  - Double-check username and password in connection string
  - Make sure you replaced `<password>` with your actual password
  - Verify database user exists in Database Access section

- **Connection timeout**:
  - Check your internet connection
  - Verify firewall settings
  - Make sure IP is whitelisted (see above)

## Quick Test

You can test MongoDB connection using MongoDB Compass (GUI) or MongoDB Shell:

```bash
# MongoDB Shell (mongosh)
mongosh "mongodb://localhost:27017/todolist"

# Or for Atlas
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/todolist"
```

## Recommended: Use MongoDB Atlas

For development and learning, **MongoDB Atlas is recommended** because:

- ✅ No installation needed
- ✅ Free tier available
- ✅ Works from anywhere
- ✅ Easy to share with team
- ✅ Automatic backups
- ✅ Easy to scale later

## Next Steps

After MongoDB is set up:

1. Update `.env.local` with correct `MONGODB_URI`
2. Restart your development server: `npm run dev`
3. Try registering a new user
4. Check console for "✅ MongoDB connected successfully"
