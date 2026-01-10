"use client";

import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FcGoogle } from 'react-icons/fc';

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
      <FcGoogle className="w-6 h-6" />
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