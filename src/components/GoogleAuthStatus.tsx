"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "react-bootstrap";
import { FcGoogle } from "react-icons/fc";

interface GoogleAuthStatusProps {
  type: "Drive" | "Contacts";
  onDisconnect: () => Promise<void>;
  checkAuthStatus: () => Promise<{ isConnected: boolean; email?: string }>;
}

export function GoogleAuthStatus({
  type,
  onDisconnect,
  checkAuthStatus,
}: GoogleAuthStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkStatus = useCallback(async () => {
    try {
      console.log(`🔍 [GoogleAuthStatus] Starting check for ${type}...`);
      console.log(`⏰ [GoogleAuthStatus] Timestamp:`, new Date().toISOString());
      
      setIsLoading(true);
      
      const status = await checkAuthStatus();
      
      console.log(`📊 [GoogleAuthStatus] Raw response for ${type}:`, status);
      console.log(`✅ [GoogleAuthStatus] isConnected:`, status.isConnected);
      console.log(`📧 [GoogleAuthStatus] email:`, status.email);
      
      if (status.debug) {
        console.log(`🛠 [GoogleAuthStatus] Debug info:`, status.debug);
        setDebugInfo(status.debug);
      }
      
      setIsConnected(status.isConnected);
      setEmail(status.email);
      
      console.log(`💾 [GoogleAuthStatus] State updated - isConnected: ${status.isConnected}, email: ${status.email}`);
    } catch (error) {
      console.error(`❌ [GoogleAuthStatus] Error checking ${type}:`, error);
      console.error(`❌ [GoogleAuthStatus] Error stack:`, error.stack);
      setIsConnected(false);
      setEmail(undefined);
      setDebugInfo({ error: error.message });
    } finally {
      setIsLoading(false);
      console.log(`🏁 [GoogleAuthStatus] Check completed for ${type}`);
    }
  }, [checkAuthStatus, type]);

  useEffect(() => {
    console.log(`🚀 [GoogleAuthStatus] Component mounted for ${type}`);
    checkStatus();
    
    // בדיקה חוזרת כל 30 שניות
    const interval = setInterval(() => {
      console.log(`🔄 [GoogleAuthStatus] Auto-refresh check for ${type}`);
      checkStatus();
    }, 30000);
    
    return () => {
      console.log(`👋 [GoogleAuthStatus] Component unmounting for ${type}`);
      clearInterval(interval);
    };
  }, [checkStatus, type]);

  const handleDisconnect = async () => {
    if (!window.confirm(`האם אתה בטוח שברצונך להתנתק מ-Google ${type}?`)) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await onDisconnect();
      setIsConnected(false);
      setEmail(undefined);
    } catch (error) {
      console.error(`Error disconnecting from ${type}:`, error);
      alert(`שגיאה בניתוק מ-Google ${type}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  console.log(`🎨 [GoogleAuthStatus] Rendering: type=${type}, isLoading=${isLoading}, isConnected=${isConnected}, email=${email}`);

  if (isLoading) {
    return (
      <div style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: "10px",
        padding: "8px 12px",
        backgroundColor: "#f0f0f0",
        borderRadius: "6px"
      }}>
        <FcGoogle size={20} />
        <span style={{ fontSize: "14px", color: "#666" }}>בודק התחברות...</span>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "inline-flex", 
      alignItems: "center", 
      gap: "10px",
      padding: "8px 12px",
      backgroundColor: isConnected ? "#e8f5e9" : "#ffebee",
      borderRadius: "6px",
      border: `1px solid ${isConnected ? "#81c784" : "#e57373"}`
    }}>
      <FcGoogle size={20} />
      {isConnected ? (
        <>
          <span style={{ 
            color: "#1b5e20",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            {email || 'חשבון מחובר'}
          </span>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            style={{ 
              fontSize: "12px",
              padding: "4px 12px"
            }}
          >
            {isDisconnecting ? "מתנתק..." : "התנתק"}
          </Button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ 
            color: "#999", 
            fontSize: "14px",
            fontWeight: "500"
          }}>
            לא מחובר
          </span>
          {debugInfo && (
            <span style={{ fontSize: "10px", color: "#999" }}>
              Debug: {JSON.stringify(debugInfo)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}