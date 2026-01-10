// הוסף קובץ זה: app/api/google/debug-auth/route.ts

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // בדיקת כל ה-cookies הקשורים ל-Google
    const allCookies = cookieStore.getAll();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      allCookiesCount: allCookies.length,
      allCookieNames: allCookies.map(c => c.name),
      googleCookies: {
        google_token: cookieStore.get('google_token'),
        google_email: cookieStore.get('google_email'),
        google_contacts_token: cookieStore.get('google_contacts_token'),
        google_contacts_email: cookieStore.get('google_contacts_email'),
        google_drive_token: cookieStore.get('google_drive_token'),
        google_drive_email: cookieStore.get('google_drive_email'),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasClientId: !!process.env.NEXT_PUBLIC_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      }
    };

    console.log('🔍 Debug Auth Info:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}