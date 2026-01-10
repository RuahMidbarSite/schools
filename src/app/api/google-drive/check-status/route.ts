// app/api/google-drive/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    
    if (!type) {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      );
    }

    if (!['guides', 'programs'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "guides" or "programs"' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // בדיקה אם קיים cookie המעיד על חיבור
    const connectedCookie = cookieStore.get(`google_drive_connected_${type}`);
    const isConnected = connectedCookie?.value === 'true';
    
    let email = null;
    
    // אם מחובר, נסה לקבל את כתובת המייל
    if (isConnected) {
      const tokenCookie = cookieStore.get(`google_drive_token_${type}`);
      if (tokenCookie?.value) {
        try {
          // קריאה ל-Google API לקבלת פרטי המשתמש
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${tokenCookie.value}`
            }
          });
          
          if (userInfoResponse.ok) {
            const userData = await userInfoResponse.json();
            email = userData.email;
            console.log(`✅ [check-status] Found email: ${email}`);
          }
        } catch (error) {
          console.warn('Could not fetch user email:', error);
          // אם נכשל, נשאיר email כ-null והקומפוננט יציג "Connected"
        }
      }
    }

    console.log(`📊 [check-status] Type: ${type}, Connected: ${isConnected}, Email: ${email}`);

    return NextResponse.json({ 
      isConnected,
      email: isConnected ? email : null
    });
    
  } catch (error) {
    console.error('Error checking Drive status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}