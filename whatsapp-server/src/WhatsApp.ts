// ====================================
// WhatsApp.ts - קובץ מלא מתוקן
// ====================================

import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import fs from "fs";

// ====================================
// משתנים גלובליים
// ====================================
let connectionStatusMessage = "ממתין לתחילת תהליך...";
const GlobalClient = global as unknown as { client: Client; latestQr?: string };

let lastQrCode: string | null = null;
let qrResolve: ((qr: string) => void) | null = null;

// משתנה גלובלי לעקוב אחרי מצב ה-ready
let isClientReady = false;
let readyResolve: (() => void) | null = null;

// מונה ניסיונות התחברות
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 2;

// ========================================
// פונקציה משופרת: בדיקת חיבור אמיתי
// ========================================
const isActuallyConnected = async (): Promise<boolean> => {
  // בדיקה 1: סימן גלובלי
  if (isClientReady && GlobalClient.client) {
    console.log(`🔍 Quick check: isClientReady=true`);
    return true;
  }
  
  // בדיקה 2: אין client
  if (!GlobalClient.client) {
    console.log(`🔍 No client exists`);
    return false;
  }
  
  try {
    // בדיקה משופרת - גם pupPage וגם getState
    const pupPage = (GlobalClient.client as any).pupPage;
    
    // בדוק אם הדפדפן פעיל
    if (!pupPage || pupPage.isClosed()) {
      console.log(`🔍 Browser page is closed`);
      isClientReady = false;
      return false;
    }
    
    // בדוק state עם timeout קצר יותר
    const state = await Promise.race([
      GlobalClient.client.getState(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 3000)
      )
    ]);
    
    const connected = state === 'CONNECTED';
    console.log(`🔍 Connection check: ${connected} (state: ${state})`);
    
    // עדכן את הסימן הגלובלי
    if (connected) {
      isClientReady = true;
      connectionAttempts = 0;
    } else {
      isClientReady = false;
    }
    
    return connected;
    
  } catch (err: any) {
    console.log(`🔍 Connection check: false (error: ${err.message})`);
    isClientReady = false;
    return false;
  }
};

// ========================================
// בדיקה: האם יש Session בקבצים?
// ========================================
const hasSessionFiles = (): boolean => {
  const sessionPath = path.join(process.cwd(), 'WhatsAppData', 'session-1');
  
  if (!fs.existsSync(sessionPath)) return false;
  
  try {
    const files = fs.readdirSync(sessionPath);
    const hasFiles = files.length > 5;
    console.log(`📁 Session files: ${files.length} files (valid: ${hasFiles})`);
    return hasFiles;
  } catch (err) {
    return false;
  }
};

