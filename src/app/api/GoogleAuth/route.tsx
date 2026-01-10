export const dynamic = 'force-dynamic';

import { fetchWithTimeout } from '@/app/utilities/fetchwithTimeout';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  // שאר ריק לעת עתה
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  console.log('🚀 [GoogleAuth] GET request started');
  console.log('📝 [GoogleAuth] Code exists:', !!code);
  console.log('📝 [GoogleAuth] State:', state);
  
  // טיפול בשגיאות מ-Google
  if (error) {
    console.error('Google OAuth error:', error);
    const errorMessages: {[key: string]: string} = {
      'access_denied': 'המשתמש דחה את הבקשה לאישור',
      'invalid_request': 'בקשה לא תקינה',
      'unauthorized_client': 'הלקוח לא מורשה',
      'unsupported_response_type': 'סוג תגובה לא נתמך',
      'invalid_scope': 'היקף לא תקין',
      'server_error': 'שגיאת שרת ב-Google',
      'temporarily_unavailable': 'השירות אינו זמין זמנית'
    };
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>שגיאה באימות</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            .error-icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin: 0; font-size: 1.5rem; }
            p { margin-top: 0.5rem; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>שגיאה באימות</h1>
            <p>${errorMessages[error] || 'אירעה שגיאה לא צפויה'}</p>
            <p>החלון ייסגר אוטומטית...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: '${error}',
                message: '${errorMessages[error] || 'אירעה שגיאה לא צפויה'}'
              }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  const decoded = decodeURIComponent(state || '');
  let page_redirect: string;
  let redirecttype: string;
  
  try {
    const parsed = JSON.parse(decoded);
    page_redirect = parsed.page_redirect;
    redirecttype = parsed.redirecttype;
    console.log('✅ [GoogleAuth] State parsed:', { page_redirect, redirecttype });
  } catch (e) {
    console.error('Failed to parse state:', e);
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    // בדיקה ולוגים מפורטים
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log('=== Google OAuth Debug ===');
    console.log('Client ID exists:', !!clientId);
    console.log('Client Secret exists:', !!clientSecret);
    console.log('Redirect type:', redirecttype);
    
    // בדיקה חשובה - אם Client ID או Secret חסרים
    if (!clientId || !clientSecret) {
      console.error('❌ Missing environment variables!');
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>שגיאת הגדרות</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
                max-width: 500px;
              }
              .error-icon { font-size: 4rem; margin-bottom: 1rem; }
              h1 { margin: 0; font-size: 1.5rem; }
              p { margin-top: 0.5rem; opacity: 0.9; }
              .code { 
                background: rgba(0,0,0,0.3); 
                padding: 1rem; 
                border-radius: 0.5rem; 
                margin-top: 1rem;
                font-family: monospace;
                font-size: 0.85rem;
                text-align: left;
                direction: ltr;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">⚙️</div>
              <h1>שגיאת הגדרות סביבה</h1>
              <p>משתני הסביבה של Google OAuth חסרים או לא נטענו כראוי</p>
              <div class="code">
                NEXT_PUBLIC_CLIENT_ID: ${!!clientId ? '✅' : '❌'}<br>
                GOOGLE_CLIENT_SECRET: ${!!clientSecret ? '✅' : '❌'}
              </div>
              <p style="font-size: 0.85rem; margin-top: 1rem;">
                בדוק את קובץ .env.local ווודא שהמשתנים מוגדרים נכון
              </p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_ERROR',
                  error: 'config_error',
                  message: 'משתני סביבה חסרים'
                }, '*');
              }
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    const redirectUri = process.env.NODE_ENV === "development" 
      ? 'http://localhost:3666/api/GoogleAuth' 
      : 'https://ruahmidbarproject.vercel.app/api/GoogleAuth';
    
    console.log('Redirect URI:', redirectUri);
    console.log('Requesting token from Google...');
    
    const tokenResponse = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code || '',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    }, 10000);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: 'parse_error', error_description: errorText };
      }
      
      console.error('❌ Token response not OK:', tokenResponse.status);
      console.error('Error data:', errorData);
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>שגיאה באימות</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
                max-width: 600px;
              }
              .error-icon { font-size: 4rem; margin-bottom: 1rem; }
              h1 { margin: 0; font-size: 1.5rem; }
              p { margin-top: 0.5rem; opacity: 0.9; font-size: 0.9rem; }
              .error-details {
                margin-top: 1rem;
                padding: 1rem;
                background: rgba(0,0,0,0.2);
                border-radius: 0.5rem;
                font-size: 0.8rem;
                text-align: left;
                direction: ltr;
                overflow: auto;
                max-height: 200px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>שגיאה בקבלת טוקן</h1>
              <p>לא הצלחנו לאמת את חשבון Google</p>
              <p><strong>שגיאה:</strong> ${errorData.error || 'Unknown'}</p>
              <p>${errorData.error_description || 'אירעה שגיאה לא ידועה'}</p>
              <div class="error-details">
                <strong>Debug Info:</strong><br>
                Status: ${tokenResponse.status}<br>
                Error: ${JSON.stringify(errorData, null, 2)}
              </div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_ERROR',
                  error: 'token_error',
                  message: 'שגיאה בקבלת טוקן'
                }, '*');
              }
              setTimeout(() => window.close(), 10000);
            </script>
          </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token received successfully');
    console.log('🔑 Access token length:', tokenData.access_token?.length);

    // 🔥 החלק החשוב - שמירת הטוקן ב-cookies! 🔥
    
    // קביעת שם ה-cookie לפי סוג ההתחברות
    let tokenKey = 'google_token';
    let emailKey = 'google_email';
    
    if (redirecttype === 'contacts') {
      tokenKey = 'google_contacts_token';
      emailKey = 'google_contacts_email';
    } else if (redirecttype === 'drive') {
      tokenKey = 'google_drive_token';
      emailKey = 'google_drive_email';
    }

    console.log(`💾 Saving token to cookies: ${tokenKey}`);

    // קבלת המייל מהטוקן (אם קיים)
    let userEmail = '';
    try {
      // ניסיון לקבל את המייל מ-Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email || '';
        console.log(`📧 User email: ${userEmail}`);
      }
    } catch (e) {
      console.warn('Could not fetch user email:', e);
    }

    // חישוב תאריך תפוגה (שעה מעכשיו)
    const expiresIn = tokenData.expires_in || 3600; // default 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    console.log('⏰ Cookie expires at:', expiresAt.toISOString());

    // שמירת ה-cookies עם הגדרות מתוקנות
    const cookieStore = await cookies();
    
    // הגדרות Cookie מתוקנות
    const cookieOptions = {
      path: '/',
      expires: expiresAt,
      httpOnly: false, // ✅ שינוי קריטי! מאפשר גישה מ-JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // ✅ שינוי מ-strict ל-lax
    };
    
    console.log('🔧 Cookie options:', cookieOptions);
    
    try {
      cookieStore.set(tokenKey, tokenData.access_token, cookieOptions);
      console.log(`✅ Set ${tokenKey} cookie`);
      
      if (userEmail) {
        cookieStore.set(emailKey, userEmail, cookieOptions);
        console.log(`✅ Set ${emailKey} cookie`);
      }
      
      // בדיקה מיידית - האם ה-cookie נשמר?
      const checkToken = cookieStore.get(tokenKey);
      const checkEmail = cookieStore.get(emailKey);
      console.log('🔍 Immediate verification:');
      console.log(`  ${tokenKey}:`, checkToken ? 'EXISTS ✅' : 'NOT FOUND ❌');
      console.log(`  ${emailKey}:`, checkEmail ? 'EXISTS ✅' : 'NOT FOUND ❌');
      
    } catch (cookieError) {
      console.error('❌ Error setting cookies:', cookieError);
    }

    console.log(`✅ Cookie save process completed`);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>אימות הושלם</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            .checkmark {
              font-size: 4rem;
              margin-bottom: 1rem;
              animation: scaleIn 0.5s ease-out;
            }
            @keyframes scaleIn {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
            h1 {
              margin: 0;
              font-size: 1.5rem;
            }
            p {
              margin-top: 0.5rem;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✅</div>
            <h1>אימות הושלם בהצלחה!</h1>
            <p>החלון ייסגר אוטומטית...</p>
          </div>
          <script>
            console.log('🎉 [Auth Success Page] Loaded');
            console.log('📧 Email: ${userEmail}');
            console.log('🔑 Token Key: ${tokenKey}');
            
            if (window.opener) {
              console.log('📤 [Auth Success Page] Sending message to opener');
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                authType: '${redirecttype}',
                email: '${userEmail}',
                tokenKey: '${tokenKey}',
                emailKey: '${emailKey}'
              }, '${new URL(page_redirect).origin}');
              
              setTimeout(() => {
                console.log('👋 [Auth Success Page] Closing window');
                window.close();
              }, 2000);
            } else {
              console.log('🔄 [Auth Success Page] No opener, redirecting...');
              setTimeout(() => {
                window.location.href = '${page_redirect}';
              }, 2000);
            }
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (err) {
    console.error('❌ Google Auth error:', err);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>שגיאה</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            .error-details {
              margin-top: 1rem;
              padding: 1rem;
              background: rgba(0,0,0,0.2);
              border-radius: 0.5rem;
              font-size: 0.8rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ אירעה שגיאה</h1>
            <p>נסה שוב מאוחר יותר</p>
            <div class="error-details">
              ${err instanceof Error ? err.message : 'Unknown error'}
            </div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'general_error',
                message: 'אירעה שגיאה כללית'
              }, '*');
            }
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}