# Email Setup Guide for OTP

## Problem: Not Receiving OTP Emails

If users are not receiving OTP emails, follow this guide to set up email sending.

## Quick Check

1. **Check Console Logs**

   - When registering, check your terminal/console
   - If you see `[DEV MODE] OTP for email@example.com: 123456`, email is not configured
   - The OTP will be displayed in the console

2. **Check .env.local**
   ```bash
   # Open .env.local and check:
   SMTP_USER=your-email@gmail.com  # Should be your actual email
   SMTP_PASS=your-app-specific-password  # Should be your app password
   ```

## Setup Email (Gmail Example)

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google", enable "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Select "Mail" as the app
3. Select "Other (Custom name)" as device
4. Enter "To-Do List App" as the name
5. Click "Generate"
6. **Copy the 16-character password** (no spaces)

### Step 3: Update .env.local

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

**Important:**

- Use your actual Gmail address (not a placeholder)
- Use the App Password (16 characters, no spaces)
- Do NOT use your regular Gmail password

### Step 4: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test Email

1. Try registering a new user
2. Check console for: "✅ Email sent successfully!"
3. Check your email inbox (and spam folder)

## Other Email Providers

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**Note:** Outlook may require enabling "Less secure app access" or using App Password.

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

**Note:** Yahoo requires generating an App Password:

1. Go to https://login.yahoo.com/account/security
2. Enable "Generate app password"
3. Use the generated password

### Custom SMTP Server

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

## Troubleshooting

### Error: "SMTP authentication failed" (EAUTH)

**Cause:** Wrong email or password

**Solution:**

- ✅ Verify `SMTP_USER` is your actual email address
- ✅ For Gmail, use App Password (not regular password)
- ✅ Check for typos in `.env.local`
- ✅ Make sure there are no extra spaces

### Error: "Could not connect to SMTP server" (ECONNECTION)

**Cause:** Wrong SMTP host or port

**Solution:**

- ✅ Check `SMTP_HOST` is correct:
  - Gmail: `smtp.gmail.com`
  - Outlook: `smtp-mail.outlook.com`
  - Yahoo: `smtp.mail.yahoo.com`
- ✅ Check `SMTP_PORT` is correct (usually 587)
- ✅ Check firewall/antivirus isn't blocking connection

### Error: "535 Authentication failed" (Gmail)

**Cause:** Not using App Password

**Solution:**

- ✅ Generate App Password (see Step 2 above)
- ✅ Use the 16-character App Password (not your regular password)
- ✅ Make sure 2FA is enabled

### Email Sent But Not Received

**Check:**

1. ✅ Spam/Junk folder
2. ✅ Promotions tab (Gmail)
3. ✅ Email filters
4. ✅ Check console for "✅ Email sent successfully!"
5. ✅ Verify email address is correct

### Development Mode (No Email Configured)

If email is not configured, OTPs will be logged to console:

```
📧 [DEV MODE] Email not configured - OTP logged to console:
   Email: user@example.com
   OTP: 123456
   Type: registration
```

**This is normal for development!** To enable email:

1. Follow setup steps above
2. Update `.env.local` with real credentials
3. Restart server

## Testing Email Configuration

### Method 1: Check Console on Registration

When registering, check console output:

- ✅ "✅ Email sent successfully!" = Email working
- ⚠️ "[DEV MODE] OTP logged" = Email not configured
- ❌ "❌ Error sending email" = Configuration issue

### Method 2: Verify SMTP Connection

The app automatically verifies SMTP on startup:

- ✅ "Email server is ready to send messages" = Good
- ❌ "Email transporter error" = Check credentials

### Method 3: Test with Real Email

1. Register with your own email address
2. Check inbox (and spam) for OTP
3. If not received, check console for errors

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use App Passwords** - Don't use your main email password
3. **Rotate Passwords** - Change App Passwords periodically
4. **Production** - Use environment variables from hosting platform
5. **Rate Limiting** - Already implemented to prevent abuse

## Common Mistakes

❌ **Using regular Gmail password instead of App Password**
✅ Use App Password (16 characters)

❌ **Leaving placeholder values in .env.local**
✅ Update with actual credentials

❌ **Wrong SMTP host**
✅ Use correct host for your email provider

❌ **Not restarting server after changing .env.local**
✅ Always restart: `npm run dev`

❌ **Typos in email or password**
✅ Double-check for spaces and typos

## Still Having Issues?

1. **Check console logs** - Look for specific error messages
2. **Verify .env.local** - Make sure values are correct
3. **Test with different email** - Try your own email first
4. **Check email provider settings** - Some providers require special setup
5. **Use development mode** - OTPs will show in console if email fails

## Quick Reference

| Provider | SMTP Host             | Port | Auth Required |
| -------- | --------------------- | ---- | ------------- |
| Gmail    | smtp.gmail.com        | 587  | App Password  |
| Outlook  | smtp-mail.outlook.com | 587  | App Password  |
| Yahoo    | smtp.mail.yahoo.com   | 587  | App Password  |
| Custom   | your-server.com       | 587  | Varies        |

---

**Remember:** In development, if email is not configured, OTPs will be displayed in the console. This is intentional and allows development without email setup.
