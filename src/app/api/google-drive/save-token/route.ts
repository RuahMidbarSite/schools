// app/api/google-drive/save-token/route.ts
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

    // type יכול להיות 'guides' או 'programs'
    if (!['guides', 'programs'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "guides" or "programs"' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // שמירת הטוקן ב-cookie מאובטח
    cookieStore.set(`google_drive_token_${type}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // שעה אחת
      path: '/',
    });
    
    // Cookie נוסף שמסמן שמחובר (בלי הטוקן עצמו)
    cookieStore.set(`google_drive_connected_${type}`, 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    console.log(`✅ Drive token saved for type: ${type}`);

    return NextResponse.json({ 
      success: true,
      message: 'Token saved successfully' 
    });
    
  } catch (error) {
    console.error('Error saving Drive token:', error);
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}