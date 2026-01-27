import { NextResponse } from 'next/server';

// --- אלו המשתנים הקיימים שלך (נשארים אותו דבר) ---
let currentQR: string | null = null;
let isReady: boolean = false;

// --- 1. מה שצריך להוסיף לפני ה-GET: פונקציית OPTIONS לפתרון ה-CORS ---
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

// --- 2. פונקציית ה-GET המקורית שלך עם תוספת ה-Headers ---
export async function GET() {
  try {
    console.log('📡 QR API called');
    
    let responseData;
    
    if (isReady) {
      responseData = { 
        ready: true,
        qr: null,
        message: 'WhatsApp already connected' 
      };
    } else if (currentQR) {
      responseData = { 
        qr: currentQR,
        ready: false 
      };
    } else {
      responseData = { 
        qr: null,
        ready: false,
        message: 'Waiting for QR code...' 
      };
    }
    
    // החזרת התשובה עם ה-Headers שמאשרים את הגישה בדפדפן
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('❌ Error in QR API:', error);
    return NextResponse.json({ 
      error: 'Failed to get QR code',
      qr: null,
      ready: false
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }
}

// --- 3. מה שאחרי ה-GET: פונקציות העזר שלך (נשארות ללא שינוי) ---
export function setQR(qr: string) {
  console.log('📱 New QR code received');
  currentQR = qr;
  isReady = false;
}

export function setReady(ready: boolean) {
  console.log('✅ WhatsApp ready status:', ready);
  isReady = ready;
  if (ready) {
    currentQR = null;
  }
}

export function clearQR() {
  console.log('🗑️ Clearing QR code');
  currentQR = null;
}