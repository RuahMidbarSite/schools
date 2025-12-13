import { clerkMiddleware, createRouteMatcher, currentUser, getAuth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

// 1. הגדרת נתיבים ציבוריים - דפים שפתוחים לכולם (גם למי שלא מחובר)
// הוספתי כאן את /join (דף הנחיתה שבנינו) ואת נתיבי ההרשמה של Clerk
const isPublicRoute = createRouteMatcher([
  '/join',           // דף הנחיתה למדריכים
  '/sign-in(.*)',    // דף כניסה
  '/sign-up(.*)',    // דף הרשמה
  '/api/upload(.*)'  // אם תרצה לאפשר העלאת קבצים ציבורית בעתיד
]);

export default clerkMiddleware(async (auth, request) => {
  
  // 2. בדיקה ראשונית: אם זה נתיב ציבורי - שחרר מיד, אל תבדוק משתמש
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // --- מכאן והלאה: הלוגיקה הקיימת שלך למשתמשים מחוברים בלבד ---

  // Check if the user is authenticated
  const { userId, sessionClaims } = await auth()

  // if not authenticated, don't even talk to me.
  if (!userId) {
    // Protect the route and redirect to login
    await auth.protect();
  }

  const routesToIgnore = ['/api/GoogleAuth', '/googleCallback'];
  // we allow seeing what is allowed for the user.
  const routes_allowed = sessionClaims?.metadata?.routes

  if (routes_allowed) {
    if (routes_allowed.includes("All")) {
      return NextResponse.next();
    }
    const allowedRoutesMatcher = createRouteMatcher([...routes_allowed, ...routesToIgnore])
    if (allowedRoutesMatcher(request)) {
      return NextResponse.next()
    }
  }

  return new NextResponse('אין אישור צפייה', { status: 401 })
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}