// ========================================
// מחיקת Session
// ========================================
const deleteSession = async (): Promise<void> => {
  console.log("\n🗑️  Deleting session...");
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  
  // סגור client קודם
  if (GlobalClient.client) {
    try {
      const pupBrowser = (GlobalClient.client as any).pupBrowser;
      if (pupBrowser) {
        await pupBrowser.close().catch(() => {});
      }
      await GlobalClient.client.destroy().catch(() => {});
      console.log("✅ Client destroyed");
    } catch (err: any) {
      console.log("⚠️  Client cleanup:", err.message);
    }
    GlobalClient.client = undefined as any;
  }
  
  // אפס סימנים גלובליים
  isClientReady = false;
  readyResolve = null;
  qrResolve = null;
  connectionAttempts = 0;
  lastQrCode = null;
  GlobalClient.latestQr = undefined;
  
  // המתן לשחרור קבצים
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // מחק קבצים
  if (fs.existsSync(dataPath)) {
    try {
      fs.rmSync(dataPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
      console.log("✅ Session files deleted");
    } catch (err: any) {
      console.error("❌ Failed to delete session:", err.message);
      throw err;
    }
  }
};

// ========================================
// 🆕 הגדרת Event Handlers - פונקציה נפרדת
// ========================================
const setupClientEventHandlers = (client: Client) => {
  console.log("🎯 Setting up event handlers...");
  
  // 🔥 QR Event
  client.on("qr", (qr) => {
    console.log("\n📱 QR Code generated");
    console.log("⏰ Time:", new Date().toISOString());
    lastQrCode = qr;
    GlobalClient.latestQr = qr;
    
    if (qrResolve) {
      console.log("✅ Resolving QR promise");
      qrResolve(qr);
      qrResolve = null;
    } else {
      console.log("⚠️  QR generated but no resolver waiting");
    }
  });
  
  // 🔥 Authenticated Event
  client.on("authenticated", () => {
    console.log("\n✅ ===== AUTHENTICATED! =====");
    console.log("⏰ Time:", new Date().toISOString());
    console.log("📱 User scanned QR successfully");
  });
  
  // 🔥 Ready Event - הכי חשוב!
  client.on("ready", () => {
    console.log("\n🎉 ===== WHATSAPP CLIENT READY! =====");
    console.log("⏰ Time:", new Date().toISOString());
    
    // סמן שה-client מוכן
    isClientReady = true;
    connectionAttempts = 0;
    GlobalClient.latestQr = undefined;
    connectionStatusMessage = "מחובר ל-WhatsApp בהצלחה!";
    
    // פתור promise אם ממתינים
    if (readyResolve) {
      console.log("✅ Resolving ready promise");
      readyResolve();
      readyResolve = null;
    }
  });
  
  // 🔥 Change State Event
  client.on("change_state", (state) => {
    console.log(`🔄 State changed: ${state}`);
    
    if (state === 'CONNECTED') {
      console.log("✅ State is now CONNECTED");
      isClientReady = true;
      connectionAttempts = 0;
      GlobalClient.latestQr = undefined;
      connectionStatusMessage = "מחובר ל-WhatsApp";
    }
  });
  
  // 🔥 Auth Failure Event
  client.on("auth_failure", async (msg) => {
    console.log("\n❌ ===== AUTH FAILURE =====");
    console.log("Message:", msg);
    isClientReady = false;
    connectionStatusMessage = "אימות נכשל. נא לנסות שוב.";
    await deleteSession();
  });
  
  // 🔥 Disconnected Event
  client.on("disconnected", async (reason) => {
    console.log("\n❌ ===== DISCONNECTED =====");
    console.log("Reason:", reason);
    isClientReady = false;
    connectionStatusMessage = "החיבור נותק מהטלפון. יש לסרוק קוד QR חדש.";

    try {
      console.log("🛑 Closing browser processes...");
      await client.destroy(); 
      
      const reasonStr = String(reason);
      if (reasonStr === 'LOGOUT' || reasonStr.includes('NAVIGATION')) {
        console.log("🗑️ Logout detected from phone - resetting session...");
        connectionStatusMessage = "מנקה נתונים ישנים ומכין סשן חדש...";
        await deleteSession(); 
      }
    } catch (err) {
      console.error("⚠️ Error during disconnect handling:", err);
    }
  });
  
  // 🔥 Loading Screen Event
  client.on("loading_screen", (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
  });

  // 🆕 Message Event - לדיבאגינג
  client.on("message", (msg) => {
    console.log(`📨 Received message from ${msg.from}: ${msg.body.substring(0, 50)}`);
  });
};

// ========================================
// יצירת Client חדש
// ========================================
const createNewClient = async (): Promise<Client> => {
  console.log("\n🔧 ===== Creating new WhatsApp client =====");
  
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  // 1️⃣ צור client
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: dataPath,
      clientId: '1'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    },
    webVersion: "2.3000.1015910634-alpha",
    webVersionCache: {
      remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015910634-alpha.html",
      type: "remote",
    },
  });
  
  // 2️⃣ הגדר event handlers לפני initialize
  setupClientEventHandlers(client);
  
  // 3️⃣ שמור ב-global
  GlobalClient.client = client;
  console.log("✅ Client created and stored globally");
  
  // 4️⃣ initialize
  console.log("🚀 Calling client.initialize()...");
  await client.initialize();
  console.log("✅ client.initialize() completed");
  
  return client;
};

