"use client";

import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { usePathname } from 'next/navigation';

const QrCode = forwardRef((props, ref) => {
  const currentRoute = usePathname();
  const relevantRoutes = useMemo(() => ["/messagesForm", "/placementsPage"], []);

  const [authenticated, setAuthenticated] = useState(false);
  const [showAuthentication, setShowAuthentication] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  const emitRequest = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';

  // Generate QR Code on canvas
  useEffect(() => {
    if (qrCodeData && canvasRef.current) {
      const QRCode = require('qrcode');
      
      QRCode.toCanvas(
        canvasRef.current,
        qrCodeData,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (error: any) => {
          if (error) {
            console.error('❌ QR generation error:', error);
            setErrorMessage('שגיאה ביצירת קוד QR');
          } else {
            console.log('✅ QR Code generated');
          }
        }
      );
    }
  }, [qrCodeData]);

  // Expose checkConnection method to parent
  useImperativeHandle(ref, () => ({
    checkConnection: async () => {
      console.log("\n=== 🔍 checkConnection Called ===");
      console.log("⏰ Time:", new Date().toISOString());
      
      if (emitRequest.current) {
        console.log("⏳ Request in progress, waiting...");
        for (let i = 0; i < 120; i++) { // 2 minutes max
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!emitRequest.current) {
            console.log("✅ Previous request completed");
            break;
          }
          if (i % 10 === 0) {
            console.log(`⏳ Still waiting... ${i} seconds`);
          }
        }
      }
      
      const result = await RequestSession();
      console.log("🎯 checkConnection result:", result);
      console.log("⏰ Time:", new Date().toISOString());
      return result;
    }
  }));

  const RequestSession = async () => {
    console.log("\n=== 🚀 RequestSession Started ===");
    console.log("⏰ Time:", new Date().toISOString());
    
    try {
      emitRequest.current = true;
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage("מאתחל חיבור...");
      
      const initUrl = `${SERVER_URL}/Initialize`;
      console.log("📡 Calling:", initUrl);
      
      // Step 1: Initialize with 60 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏰ 60 second timeout");
        controller.abort();
      }, 60000);
      
      const initRes = await fetch(initUrl, { 
        method: "GET",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("📥 Initialize response:", initRes.status);
      console.log("⏰ Time:", new Date().toISOString());

      if (!initRes.ok) {
        throw new Error(`Server error: ${initRes.status}`);
      }

      const initData = await initRes.json();
      console.log("📦 Initialize data:", initData);
      
      // Case 1: Already ready (has stored session)
      if (initData.result === 'ready') {
        console.log("✅ Already connected (stored session)");
        setAuthenticated(true);
        setShowAuthentication(false);
        setTimeout(() => setShowAuthentication(true), 1000);
        setIsLoading(false);
        emitRequest.current = false;
        setStatusMessage("מחובר!");
        return true;
      }
      
      // Case 2: Need to scan QR (new session)
      if (initData.result === 'qr' && initData.data) {
        console.log("📱 QR code received");
        setStatusMessage("סרוק QR בטלפון");
        setQrCodeData(initData.data);
        setShowQRModal(true);
        
        // Step 2: Wait for QR scan (up to 3 minutes)
        console.log("⏳ Waiting for QR scan...");
        const waitUrl = `${SERVER_URL}/WaitQr`;
        console.log("📡 Calling:", waitUrl);
        
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => {
          console.log("⏰ 180 second timeout for QR scan");
          controller2.abort();
        }, 180000); // 3 minutes
        
        try {
          const waitRes = await fetch(waitUrl, { 
            method: "GET",
            signal: controller2.signal
          });
          
          clearTimeout(timeoutId2);
          console.log("📥 WaitQr response:", waitRes.status);
          console.log("⏰ Time:", new Date().toISOString());

          if (waitRes.status === 408) {
            console.error("❌ QR scan timeout");
            setErrorMessage("לא סרקת את ה-QR בזמן (3 דקות). נסה שוב.");
            setShowQRModal(false);
            setIsLoading(false);
            emitRequest.current = false;
            return false;
          }

          if (!waitRes.ok) {
            throw new Error(`WaitQr error: ${waitRes.status}`);
          }
          
          const waitData = await waitRes.json();
          console.log("📦 WaitQr data:", waitData);
          
          if (waitData.status === 'authenticated') {
            console.log("✅ QR scanned successfully!");
            setStatusMessage("מסנכרן עם WhatsApp...");
            
            // Wait for client to be fully ready
            if (!waitData.clientReady) {
              console.log("⏳ Waiting for client to be ready...");
              await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
            }
            
            setAuthenticated(true);
            setShowAuthentication(false);
            setShowQRModal(false);
            setTimeout(() => setShowAuthentication(true), 1000);
            setIsLoading(false);
            emitRequest.current = false;
            setStatusMessage("מחובר בהצלחה!");
            console.log("✅ Connection complete!");
            console.log("⏰ Time:", new Date().toISOString());
            return true;
          }
          
          console.warn("⚠️ Unexpected WaitQr response");
          setErrorMessage("תגובה לא צפויה מהשרת");
          setShowQRModal(false);
          setIsLoading(false);
          emitRequest.current = false;
          return false;
          
        } catch (fetchError: any) {
          clearTimeout(timeoutId2);
          
          if (fetchError.name === 'AbortError') {
            console.error("❌ QR scan timeout");
            setErrorMessage("תם הזמן לסריקת QR (3 דקות). נסה שוב.");
          } else {
            console.error("❌ WaitQr error:", fetchError);
            setErrorMessage(`שגיאה: ${fetchError.message}`);
          }
          
          setShowQRModal(false);
          setIsLoading(false);
          emitRequest.current = false;
          return false;
        }
      }
      
      console.warn("⚠️ Unexpected initialize response");
      setErrorMessage("תגובה לא צפויה מהשרת");
      setIsLoading(false);
      emitRequest.current = false;
      return false;
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error("❌ Initialize timeout");
        setErrorMessage("תם הזמן להתחברות (60 שניות). נסה שוב.");
      } else {
        console.error("❌ RequestSession error:", err);
        setErrorMessage(`שגיאה: ${err.message}`);
      }
      
      setShowQRModal(false);
      setIsLoading(false);
      emitRequest.current = false;
      return false;
    }
  };

  // Success Modal
  const getSuccessModal = () => {
    if (showAuthentication || !authenticated) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5">
              <svg
                className="w-8 h-8 text-green-500 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              התחבר לווצאפ בהצלחה ✔
            </p>
            <button
              onClick={() => setShowAuthentication(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  };

  // QR Code Modal
  const getQRModal = () => {
    if (!showQRModal) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-6 text-center bg-white rounded-lg shadow dark:bg-gray-800">
            <button
              onClick={() => {
                setShowQRModal(false);
                setQrCodeData(null);
                emitRequest.current = false;
                setIsLoading(false);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              סרוק QR Code
            </h3>
            
            {statusMessage && (
              <p className="mb-2 text-sm text-blue-600 dark:text-blue-400">
                {statusMessage}
              </p>
            )}
            
            <div className="flex justify-center mb-4 bg-white p-4 rounded-lg">
              <canvas ref={canvasRef} />
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-right">
              <p>1. פתח את WhatsApp בטלפון שלך</p>
              <p>2. עבור להגדרות → מכשירים מקושרים</p>
              <p>3. לחץ על "קשר מכשיר" וסרוק את הקוד</p>
              <p className="text-xs text-orange-600 mt-3">⏰ יש לך 3 דקות לסרוק</p>
            </div>
            
            {isLoading && (
              <div className="mt-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">ממתין לסריקה...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Error Modal
  const getErrorModal = () => {
    if (!errorMessage) return null;
    
    return (
      <div className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full bg-black bg-opacity-50">
        <div className="relative p-4 w-full max-w-md h-full md:h-auto">
          <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 p-2 flex items-center justify-center mx-auto mb-3.5">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              סגור
            </button>
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