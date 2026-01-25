import { NextResponse } from 'next/server';

// משתנה גלובלי לשמירת ה-QR הנוכחי
// במקרה שלך, זה צריך להתחבר ל-WhatsApp client שלך
let currentQR: string | null = null;
let isReady: boolean = false;

export async function GET() {
  try {
    console.log('📡 QR API called');
    
    // אם WhatsApp מחובר - אין צורך ב-QR
    if (isReady) {
      return NextResponse.json({ 
        ready: true,
        qr: null,
        message: 'WhatsApp already connected' 
      });
    }
    
    // אם יש QR זמין - החזר אותו
    if (currentQR) {
      return NextResponse.json({ 
        qr: currentQR,
        ready: false 
      });
    }
    
    // אין QR זמין כרגע
    return NextResponse.json({ 
      qr: null,
      ready: false,
      message: 'Waiting for QR code...' 
    });
    
  } catch (error) {
    console.error('❌ Error in QR API:', error);
    return NextResponse.json({ 
      error: 'Failed to get QR code',
      qr: null,
      ready: false
    }, { status: 500 });
  }
}

// פונקציות עזר - תקרא להן מה-WhatsApp client שלך
export function setQR(qr: string) {
  console.log('📱 New QR code received');
  currentQR = qr;
  isReady = false;
}

export function setReady(ready: boolean) {
  console.log('✅ WhatsApp ready status:', ready);
  isReady = ready;
  if (ready) {
    currentQR = null; // נקה את ה-QR כשמחובר
  }
}

export function clearQR() {
  console.log('🗑️ Clearing QR code');
  currentQR = null;
}