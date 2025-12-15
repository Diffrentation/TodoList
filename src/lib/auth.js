// Client-side auth utilities

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  // Tokens are in HTTP-only cookies, so we can't access them directly
  // The server will handle authentication via cookies
  return null;
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    // Clear any client-side storage if needed
    localStorage.removeItem('user');
  }
}

export function storeUser(user) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

