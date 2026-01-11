"use client";

import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { usePathname } from 'next/navigation'

const QrCode = forwardRef((props, ref) => {
  const currentRoute = usePathname()
  const releventRoutes = useMemo(() => ["/messagesForm", "/placementsPage"], [])

  const [Authenticated, setAuthenticated] = useState(false);
  const [ShownAuthentication, setShownAutentication] = useState(false);
  const emitRequest = useRef(false)

  useEffect(() => {
    console.log("WhatsApp Server URL:", process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL);
  }, []);

  // Expose checkConnection method to parent component
  useImperativeHandle(ref, () => ({
    checkConnection: async () => {
      console.log("🔍 checkConnection נקרא");
      
      // אם יש בקשה בתהליך, חכה שתסתיים
      if (emitRequest.current) {
        console.log("⏳ יש בקשה בתהליך, ממתין...");
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!emitRequest.current) break;
        }
      }
      
      // ✅ תיקון: בדוק תחילה אם כבר מחובר
      try {
        const checkUrl = `${process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994'}/Initialize`;
        console.log("📡 בודק חיבור קיים:", checkUrl);
        
        const checkRes = await fetch(checkUrl, { method: "GET" });
        const checkData = await checkRes.json();
        
        if (checkData && checkData.result === 'ready') {
          console.log("✅ כבר מחובר!");
          setAuthenticated(true);
          return true;
        }
        
        console.log("⚠️ לא מחובר, צריך לסרוק QR");
      } catch (err) {
        console.log("❌ שגיאה בבדיקת חיבור:", err);
      }
      
      // רק עכשיו פתח WhatsApp Web
      console.log("🔄 פותח WhatsApp Web...");
      const newWindow = window.open('https://web.whatsapp.com', '_blank');
      if (!newWindow) {
        alert("נא לאפשר pop-ups עבור האתר");
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const connected = await RequestSession();
      console.log("✅ RequestSession החזיר:", connected);
      return connected;
    }
  }));

  const RequestSession = async () => {
    try {
      emitRequest.current = true;
      const req_address = `${process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994'}/Initialize`;
      
      console.log("📡 שולח בקשה ל:", req_address);
      
      const res = await fetch(req_address, {
        method: "GET",
      });

      console.log("📥 סטטוס תגובה:", res.status);

      if (res.status === 500) {
        console.error("❌ שגיאת שרת ב-Initialize");
        alert("שגיאה בחיבור לשרת WhatsApp. ווידא שהשרת רץ.");
        setAuthenticated(false);
        return false;
      }

      const res_parse = await res.json();
      console.log("📦 תגובת Initialize:", res_parse);
      
      // אם יש כבר סשן שמור
      if (res_parse && res_parse.result === 'ready') {
        setAuthenticated(true);
        console.log("✅ סשן קיים - מחובר!");
        return true;
      }
      // אם אין סשן, חכה לסריקת QR
      else if (res_parse && res_parse.data) {
        console.log("⏳ אין סשן, QR זמין. ממתין לסריקה...");
        console.log("📱 נא לסרוק את ה-QR ב-WhatsApp Web שנפתח");
        
        const req_address_wait = `${process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994'}/WaitQr`;
        console.log("⏳ ממתין לסריקת QR:", req_address_wait);
        
        const res_2 = await fetch(req_address_wait, {
          method: "GET",
        });

        console.log("📥 סטטוס WaitQr:", res_2.status);

        if (res_2.status === 500) {
          console.error("❌ שגיאת שרת ב-WaitQr - timeout");
          alert("תם הזמן לסריקת QR. נסה שוב.");
          setAuthenticated(false);
          return false;
        }
        
        const result_qr = await res_2.json();
        console.log("📦 תגובת WaitQr:", result_qr);
        
        if (result_qr) {
          setAuthenticated(true);
          setShownAutentication(false);
          setTimeout(() => setShownAutentication(true), 3000);
          console.log("✅ QR נסרק בהצלחה - מחובר!");
          return true;
        }
      }
      
      setAuthenticated(false);
      return false;
      
    } catch (err) {
      console.error("❌ שגיאה בחיבור:", err);
      alert("שגיאה בחיבור לשרת WhatsApp: " + err);
      setAuthenticated(false);
      return false;
    } finally {
      emitRequest.current = false;
      console.log("🔓 emitRequest אופס");
    }
  }

  const getSuccessModal = () => {
    if (ShownAuthentication || !Authenticated) return null;
    
    return (
      <div>
        <div
          id="successModal"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed flex content-center overflow-y-auto overflow-x-hidden right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full"
        >
          <div className="relative p-4 w-full max-w-md h-full md:h-auto">
            <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5">
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 text-green-500 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="sr-only">Success</span>
              </div>
              <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                התחבר לווצאפ בהצלחה
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (Authenticated && releventRoutes.includes(currentRoute)) {
    return getSuccessModal();
  }

  return null;
});

QrCode.displayName = 'QrCode';

export default QrCode;