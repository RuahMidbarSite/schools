// ====================================
// WhatsApp.ts - תיקון מלא עם זיהוי Session פגום
// ====================================

import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import fs from "fs";

const GlobalClient = global as unknown as { client: Client };

let isClientReady = false;
let isInitializing = false;
let hasSession = false;
let lastQrCode: string | null = null;
let isFullyReady = false;

// 🔥 NEW: מונה QR - אם יש יותר מדי, Session פגום
let qrCount = 0;
let firstQrTime: number | null = null;
let sessionDeletedThisRun = false; // מונע מחיקה כפולה

let resolveReady: ((value: boolean) => void) | null = null;
let resolveQr: ((qr: string) => void) | null = null;
let resolveAuthenticated: ((value: boolean) => void) | null = null;

let readyPromise: Promise<boolean>;
let qrPromise: Promise<string>;
let authenticatedPromise: Promise<boolean>;

const resetPromises = () => {
  console.log("📄 Resetting promises...");
  readyPromise = new Promise((resolve) => { resolveReady = resolve; });
  qrPromise = new Promise((resolve) => { resolveQr = resolve; });
  authenticatedPromise = new Promise((resolve) => { resolveAuthenticated = resolve; });
  console.log("✅ Promises reset complete");
};

resetPromises();

// 🔥 פונקציה למחיקת Session פגום - עם טיפול ב-Windows permissions
const deleteCorruptedSession = async (): Promise<boolean> => {
  if (sessionDeletedThisRun) {
    console.log("⚠️ Session already deleted in this run, skipping");
    return false;
  }

  console.log("\n🗑️ DELETING CORRUPTED SESSION...");
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  
  try {
    // שלב 1: הרוג את ה-Client
    if (GlobalClient.client) {
      try {
        console.log("🔪 Destroying client...");
        await GlobalClient.client.destroy();
        console.log("✅ Client destroyed");
      } catch (err) {
        console.log("⚠️ Error destroying client:", err);
      }
      GlobalClient.client = undefined as any;
    }

    // שלב 2: המתן ל-Puppeteer לשחרר את הקבצים (קריטי ב-Windows!)
    console.log("⏳ Waiting 3 seconds for file handles to release...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // שלב 3: מחק את התיקייה עם Retry
    if (fs.existsSync(dataPath)) {
      let deleted = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!deleted && attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`🗑️ Deletion attempt ${attempts}/${maxAttempts}...`);
          fs.rmSync(dataPath, { recursive: true, force: true });
          deleted = true;
          console.log("✅ Session directory deleted!");
        } catch (err: any) {
          if (err.code === 'EPERM' && attempts < maxAttempts) {
            console.log(`⚠️ Permission denied, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw err;
          }
        }
      }
      
      if (!deleted) {
        console.error("❌ Failed to delete session after 5 attempts");
        console.log("⚠️ MANUAL ACTION REQUIRED:");
        console.log(`   1. Stop the server (Ctrl+C)`);
        console.log(`   2. Delete: ${dataPath}`);
        console.log(`   3. Restart the server`);
        return false;
      }
    }
    
    hasSession = false;
    qrCount = 0;
    firstQrTime = null;
    sessionDeletedThisRun = true;
    isClientReady = false;
    isInitializing = false;
    isFullyReady = false;
    
    console.log("✅ Session cleanup complete!");
    return true;
  } catch (err) {
    console.error("❌ Error deleting session:", err);
    console.log("\n⚠️ MANUAL ACTION REQUIRED:");
    console.log(`   1. Stop the server (Ctrl+C)`);
    console.log(`   2. Delete: ${dataPath}`);
    console.log(`   3. Restart the server`);
    return false;
  }
};

const GetClientOrInitialize = async () => {
  console.log("\n=== 🚀 GetClientOrInitialize Called ===");
  console.log("⏰ Time:", new Date().toISOString());
  
  // אם Client קיים, בדוק אם הוא עובד
  if (GlobalClient.client) {
    console.log("♻️ Client exists - checking state...");
    
    try {
      const statePromise = GlobalClient.client.getState();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("State check timeout")), 5000)
      );
      
      const state = await Promise.race([statePromise, timeoutPromise]) as string;
      console.log("📊 State:", state);
      
      if (state === 'CONNECTED') {
        console.log("✅ Client connected!");
        return GlobalClient.client;
      }
      
      console.log("⚠️ Client not connected - resetting");
      await resetClient();
      
    } catch (err: any) {
      console.log("⚠️ Error checking state:", err.message);
      await resetClient();
    }
  }
  
  // אם מאתחל, המתן
  if (isInitializing) {
    console.log("⏳ Initializing, waiting...");
    let attempts = 0;
    while (isInitializing && attempts < 120) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      if (attempts % 10 === 0) console.log(`⏳ ${attempts}s...`);
    }
    if (isClientReady && GlobalClient.client) return GlobalClient.client;
  }

  console.log("🆕 Creating new WhatsApp client...");
  isInitializing = true;
  isFullyReady = false;
  qrCount = 0;
  firstQrTime = null;
  
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  console.log("📁 Data path:", dataPath);
  
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  const sessionPath = path.join(dataPath, 'session-1');
  const hasExistingSession = fs.existsSync(sessionPath);
  console.log(`📂 Existing session: ${hasExistingSession}`);
  hasSession = hasExistingSession;
  
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

  resetPromises();

  // ========================================
  // 🔥 EVENT: QR Code - זיהוי Session פגום
  // ========================================
  client.on("qr", async (qr) => {
    qrCount++;
    const now = Date.now();
    
    if (qrCount === 1) {
      firstQrTime = now;
      console.log("\n📱 QR Code received (#1)");
    } else {
      const timeSinceFirst = (now - (firstQrTime || now)) / 1000;
      console.log(`\n📱 QR Code received (#${qrCount}) - ${timeSinceFirst.toFixed(1)}s since first`);
    }
    
    console.log("⏰ Time:", new Date().toISOString());
    lastQrCode = qr;
    
    // 🔥 אם יש Session אבל עדיין מקבלים QR - Session פגום!
    if (hasSession && qrCount === 1) {
      console.log("⚠️ WARNING: Session exists but got QR - SESSION IS CORRUPTED!");
      console.log("🗑️ Attempting to delete corrupted session...");
      
      // הרס את ה-Client קודם
      try {
        await client.destroy();
        console.log("✅ Client destroyed before deletion");
      } catch (err) {
        console.log("⚠️ Error destroying client:", err);
      }
      
      const deleted = await deleteCorruptedSession();
      
      if (!deleted) {
        console.log("❌ COULD NOT DELETE SESSION AUTOMATICALLY");
        console.log("⚠️ Please manually delete the WhatsAppData folder and restart");
        isInitializing = false;
        return;
      }
      
      // אם נמחק בהצלחה - אל תנסה לאתחל מחדש אוטומטית
      // תן למשתמש לראות את ההודעה ולהפעיל מחדש
      console.log("✅ Session deleted successfully!");
      console.log("🔄 Please restart the server for a clean start");
      isInitializing = false;
      return;
    }
    
    // 🔥 אם קיבלנו 3+ QR בתוך דקה - משהו לא בסדר
    if (qrCount >= 3 && firstQrTime && (now - firstQrTime) < 60000) {
      console.log("🚨 ERROR: Got 3+ QR codes within 1 minute!");
      console.log("🗑️ This indicates a problem - deleting session...");
      
      await deleteCorruptedSession();
      
      console.log("🔄 Please restart the server manually");
      return;
    }
    
    hasSession = false;
    isFullyReady = false;
    
    authenticatedPromise = new Promise((resolve) => {
      resolveAuthenticated = resolve;
    });
    
    if (resolveQr) {
      resolveQr(qr);
      console.log("✅ QR promise resolved");
    }
  });

  // ========================================
  // EVENT: Authenticated
  // ========================================
  client.on("authenticated", () => {
    console.log("\n🔓 Authenticated!");
    console.log("⏰ Time:", new Date().toISOString());
    hasSession = true;
    qrCount = 0; // איפוס מונה
    sessionDeletedThisRun = false; // איפוס דגל
    
    if (resolveAuthenticated) {
      resolveAuthenticated(true);
      console.log("✅ Authenticated promise resolved");
    }
    
    setTimeout(() => {
      if (!isClientReady) {
        console.log("⚡ Marking as ready");
        isClientReady = true;
        isInitializing = false;
        if (resolveReady) resolveReady(true);
      }
      
      setTimeout(() => {
        isFullyReady = true;
        console.log("🎯 FULLY READY!");
      }, 5000);
      
    }, 15000);
  });

  // ========================================
  // EVENT: Ready
  // ========================================
  client.on("ready", () => {
    console.log("\n✅ WhatsApp READY!");
    console.log("⏰ Time:", new Date().toISOString());
    isClientReady = true;
    isInitializing = false;
    hasSession = true;
    qrCount = 0;
    sessionDeletedThisRun = false;
    
    if (resolveReady) {
      resolveReady(true);
    }
    
    setTimeout(() => {
      isFullyReady = true;
      console.log("🎯 FULLY READY!");
    }, 3000);
  });

  // ========================================
  // EVENT: State Change
  // ========================================
  client.on("change_state", (state) => {
    console.log("🔄 State:", state, "| Time:", new Date().toISOString());
    
    if (state === 'CONNECTED') {
      isClientReady = true;
      isInitializing = false;
      hasSession = true;
      
      if (resolveReady) resolveReady(true);
      
      setTimeout(() => {
        isFullyReady = true;
        console.log("🎯 FULLY READY!");
      }, 3000);
    }
    
    if (state === 'CONFLICT' || state === 'UNPAIRED') {
      console.log("⚠️ Conflict/Unpaired - resetting");
      resetClient();
    }
  });

  // ========================================
  // EVENT: Auth Failure
  // ========================================
  client.on("auth_failure", async (msg) => {
    console.log("\n❌ Auth failure:", msg);
    console.log("⏰ Time:", new Date().toISOString());
    
    // Session פגום - מחק אותו
    await deleteCorruptedSession();
    
    hasSession = false;
    isClientReady = false;
    isInitializing = false;
    isFullyReady = false;
    resetPromises();
  });

  // ========================================
  // EVENT: Disconnected
  // ========================================
  client.on("disconnected", (reason) => {
    console.log("\n🔌 Disconnected:", reason);
    console.log("⏰ Time:", new Date().toISOString());
    isClientReady = false;
    isInitializing = false;
    hasSession = false;
    isFullyReady = false;
    qrCount = 0;
    resetPromises();
  });

  console.log("🚀 Initializing...");
  await client.initialize();
  GlobalClient.client = client;
  console.log("✅ Initialization started");
  
  return client;
};

const isReady = () => {
  const ready = isClientReady && isFullyReady && GlobalClient.client !== undefined;
  console.log(`🔍 isReady: ${ready} (clientReady: ${isClientReady}, fullyReady: ${isFullyReady}, exists: ${GlobalClient.client !== undefined})`);
  return ready;
};

const hasStoredSession = () => hasSession;
const getLastQr = () => lastQrCode;

const resetClient = async () => {
  console.log("\n🔄 Resetting client...");
  
  if (GlobalClient.client) {
    try {
      await GlobalClient.client.destroy();
      console.log("✅ Client destroyed");
    } catch (err) {
      console.error("❌ Error:", err);
    }
  }
  
  isClientReady = false;
  isInitializing = false;
  hasSession = false;
  lastQrCode = null;
  isFullyReady = false;
  qrCount = 0;
  firstQrTime = null;
  resetPromises();
  
  console.log("✅ Reset complete");
};

export {
  GetClientOrInitialize,
  qrPromise as QrPromise,
  readyPromise,
  authenticatedPromise,
  isReady,
  hasStoredSession,
  getLastQr,
  resetClient,
  resetPromises
};