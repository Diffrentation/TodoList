// Simple validation functions (without zod as requested)

export function validateEmail(email) {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
}

export function validateName(name) {
  if (!name || name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 50) {
    return { valid: false, message: 'Name cannot exceed 50 characters' };
  }
  return { valid: true };
}

export function validateOTP(otp) {
  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return { valid: false, message: 'OTP must be 6 digits' };
  }
  return { valid: true };
}

export function validateTaskTitle(title) {
  if (!title || title.trim().length === 0) {
    return { valid: false, message: 'Title is required' };
  }
  if (title.trim().length > 200) {
    return { valid: false, message: 'Title cannot exceed 200 characters' };
  }
  return { valid: true };
}

export function validateTaskDescription(description) {
  if (description && description.length > 1000) {
    return { valid: false, message: 'Description cannot exceed 1000 characters' };
  }
  return { valid: true };
}

