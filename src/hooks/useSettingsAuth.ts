"use client"
import { useCallback, useEffect, useRef, useState } from "react";

declare let google: any;

const defaultScopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email"
];

// טעינת הסקריפט של Google
const loadGoogleScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }

    // בדיקה אם הסקריפט כבר נטען
    if (window.google?.accounts) {
      resolve();
      return;
    }

    // בדיקה אם הסקריפט כבר קיים ב-DOM
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }

    // יצירת סקריפט חדש
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google GSI script loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google GSI script');
      reject(new Error('Failed to load Google script'));
    };
    document.head.appendChild(script);
  });
};

export const useSettingsAuth = () => {
  const tokenClientRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // אתחול Google SDK
  useEffect(() => {
    const initGoogleClient = async () => {
      try {
        // המתנה לטעינת הסקריפט
        await loadGoogleScript();

        // המתנה נוספת עד ש-google.accounts יהיה זמין
        let attempts = 0;
        while (!window.google?.accounts && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.google?.accounts) {
          throw new Error('Google accounts SDK not available after timeout');
        }

        const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
        if (!clientId) {
          throw new Error('NEXT_PUBLIC_CLIENT_ID חסר ב-.env');
        }

        console.log('🔑 Client ID (first 20 chars):', clientId.substring(0, 20));

        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: defaultScopes.join(" "),
          callback: () => {} // הקולבק יוגדר בכל קריאה
        });
        
        tokenClientRef.current = client;
        setIsReady(true);
        setError(null);
        console.log('✅ Google Client initialized successfully');
      } catch (err: any) {
        console.error('❌ Google Client Init Error:', err);
        setError(err.message || 'שגיאה באתחול Google Client');
        setIsReady(false);
      }
    };

    initGoogleClient();
  }, []);

  // פונקציה לבקשת טוקן
  const requestToken = useCallback((authType: string, onSuccess: (tokenData: any) => void, onError: (error: any) => void) => {
    console.log('🔵 requestToken called for type:', authType);
    
    if (error) {
      console.error('❌ Cannot request token, initialization error:', error);
      onError({ message: error });
      return;
    }

    if (!tokenClientRef.current) {
      console.error('❌ Google Client not ready');
      onError({ message: 'Google Client לא מוכן. נסה לרענן את הדף.' });
      return;
    }

    console.log('✅ Token client is ready, requesting access token...');

    // עדכון הקולבק לפני כל בקשה
    tokenClientRef.current.callback = (tokenResponse: any) => {
      console.log('🟢 Token response received:', tokenResponse);
      
      if (tokenResponse && tokenResponse.access_token) {
        console.log('✅ Valid token received');
        
        // שמירה ב-localStorage
        localStorage.setItem(`google_token_${authType}`, JSON.stringify(tokenResponse));
        
        // חילוץ email מה-id_token אם קיים
        if (tokenResponse.id_token) {
          try {
            const payload = JSON.parse(atob(tokenResponse.id_token.split('.')[1]));
            if (payload.email) {
              localStorage.setItem(`google_email_${authType}`, payload.email);
              console.log('✅ Email saved:', payload.email);
            }
          } catch (e) {
            console.error('Failed to parse token:', e);
          }
        }
        
        onSuccess(tokenResponse);
      } else if (tokenResponse.error) {
        console.error('❌ Token error:', tokenResponse.error);
        onError({ message: tokenResponse.error_description || tokenResponse.error });
      } else {
        console.error('❌ Invalid token response:', tokenResponse);
        onError({ message: 'תגובה לא תקינה מגוגל' });
      }
    };

    // בקשת הטוקן עם חלון בחירת חשבון
    try {
      console.log('🔵 Calling requestAccessToken...');
      tokenClientRef.current.requestAccessToken({ 
        prompt: 'select_account' // מאפשר לבחור חשבון אחר בכל פעם
      });
    } catch (err: any) {
      console.error('❌ Error requesting token:', err);
      onError(err);
    }
  }, [error]);

  return {
    isReady,
    requestToken,
    error
  };
};