// src/lib/authUtils.ts

export const checkIsAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // בודק אם המשתמש קיבל את התווית admin בקלרק
  return user.publicMetadata?.role === "admin";
};