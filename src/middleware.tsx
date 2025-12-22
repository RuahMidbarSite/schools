import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

// הגדרת כל הנתיבים שלא דורשים התחברות
const isPublicRoute = createRouteMatcher([
  '/join', 
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/ai-match(.*)' // הוספת נתיב ה-AI לכאן
]);

export default clerkMiddleware(async (auth, request) => {
  // אם הנתיב ציבורי, תן לו לעבור בלי לבדוק userId
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // הגנה על כל שאר הנתיבים
  const { userId } = await auth();
  if (!userId) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};