// ========================================
// הפונקציה הראשית
// ========================================
const GetClientOrInitialize = async () => {
  console.log("\n=== 🎯 GetClientOrInitialize ===");
  console.log("⏰ Time:", new Date().toISOString());
  
  // 1️⃣ יש client קיים ומוכן?
  if (GlobalClient.client && isClientReady) {
    console.log("✅ Client exists and is ready - returning");
    return GlobalClient.client;
  }
  
  // 2️⃣ יש client אבל לא ready? בדוק state
  if (GlobalClient.client) {
    console.log("📌 Checking existing client state...");
    const connected = await isActuallyConnected();
    
    if (connected) {
      console.log("✅ Already connected - returning client");
      return GlobalClient.client;
    }
    
    // בדיקה: האם ניסינו יותר מדי פעמים?
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.log(`⚠️  Reached max connection attempts (${MAX_CONNECTION_ATTEMPTS})`);
      console.log("💡 Returning existing client - user should Reset manually");
      return GlobalClient.client;
    }
    
    console.log(`❌ Client not connected (attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS})`);
    connectionAttempts++;
    await deleteSession();
  }
  
  // 3️⃣ אין client - צור חדש
  return await createNewClient();
};

// 🔒 מנגנון נעילה
let isInitializing = false;
let initPromise: Promise<{ result: 'ready' | 'qr', qr?: string }> | null = null;

// ========================================
// Initialize
// ========================================
const Initialize = async (): Promise<{ result: 'ready' | 'qr', qr?: string }> => {
  console.log("\n=== 🚀 Initialize ===");
  
  // בדיקה מהירה אם כבר מחובר
  if (isClientReady || await isActuallyConnected()) {
    console.log("✅ Client already connected, fast returning 'ready'");
    return { result: 'ready' as const };
  }
  
  // נעילה
  if (isInitializing && initPromise) {
    console.log("⏳ Already initializing - waiting for existing process...");
    return initPromise;
  }
  
  isInitializing = true;
  
  initPromise = (async () => {
    try {
      // 1️⃣ בדוק אם כבר מחובר
      const connected = await isActuallyConnected();
      if (connected) {
        console.log("✅ Already connected!");
        return { result: 'ready' as const };
      }
      
      // 2️⃣ יש Session? נסה לטעון
      const hasSession = hasSessionFiles();
      
      if (hasSession && connectionAttempts === 0) {
        console.log("📁 Found session files - trying to auto-connect...");
        
        // צור client
        await GetClientOrInitialize();
        
        // 🆕 המתן ל-ready עם timeout
        console.log("⏳ Waiting for ready event (up to 60 seconds)...");
        
        const readyPromise = new Promise<void>((resolve) => {
          readyResolve = resolve;
        });
        
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error("Session load timeout")), 60000)
        );
        
        try {
          await Promise.race([readyPromise, timeoutPromise]);
          console.log("✅ Session loaded successfully!");
          return { result: 'ready' as const };
        } catch (err) {
          console.log("⏱️  Session load timeout - will create fresh session");
          connectionAttempts = 0;
          await deleteSession();
        }
      }
      
      // 3️⃣ אין Session תקין - צור חדש
      console.log("📱 Creating fresh session - waiting for QR...");
      
      const qrPromise = new Promise<string>((resolve) => {
        qrResolve = resolve;
        console.log("✅ QR resolver ready");
      });
      
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("QR timeout")), 40000)
      );
      
      console.log("🔧 Creating client...");
      const createPromise = GetClientOrInitialize();
      
      const qr = await Promise.race([qrPromise, timeoutPromise]);
      console.log("✅ QR Code ready!");
      
      await createPromise;
      
      return { result: 'qr' as const, qr };
      
    } catch (err: any) {
      console.error("❌ Failed to initialize:", err.message);
      
      // אולי בינתיים התחבר?
      if (isClientReady || await isActuallyConnected()) {
        return { result: 'ready' as const };
      }
      
      throw new Error("Failed to initialize WhatsApp");
      
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();
  
  return initPromise;
};

export const getConnectionStatus = () => connectionStatusMessage;
export const getLastQrCode = () => GlobalClient.latestQr || lastQrCode;

// ========================================
// Export
// ========================================
export {
  GetClientOrInitialize,
  Initialize,
  isActuallyConnected as isReady,
  hasSessionFiles as hasStoredSession,
  deleteSession as resetClient
};