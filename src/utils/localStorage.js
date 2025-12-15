// LocalStorage utilities for user and OTP management

export function saveUserToLocalStorage(userData, isVerified) {
  if (typeof window === 'undefined') return;
  
  if (!isVerified) {
    console.warn('User is not verified, not saving to localStorage');
    return;
  }

  try {
    const userToSave = {
      ...userData,
      savedAt: Date.now(),
    };
    localStorage.setItem('user', JSON.stringify(userToSave));
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
  }
}

export function getUserFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user;
  } catch (error) {
    console.error('Error reading user from localStorage:', error);
    return null;
  }
}

export function removeUserFromLocalStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
}

export function saveOTPToLocalStorage(otpData) {
  if (typeof window === 'undefined') return;
  
  try {
    const otpToSave = {
      ...otpData,
      savedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    localStorage.setItem('otp', JSON.stringify(otpToSave));
  } catch (error) {
    console.error('Error saving OTP to localStorage:', error);
  }
}

export function getOTPFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    const otpStr = localStorage.getItem('otp');
    if (!otpStr) return null;
    
    const otp = JSON.parse(otpStr);
    
    // Check if expired
    if (otp.expiresAt && Date.now() > otp.expiresAt) {
      localStorage.removeItem('otp');
      return null;
    }
    
    return otp;
  } catch (error) {
    console.error('Error reading OTP from localStorage:', error);
    return null;
  }
}

export function deleteOTPFromLocalStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('otp');
}

export function cleanupExpiredData() {
  if (typeof window === 'undefined') return;
  
  try {
    const otpStr = localStorage.getItem('otp');
    if (otpStr) {
      const otp = JSON.parse(otpStr);
      if (otp.expiresAt && Date.now() > otp.expiresAt) {
        localStorage.removeItem('otp');
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
  }
}

