// ====================================
// WhatsApp.ts - Ultimate Version
// פשוט, יציב, עובד עם Vercel + ngrok
// ====================================

import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import fs from "fs";

const GlobalClient = global as unknown as { client: Client };

let lastQrCode: string | null = null;
let qrResolve: ((qr: string) => void) | null = null;
let isClientReady = false;

// ========================================
// פונקציה: האם יש חיבור אמיתי?
// ========================================
const isActuallyConnected = async (): Promise<boolean> => {
  if (!GlobalClient.client) {
    console.log(`🔍 No client exists`);
    return false;
  }
  
  // בדיקה מהירה של הסטטוס הגלובלי
  if (isClientReady) {
    console.log(`🔍 Quick check: isClientReady=true`);
    return true;
  }
  
  try {
    // בדיקה עם timeout של 10 שניות (מספיק לשליחת הודעה)
    const state = await Promise.race([
      GlobalClient.client.getState(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 10000)
      )
    ]);
    
    const connected = state === 'CONNECTED';
    console.log(`🔍 Connection check: ${connected} (state: ${state})`);
    
    // עדכן את הסטטוס הגלובלי
    if (connected) {
      isClientReady = true;
    }
    
    return connected;
    
  } catch (err: any) {
    console.log(`🔍 Connection check: false (error: ${err.message})`);
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
// מחיקת Session - רק כשהמשתמש מבקש!
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
  
  // אפס סטטוסים
  isClientReady = false;
  lastQrCode = null;
  qrResolve = null;
  
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
// יצירת Client חדש
// ========================================
const createNewClient = async (): Promise<Client> => {
  console.log("\n🔧 Creating new WhatsApp client...");
  
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
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
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  client.on("qr", (qr) => {
    console.log("\n📱 QR Code generated");
    console.log("⏰ Time:", new Date().toISOString());
    lastQrCode = qr;
    
    if (qrResolve) {
      console.log("✅ Resolving QR promise");
      qrResolve(qr);
      qrResolve = null;
    }
  });
  
  client.on("authenticated", () => {
    console.log("\n✅ ===== AUTHENTICATED! =====");
    console.log("⏰ Time:", new Date().toISOString());
    console.log("📱 User scanned QR successfully");
  });
  
  client.on("ready", () => {
    console.log("\n🎉 ===== WHATSAPP CLIENT READY! =====");
    console.log("⏰ Time:", new Date().toISOString());
    isClientReady = true;
    lastQrCode = null;
  });
  
  client.on("change_state", (state) => {
    console.log(`🔄 State changed: ${state}`);
    if (state === 'CONNECTED') {
      isClientReady = true;
    }
  });
  
  client.on("auth_failure", async (msg) => {
    console.log("\n❌ ===== AUTH FAILURE =====");
    console.log("Message:", msg);
    isClientReady = false;
    await deleteSession();
  });
  
  client.on("disconnected", async (reason) => {
    console.log("\n❌ ===== DISCONNECTED =====");
    console.log("Reason:", reason);
    isClientReady = false;
    
    const reasonStr = String(reason);
    if (reasonStr === 'LOGOUT' || reasonStr.includes('NAVIGATION')) {
      console.log("🗑️  Logout detected - deleting session");
      await deleteSession();
    }
  });
  
  client.on("loading_screen", (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
  });
  
  console.log("🚀 Initializing client...");
  await client.initialize();
  
  GlobalClient.client = client;
  console.log("✅ Client initialized");
  
  return client;
};

// ========================================
// הפונקציה הראשית - עם הגנה מפני מחיקה
// ========================================
const GetClientOrInitialize = async (): Promise<Client> => {
  console.log("\n=== 🎯 GetClientOrInitialize ===");
  console.log("⏰ Time:", new Date().toISOString());
  
  // 1️⃣ יש client קיים? בדוק אם הוא מחובר
  if (GlobalClient.client) {
    console.log("📌 Checking existing client...");
    const connected = await isActuallyConnected();
    
    if (connected) {
      console.log("✅ Already connected - returning client");
      return GlobalClient.client;
    }
    
    // 🛡️ אם לא מחובר - אל תמחק אוטומטית!
    // זה יכול להיות timeout זמני או בעיה רשת
    console.log("⚠️  Client exists but connection check failed");
    console.log("💡 Returning existing client - use Reset button if needed");
    
    // נסה לבדוק פעם נוספת עם timeout ארוך יותר
    try {
      const pupPage = (GlobalClient.client as any).pupPage;
      if (pupPage && !pupPage.isClosed()) {
        console.log("🔧 Browser is still open - client might recover");
        return GlobalClient.client;
      }
    } catch (e) {
      console.log("⚠️  Browser check failed");
    }
    
    // רק אם הדפדפן באמת סגור - צור חדש
    console.log("🔄 Browser is closed - creating new client");
    await deleteSession();
  }
  
  // 2️⃣ אין client - צור חדש
  return await createNewClient();
};

// 🔒 מנגנון נעילה
let isInitializing = false;
let initPromise: Promise<{ result: 'ready' | 'qr', qr?: string }> | null = null;

// ========================================
// Initialize - עם Timeout קצר יותר
// ========================================
const Initialize = async (): Promise<{ result: 'ready' | 'qr', qr?: string }> => {
  console.log("\n=== 🚀 Initialize ===");
  
  // בדיקה מהירה אם כבר מחובר
  if (isClientReady) {
    console.log("✅ Quick check: already ready!");
    return { result: 'ready' as const };
  }
  
  // נעילה - אל תאפשר אתחולים מרובים
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
      
      // 2️⃣ יש Session? נסה לטעון (עם timeout קצר!)
      const hasSession = hasSessionFiles();
      
      if (hasSession) {
        console.log("📁 Found session files - trying to load...");
        
        await GetClientOrInitialize();
        
        // חכה רק 20 שניות (לא 60!) - מספיק לרוב המקרים
        console.log("⏳ Waiting up to 20s for session to connect...");
        const startTime = Date.now();
        
        while (Date.now() - startTime < 20000) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const nowConnected = await isActuallyConnected();
          if (nowConnected) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Connected after ${elapsed}s!`);
            return { result: 'ready' as const };
          }
          
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          if (elapsed % 5 === 0) {
            console.log(`⏳ Still waiting... (${elapsed}s)`);
          }
        }
        
        console.log("⏱️  Session load timeout after 20s");
        console.log("🔄 Will delete and create fresh session");
        await deleteSession();
      }
      
      // 3️⃣ אין Session תקין - צור חדש וחכה ל-QR
      console.log("📱 Creating fresh session - waiting for QR...");
      
      // הגדר resolver לפני יצירת Client
      const qrPromise = new Promise<string>((resolve) => {
        qrResolve = resolve;
        console.log("✅ QR resolver ready");
      });
      
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("QR timeout after 30s")), 30000)
      );
      
      // צור Client (יפעיל event 'qr')
      console.log("🔧 Creating client...");
      const createPromise = GetClientOrInitialize();
      
      // המתן ל-QR
      const qr = await Promise.race([qrPromise, timeoutPromise]);
      console.log("✅ QR Code ready!");
      
      // וודא שה-Client נוצר
      await createPromise;
      
      return { result: 'qr' as const, qr };
      
    } catch (err: any) {
      console.error("❌ Failed to initialize:", err.message);
      
      // בדיקה אחרונה - אולי התחבר בינתיים
      if (await isActuallyConnected()) {
        return { result: 'ready' as const };
      }
      
      // אם יש QR שנוצר - החזר אותו
      if (lastQrCode) {
        console.log("💡 Returning last QR code from memory");
        return { result: 'qr' as const, qr: lastQrCode };
      }
      
      throw new Error("Failed to initialize WhatsApp");
      
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();
  
  return initPromise;
};

// ========================================
// פונקציות עזר
// ========================================
export const getConnectionStatus = () => {
  if (isClientReady) return "Connected";
  if (isInitializing) return "Connecting...";
  if (hasSessionFiles()) return "Session exists, not connected";
  return "Not connected";
};

export const getLastQrCode = () => lastQrCode;

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