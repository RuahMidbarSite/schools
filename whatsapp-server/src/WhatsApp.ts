// ====================================
// WhatsApp.ts - פשוט וברור: יש חיבור? לא צריך QR
// ====================================

import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import fs from "fs";

const GlobalClient = global as unknown as { client: Client };

let lastQrCode: string | null = null;
let qrResolve: ((qr: string) => void) | null = null;

// ========================================
// פונקציה פשוטה: האם יש חיבור אמיתי?
// ========================================
const isActuallyConnected = async (): Promise<boolean> => {
  if (!GlobalClient.client) return false;
  
  try {
    const state = await Promise.race([
      GlobalClient.client.getState(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 3000)
      )
    ]);
    
    const connected = state === 'CONNECTED';
    console.log(`🔍 Connection check: ${connected} (state: ${state})`);
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
    const hasFiles = files.length > 5; // לפחות כמה קבצים חשובים
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
  
  lastQrCode = null;
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
  // EVENT: QR - פשוט שומר ומחזיר
  // ========================================
  client.on("qr", (qr) => {
    console.log("\n📱 QR Code generated");
    console.log("⏰ Time:", new Date().toISOString());
    lastQrCode = qr;
    
    // 🔥 FIX: תמיד resolve את ה-QR מיד
    if (qrResolve) {
      console.log("✅ Resolving QR promise");
      qrResolve(qr);
      qrResolve = null;
    } else {
      console.log("⚠️  QR generated but no resolver waiting");
    }
  });
  
  // ========================================
  // EVENT: Authenticated
  // ========================================
  client.on("authenticated", () => {
    console.log("\n✅ Authenticated!");
    console.log("⏰ Time:", new Date().toISOString());
  });
  
  // ========================================
  // EVENT: Ready
  // ========================================
  client.on("ready", () => {
    console.log("\n✅ WhatsApp Client Ready!");
    console.log("⏰ Time:", new Date().toISOString());
  });
  
  // ========================================
  // EVENT: State Change
  // ========================================
  client.on("change_state", (state) => {
    console.log(`🔄 State changed: ${state}`);
  });
  
  // ========================================
  // EVENT: Auth Failure - מחק Session פגום
  // ========================================
  client.on("auth_failure", async (msg) => {
    console.log("\n❌ Auth failure:", msg);
    await deleteSession();
  });
  
  // ========================================
  // EVENT: Disconnected - מחק Session אם LOGOUT
  // ========================================
  client.on("disconnected", async (reason) => {
    console.log("\n❌ Disconnected:", reason);
    
    const reasonStr = String(reason);
    if (reasonStr === 'LOGOUT' || reasonStr.includes('NAVIGATION')) {
      console.log("🗑️  Logout detected - deleting session");
      await deleteSession();
    }
  });
  
  console.log("🚀 Initializing client...");
  await client.initialize();
  
  GlobalClient.client = client;
  console.log("✅ Client initialized");
  
  return client;
};

// ========================================
// הפונקציה הראשית - הלוגיקה הפשוטה!
// ========================================
const GetClientOrInitialize = async () => {
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
    
    console.log("❌ Client exists but not connected - will recreate");
    await deleteSession();
  }
  
  // 2️⃣ אין client - צור חדש
  return await createNewClient();
};

// 🔥 מנגנון נעילה למניעת קריאות מרובות
let isInitializing = false;
let initPromise: Promise<{ result: 'ready' | 'qr', qr?: string }> | null = null;

// ========================================
// Initialize - הלוגיקה הפשוטה!
// ========================================
const Initialize = async (): Promise<{ result: 'ready' | 'qr', qr?: string }> => {
  console.log("\n=== 🚀 Initialize ===");
  
  // 🔒 אם כבר מאתחלים - חכה לתהליך הקיים
  if (isInitializing && initPromise) {
    console.log("⏳ Already initializing - waiting for existing process...");
    return initPromise;
  }
  
  // 🔒 נעל את התהליך
  isInitializing = true;
  
  initPromise = (async () => {
    try {
      // 1️⃣ בדוק אם כבר מחובר
      const connected = await isActuallyConnected();
      if (connected) {
        console.log("✅ Already connected!");
        return { result: 'ready' as const };
      }
      
      // 2️⃣ יש Session בקבצים? נסה להשתמש בו
      const hasSession = hasSessionFiles();
      
      if (hasSession) {
        console.log("📁 Found session files - trying to load...");
        
        // צור client שיטען את ה-Session
        await GetClientOrInitialize();
        
        // חכה עד 15 שניות בלבד לחיבור (לא 45!)
        console.log("⏳ Waiting up to 15s for session to connect...");
        const startTime = Date.now();
        
        while (Date.now() - startTime < 15000) { // 🔥 שינוי מ-45 ל-15 שניות
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const nowConnected = await isActuallyConnected();
          if (nowConnected) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Connected after ${elapsed}s!`);
            return { result: 'ready' as const };
          }
          
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          if (elapsed % 5 === 0) { // 🔥 לוג כל 5 שניות במקום 10
            console.log(`⏳ Still waiting... (${elapsed}s)`);
          }
        }
        
        console.log("⏱️  Session load timeout after 15s - deleting and creating fresh");
        await deleteSession();
      }
      
      // 3️⃣ אין Session תקין - צור חדש וחכה ל-QR
      console.log("📱 Creating fresh session - waiting for QR...");
      
      // 🔥 FIX: הגדר את qrResolve **לפני** יצירת Client!
      const qrPromise = new Promise<string>((resolve) => {
        qrResolve = resolve;
        console.log("✅ QR resolver ready - waiting for QR event...");
      });
      
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("QR timeout")), 30000)
      );
      
      // עכשיו צור את ה-Client (הוא יפעיל את ה-event 'qr')
      console.log("🔧 Creating client (this will trigger QR event)...");
      const createPromise = GetClientOrInitialize();
      
      // המתן ל-QR או timeout
      const qr = await Promise.race([qrPromise, timeoutPromise]);
      console.log("✅ QR Code ready!");
      
      // וודא שה-Client גם נוצר
      await createPromise;
      
      return { result: 'qr' as const, qr };
      
    } catch (err: any) {
      console.error("❌ Failed to initialize:", err.message);
      
      // אולי בינתיים התחבר?
      const connected = await isActuallyConnected();
      if (connected) {
        return { result: 'ready' as const };
      }
      
      throw new Error("Failed to initialize WhatsApp");
      
    } finally {
      // 🔓 שחרר את הנעילה
      isInitializing = false;
      initPromise = null;
    }
  })();
  
  return initPromise;
};

// ========================================
// Export הפונקציות
// ========================================
export {
  GetClientOrInitialize,
  Initialize,
  isActuallyConnected as isReady,
  hasSessionFiles as hasStoredSession,
  deleteSession as resetClient
};