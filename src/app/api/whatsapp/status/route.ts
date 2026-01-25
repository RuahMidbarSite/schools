import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 🔥 שונה מ-3001 ל-3994 (או השתמש ב-env variable)
    const SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';
    
    const response = await fetch(`${SERVER_URL}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // timeout של 5 שניות
    });

    if (!response.ok) {
      return NextResponse.json({ 
        connected: false, 
        isReady: false,
        error: 'Server not responding' 
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      connected: false, 
      isReady: false,
      error: 'Connection failed' 
    });
  }
}