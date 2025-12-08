import { clerkMiddleware, createRouteMatcher, currentUser, getAuth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';


export default clerkMiddleware(async (auth, request) => {
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