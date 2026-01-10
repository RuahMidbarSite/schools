// app/api/google/save-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { token, type } = await request.json();
    
    if (!token || !type) {
      return NextResponse.json(
        { error: 'Token and type are required' },
        { status: 400 }
      );
    }

    // שמירת הטוקן ב-cookie מאובטח
    const cookieStore = await cookies();
    
    // Cookie עם הטוקן
    cookieStore.set(`google_token_${type}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // שעה אחת
      path: '/',
    });
    
    // Cookie נוסף שמסמן שמחובר (בלי הטוקן עצמו)
    cookieStore.set(`google_connected_${type}`, 'true', {
      httpOnly: false, // כדי שנוכל לקרוא מצד הלקוח
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    console.log(`✅ Token saved for type: ${type}`);

    return NextResponse.json({ 
      success: true,
      message: 'Token saved successfully' 
    });
    
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}