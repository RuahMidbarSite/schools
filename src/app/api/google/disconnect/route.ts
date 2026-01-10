// app/api/google/disconnect/route.ts
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
    
    // מחיקת כל ה-cookies הקשורים
    cookieStore.delete(`google_token_${type}`);
    cookieStore.delete(`google_connected_${type}`);
    
    console.log(`✅ Disconnected from Google ${type}`);

    return NextResponse.json({ 
      success: true,
      message: 'Disconnected successfully' 
    });
    
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}