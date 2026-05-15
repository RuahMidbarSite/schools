import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

// הגדרת כל הנתיבים שלא דורשים התחברות
const isPublicRoute = createRouteMatcher([
  '/join', 
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/ai-match(.*)', 
  '/api/google(.*)',
  '/api/drive(.*)',
  '/whatsapp(.*)' // <--- הוספת השורה הזו פותחת רק את נתיב הווצאפ לכולם
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

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