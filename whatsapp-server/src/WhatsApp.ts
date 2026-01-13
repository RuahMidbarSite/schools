import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import fs from "fs";

// Singleton object
const GlobalClient = global as unknown as { client: Client };

// State tracking
let isClientReady = false;
let isInitializing = false;
let hasSession = false;
let lastQrCode: string | null = null;
let isFullyReady = false; // 🔥 NEW: Track if client is FULLY ready to send

// Promise resolvers
let resolveReady: ((value: boolean) => void) | null = null;
let resolveQr: ((qr: string) => void) | null = null;
let resolveAuthenticated: ((value: boolean) => void) | null = null;

// Promises
let readyPromise: Promise<boolean>;
let qrPromise: Promise<string>;
let authenticatedPromise: Promise<boolean>;

// Initialize promises
const resetPromises = () => {
  console.log("📄 Resetting promises...");
  
  readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
  
  qrPromise = new Promise((resolve) => {
    resolveQr = resolve;
  });
  
  authenticatedPromise = new Promise((resolve) => {
    resolveAuthenticated = resolve;
  });
  
  console.log("✅ Promises reset complete");
};

resetPromises();

const GetClientOrInitialize = async () => {
  console.log("\n=== 🚀 GetClientOrInitialize Called ===");
  console.log("⏰ Time:", new Date().toISOString());
  
 // ✅ תיקון 1: בדוק אם Client כבר קיים - תמיד החזר אותו!
  if (GlobalClient.client) {
    console.log("♻️ Client already exists - reusing it");
    console.log("🔍 isClientReady:", isClientReady);
    console.log("🔍 isFullyReady:", isFullyReady);
    return GlobalClient.client;
  }
  
  // If initializing, wait
  if (isInitializing) {
    console.log("⏳ Client is initializing, waiting...");
    let attempts = 0;
    while (isInitializing && attempts < 120) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`⏳ Still waiting... ${attempts} seconds`);
      }
    }
    if (isClientReady && GlobalClient.client) {
      console.log("✅ Client ready after waiting");
      return GlobalClient.client;
    }
  }
  
  // If client exists but not ready, wait for ready
  if (GlobalClient.client && !isClientReady) {
    console.log("⏳ Client exists but not ready, waiting...");
    try {
      await Promise.race([
        readyPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout waiting for ready")), 120000)
        )
      ]);
      console.log("✅ Client is now ready!");
      return GlobalClient.client;
    } catch (err) {
      console.log("⚠️ Timeout waiting for client ready");
      return GlobalClient.client;
    }
  }

  console.log("🆕 Creating new WhatsApp client...");
  isInitializing = true;
  isFullyReady = false;
  
  // Setup data path
  const dataPath = path.join(process.cwd(), 'WhatsAppData');
  console.log("📁 WhatsApp data path:", dataPath);
  
  if (!fs.existsSync(dataPath)) {
    console.log("📂 Creating WhatsAppData directory...");
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  // Check for existing session
  const sessionPath = path.join(dataPath, 'session-1');
  const hasExistingSession = fs.existsSync(sessionPath);
  console.log(`🔍 Session path: ${sessionPath}`);
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

  // Reset promises before setting up listeners
  resetPromises();

  // ✅ Event: QR Code received
  client.on("qr", (qr) => {
    console.log("\n📱 QR Code received");
    console.log("⏰ Time:", new Date().toISOString());
    lastQrCode = qr;
    hasSession = false;
    isFullyReady = false;
    
    // Reset authenticated promise for new QR
    authenticatedPromise = new Promise((resolve) => {
      resolveAuthenticated = resolve;
    });
    
    if (resolveQr) {
      resolveQr(qr);
      console.log("✅ QR promise resolved");
    }
  });

  // ✅ Event: Authenticated (QR was scanned)
  client.on("authenticated", () => {
    console.log("\n🔐 Client authenticated!");
    console.log("⏰ Time:", new Date().toISOString());
    hasSession = true;
    
    if (resolveAuthenticated) {
      resolveAuthenticated(true);
      console.log("✅ Authenticated promise resolved");
    }
    
    // 🔥 FIX: אחרי authenticated, ממתינים זמן ארוך יותר - 25 שניות
    console.log("⏳ Starting 25 second grace period after authentication...");
    setTimeout(() => {
      if (!isClientReady) {
        console.log("⚡ Grace period complete - marking client as ready");
        isClientReady = true;
        isInitializing = false;
        if (resolveReady) {
          resolveReady(true);
          console.log("✅ Ready promise resolved (from grace period)");
        }
      }
      
      // 🔥 NEW: Wait extra time before marking as FULLY ready for sending
      console.log("⏳ Waiting additional 10 seconds for full sync...");
      setTimeout(() => {
        isFullyReady = true;
        console.log("🎯 Client is now FULLY READY for sending messages!");
      }, 10000); // Extra 10 seconds
      
    }, 25000); // 25 seconds
  });

  // ✅ Event: Ready (fully connected)
  client.on("ready", () => {
    console.log("\n✅ WhatsApp Client is READY!");
    console.log("⏰ Time:", new Date().toISOString());
    isClientReady = true;
    isInitializing = false;
    hasSession = true;
    
    if (resolveReady) {
      resolveReady(true);
      console.log("✅ Ready promise resolved");
    }
    
    // 🔥 NEW: Mark as fully ready after a delay
    console.log("⏳ Waiting 5 seconds for full sync...");
    setTimeout(() => {
      isFullyReady = true;
      console.log("🎯 Client is now FULLY READY for sending messages!");
    }, 5000);
  });

  // ✅ Event: State change
  client.on("change_state", (state) => {
    console.log("🔄 State changed:", state);
    console.log("⏰ Time:", new Date().toISOString());
    
    if (state === 'CONNECTED') {
      console.log("✅ WhatsApp CONNECTED!");
      isClientReady = true;
      isInitializing = false;
      hasSession = true;
      
      if (resolveReady) {
        resolveReady(true);
        console.log("✅ Ready promise resolved (from CONNECTED)");
      }
      
      // Mark as fully ready after delay
      setTimeout(() => {
        isFullyReady = true;
        console.log("🎯 Client is now FULLY READY for sending messages!");
      }, 5000);
    }
  });

  // ✅ Event: Auth failure
  client.on("auth_failure", (msg) => {
    console.log("\n❌ Authentication failure:", msg);
    console.log("⏰ Time:", new Date().toISOString());
    hasSession = false;
    isClientReady = false;
    isInitializing = false;
    isFullyReady = false;
    resetPromises();
  });

  // ✅ Event: Disconnected
  client.on("disconnected", (reason) => {
    console.log("\n🔌 Client disconnected:", reason);
    console.log("⏰ Time:", new Date().toISOString());
    isClientReady = false;
    isInitializing = false;
    hasSession = false;
    isFullyReady = false;
    resetPromises();
  });

  // ✅ Event: Loading screen
  client.on("loading_screen", (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
  });

  // ✅ Event: Session saved
  client.on("remote_session_saved", () => {
    console.log("💾 Session saved to disk");
    console.log("⏰ Time:", new Date().toISOString());
  });

  console.log("🚀 Initializing WhatsApp client...");
  console.log("⏰ Time:", new Date().toISOString());
  
  await client.initialize();
  GlobalClient.client = client;
  
  console.log("✅ Client initialization started");
  
  return client;
};

// Check if client is ready
const isReady = () => {
  const ready = isClientReady && isFullyReady && GlobalClient.client !== undefined;
  console.log(`🔍 isReady: ${ready} (clientReady: ${isClientReady}, fullyReady: ${isFullyReady}, exists: ${GlobalClient.client !== undefined})`);
  return ready;
};

// Check if there's a stored session
const hasStoredSession = () => {
  console.log(`🔍 hasStoredSession: ${hasSession}`);
  return hasSession;
};

// Get last QR code
const getLastQr = () => {
  return lastQrCode;
};

// Reset client
const resetClient = async () => {
  console.log("\n🔄 Resetting client...");
  console.log("⏰ Time:", new Date().toISOString());
  
  if (GlobalClient.client) {
    try {
      await GlobalClient.client.destroy();
      console.log("✅ Client destroyed");
    } catch (err) {
      console.error("❌ Error destroying client:", err);
    }
  }
  
  isClientReady = false;
  isInitializing = false;
  hasSession = false;
  lastQrCode = null;
  isFullyReady = false;
  resetPromises();
  
  console.log("✅ Client reset complete");
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