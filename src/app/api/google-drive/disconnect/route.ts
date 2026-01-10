// app/api/google-drive/disconnect/route.ts
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

    if (!['guides', 'programs'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "guides" or "programs"' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // מחיקת כל ה-cookies הקשורים
    cookieStore.delete(`google_drive_token_${type}`);
    cookieStore.delete(`google_drive_connected_${type}`);
    
    console.log(`✅ Disconnected from Google Drive ${type}`);

    return NextResponse.json({ 
      success: true,
      message: 'Disconnected successfully' 
    });
    
  } catch (error) {
    console.error('Error disconnecting from Drive:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}