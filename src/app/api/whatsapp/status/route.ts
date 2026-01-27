import { NextResponse } from 'next/server';

// 1. הוספת פונקציית OPTIONS לטיפול ב-CORS (Preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  try {
    console.log('📡 Fetching WhatsApp status...');
    
    // כתובת השרת - ב-Vercel זה חייב להיות URL חיצוני ולא localhost
    const SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';
    
    const response = await fetch(`${SERVER_URL}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) 
    });

    // הוספת ה-Headers לכל תשובה שחוזרת
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, isReady: false, error: 'Server not responding' },
        { status: 200, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { connected: false, isReady: false, error: 'Connection failed' },
      { 
        status: 200, 
        headers: { 'Access-Control-Allow-Origin': '*' } 
      }
    );
  }
}