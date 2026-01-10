// app/api/google/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // בדיקה אם יש טוקן
    const token = cookieStore.get(`google_token_${type}`)?.value;
    const isConnected = cookieStore.get(`google_connected_${type}`)?.value === 'true';
    
    console.log(`🔍 Checking status for ${type}:`);
    console.log(`  - Token exists: ${!!token}`);
    console.log(`  - Is connected: ${isConnected}`);

    // אם יש טוקן, ננסה לבדוק את המידע מ-Google
    let userEmail = null;
    
    if (token) {
      try {
        // קריאה ל-Google API לקבלת פרטי המשתמש
        const response = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          userEmail = data.email;
          console.log(`  - User email: ${userEmail}`);
        } else {
          console.log(`  - Failed to get user info: ${response.status}`);
          // הטוקן אולי פג תוקף
          if (response.status === 401) {
            // נמחק את ה-cookies
            cookieStore.delete(`google_token_${type}`);
            cookieStore.delete(`google_connected_${type}`);
            
            return NextResponse.json({
              isConnected: false,
              email: null,
              message: 'Token expired'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }

    return NextResponse.json({
      isConnected: isConnected && !!token,
      email: userEmail,
      debug: {
        hasToken: !!token,
        isConnectedFlag: isConnected,
        type: type,
      }
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}