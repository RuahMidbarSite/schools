"use client";

import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { usePathname } from 'next/navigation';

interface QrCodeRef {
  checkConnection: () => Promise<boolean>;
}

const QrCode = forwardRef<QrCodeRef>((props, ref) => {
  const currentRoute = usePathname();
  const relevantRoutes = useMemo(() => ["/messagesForm", "/placementsPage"], []);

  const [authenticated, setAuthenticated] = useState(false);
  const [showAuthentication, setShowAuthentication] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  const initRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';

  // בדיקה אוטומטית בטעינה - פעם אחת בלבד
  useEffect(() => {
    if (relevantRoutes.includes(currentRoute) && !initRef.current) {
      initRef.current = true;
      console.log("Checking connection...");
      checkAndInitialize();
    }
  }, [currentRoute]);

  const checkAndInitialize = async () => {
    const connected = await simpleConnectionCheck();
    if (!connected) {
      await RequestSession();
    } else {
      setAuthenticated(true);
      setShowAuthentication(true);
    }
  };

  // בדיקה פשוטה - האם מחובר?
  const simpleConnectionCheck = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${SERVER_URL}/status`, {
        method: "GET",
        signal: AbortSignal.timeout(5000)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.connected && data.isReady) {
          console.log("Already connected");
          return true;
        }
        
        // אם יש session - חכה 10 שניות ובדוק שוב
        if (data.hasSession && !data.connected) {
          console.log("Has session, waiting 10s...");
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const retry = await fetch(`${SERVER_URL}/status`, {
            signal: AbortSignal.timeout(5000)
          });
          
          if (retry.ok) {
            const retryData = await retry.json();
            if (retryData.connected && retryData.isReady) {
              console.log("Connected after wait");
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (err) {
      console.error("Check error:", err);
      return false;
    }
  };

  // יצירת QR על canvas
  useEffect(() => {
    if (qrCodeData && canvasRef.current) {
      const QRCode = require('qrcode');
      QRCode.toCanvas(canvasRef.current, qrCodeData, { width: 300, margin: 2 });
    }
  }, [qrCodeData]);

  // חשיפה לקומפוננטה אב
  useImperativeHandle(ref, () => ({
    checkConnection: async () => {
      const result = await simpleConnectionCheck();
      if (!result) {
        await RequestSession();
      }
      return result;
    }
  }));

  const RequestSession = async () => {
    console.log("\n=== RequestSession ===");
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage("מאתחל...");
      
      // קריאה ל-Initialize
      const initRes = await fetch(`${SERVER_URL}/Initialize`, {
        method: "GET",
        signal: AbortSignal.timeout(60000)
      });
      
      if (!initRes.ok) {
        throw new Error(`Server error: ${initRes.status}`);
      }

      const initData = await initRes.json();
      console.log("Initialize result:", initData.result);
      
      // מוכן
      if (initData.result === 'ready') {
        setAuthenticated(true);
        setShowAuthentication(true);
        setIsLoading(false);
        return;
      }
      
      // צריך QR
      if (initData.result === 'qr' && initData.data) {
        setQrCodeData(initData.data);
        setShowQRModal(true);
        setStatusMessage("סרוק QR");
        
        // Polling - בדיקה כל 3 שניות
        const maxTime = 6 * 60 * 1000;
        const interval = 3000;
        const start = Date.now();
        
        while (Date.now() - start < maxTime) {
          await new Promise(resolve => setTimeout(resolve, interval));
          
          const statusRes = await fetch(`${SERVER_URL}/status`, {
            signal: AbortSignal.timeout(5000)
          });
          
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            
            if (statusData.connected && statusData.isReady) {
              console.log("Connected!");
              
              setAuthenticated(true);
              setShowQRModal(false);
              setShowAuthentication(true);
              setIsLoading(false);
              return;
            }
          }
          
          const elapsed = Math.floor((Date.now() - start) / 1000);
          setStatusMessage(`ממתין... (${elapsed}s)`);
        }
        
        // Timeout
        setErrorMessage("לא סרקת בזמן");
        setShowQRModal(false);
        setIsLoading(false);
        return;
      }
      
      setErrorMessage("תגובה לא צפויה");
      setIsLoading(false);
      
    } catch (err: any) {
      console.error("Error:", err);
      setErrorMessage(`שגיאה: ${err.message}`);
      setShowQRModal(false);
      setIsLoading(false);
    }
  };

  // Modals (Success, QR, Error) - זהה לקוד הקודם
  const getSuccessModal = () => {
    if (showAuthentication || !authenticated) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5">
              <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">מחובר לווצאפ</p>
            <button onClick={() => setShowAuthentication(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">סגור</button>
          </div>
        </div>
      </div>
    );
  };

  const getQRModal = () => {
    if (!showQRModal) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-6 text-center bg-white rounded-lg shadow dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">סרוק QR Code</h3>
            {statusMessage && <p className="mb-2 text-sm text-blue-600">{statusMessage}</p>}
            <div className="flex justify-center mb-4 bg-white p-4 rounded-lg">
              <canvas ref={canvasRef} />
            </div>
            <div className="text-sm text-gray-600 space-y-2 text-right">
              <p>1. פתח WhatsApp בטלפון</p>
              <p>2. הגדרות → מכשירים מקושרים</p>
              <p>3. קשר מכשיר וסרוק</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getErrorModal = () => {
    if (!errorMessage) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
            <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{errorMessage}</p>
            <button onClick={() => { setErrorMessage(null); setTimeout(() => checkAndInitialize(), 1000); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 ml-2">נסה שוב</button>
            <button onClick={() => setErrorMessage(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">סגור</button>
          </div>
        </div>
      </div>
    );
  };

  if (!relevantRoutes.includes(currentRoute)) {
    return null;
  }

  return (
    <>
      {getSuccessModal()}
      {getQRModal()}
      {getErrorModal()}
    </>
  );
});

QrCode.displayName = 'QrCode';

export default QrCode;