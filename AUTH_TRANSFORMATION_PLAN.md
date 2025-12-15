# Auth System Transformation Plan

## Overview
Transforming the authentication system to match the new structure with:
- Profile photo upload
- Firstname/Lastname instead of name
- Phone number
- Address (city, state, country, pincode)
- Proper OTP flow
- Forgot password flow
- Change password flow

## Tasks Completed
- ✅ Updated User model with new fields
- ✅ Created localStorage utilities

## Tasks Remaining

### 1. Create Missing UI Components
- [ ] Create `src/components/ui/form.jsx` (shadcn form component)
- [ ] Create `src/components/ui/input-otp.jsx` (shadcn OTP input component)

### 2. Create API Routes
- [ ] `src/app/api/auth/register/route.js` - Handle signup with FormData (profile image)
- [ ] `src/app/api/auth/login/route.js` - Handle login
- [ ] `src/app/api/auth/verify-register-otp/route.js` - Verify registration OTP
- [ ] `src/app/api/auth/verify-forgot-password-otp/route.js` - Verify forgot password OTP
- [ ] `src/app/api/auth/forgot-password/route.js` - Send OTP for password reset
- [ ] `src/app/api/auth/reset-password/route.js` - Reset password after OTP verification
- [ ] `src/app/api/auth/resend-otp/route.js` - Resend OTP
- [ ] `src/app/api/auth/profile/route.js` - Get/Update profile with photo

### 3. Move Pages to Proper Locations
- [ ] Move `src/app/api/auth/signup/page.jsx` → `src/app/auth/signup/page.jsx`
- [ ] Move `src/app/api/auth/login/page.jsx` → `src/app/auth/login/page.jsx`
- [ ] Move `src/app/api/auth/otp/page.jsx` → `src/app/auth/otp/page.jsx`
- [ ] Move `src/app/api/auth/forgot-password/page.jsx` → `src/app/auth/forgot-password/page.jsx`
- [ ] Move `src/app/api/auth/change-password/page.jsx` → `src/app/auth/change-password/page.jsx`

### 4. Update Existing Pages
- [ ] Update routes in all pages to match new structure
- [ ] Update dashboard to show profile photo
- [ ] Add profile photo upload in profile settings

### 5. Update Dashboard
- [ ] Display user profile photo
- [ ] Show firstname/lastname
- [ ] Display phone and address
- [ ] Add profile edit functionality with photo upload

## Implementation Order
1. Create missing UI components
2. Create API routes
3. Move pages to proper locations
4. Update all references
5. Test the flow

