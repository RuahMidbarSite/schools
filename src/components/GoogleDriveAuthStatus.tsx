"use client";

import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
//import { FcGoogle } from 'react-icons/fc';

interface GoogleDriveAuthStatusProps {
  type: 'Guides' | 'Programs';
  onDisconnect: () => Promise<void>;
  checkAuthStatus: () => Promise<{ isConnected: boolean; email?: string }>;
}

export function GoogleDriveAuthStatus({ 
  type, 
  onDisconnect, 
  checkAuthStatus 
}: GoogleDriveAuthStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await checkAuthStatus();
      console.log(`🔍 [GoogleDriveAuthStatus ${type}] Status result:`, result);
      
      setIsConnected(result.isConnected);
      
      // אם מחובר, נסה לשלוף את המייל מהטוקן
      if (result.isConnected && result.email) {
        setUserEmail(result.email);
      } else if (result.isConnected) {
        // אם אין email מהשרת, נסה לשלוף מ-localStorage או Google API
        try {
          const gapiEmail = await getGoogleAccountEmail();
          setUserEmail(gapiEmail || 'Connected');
        } catch {
          setUserEmail('Connected');
        }
      } else {
        setUserEmail(null);
      }
    } catch (error) {
      console.error(`❌ [GoogleDriveAuthStatus ${type}] Error:`, error);
      setIsConnected(false);
      setUserEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthStatus, type]);

  // פונקציה לשליפת כתובת המייל מ-Google
  const getGoogleAccountEmail = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    try {
      // נסה לשלוף מ-gapi אם זמין
      if (window.gapi?.client?.getToken) {
        const token = window.gapi.client.getToken();
        if (token?.access_token) {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${token.access_token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.email || null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Google account email:', error);
    }
    
    return null;
  };

  useEffect(() => {
    checkStatus();
    
    // רענון סטטוס כל 30 שניות
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleDisconnect = async () => {
    if (!confirm(`האם אתה בטוח שברצונך להתנתק מ-Google Drive ${type}?`)) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await onDisconnect();
      setIsConnected(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('שגיאה בהתנתקות מ-Google Drive');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Spinner animation="border" size="sm" />
        <span className="text-gray-500 text-sm">בודק התחברות...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
   <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="text-purple-800 text-sm font-semibold">
            {userEmail || 'חשבון מחובר'}
          </span>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="text-xs"
          >
            {isDisconnecting ? (
              <>
                <Spinner animation="border" size="sm" className="mr-1" />
                מתנתק...
              </>
            ) : (
              'התנתק'
            )}
          </Button>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">
          לא מחובר
        </span>
      )}
    </div>
  );
}