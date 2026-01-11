import { Client, LocalAuth, NoAuth } from "whatsapp-web.js";
import path from "path";

// Singleton object, should only be instantiated once.
const GlobalClient = global as unknown as { client: Client };

let readyPromise: Promise<any>;
let QrPromise: Promise<any>;
let MessagePromise: Promise<any>;
let remote_sessionPromise: Promise<any>;

let resolveReady: ((arg0: {result:string, data?:string}) => void) | null = null;
let resolveQr: ((arg0: { result: string; data: string; }) => void) | null = null;
let resolveMessage: ((arg0:any) => void) | null = null;
let resolve_remote_session: ((arg0: { message: string; status:'received' }) => void) | null = null;

// Track client state
let isClientReady = false;
let isInitializing = false;
let hasSession = false;

const GetClientOrInitialize = async () => {
  // If client exists and is ready, return it immediately
  if (GlobalClient.client && isClientReady) {
    console.log("Client already exists and is ready");
    return GlobalClient.client;
  }
  
  // If client is initializing, wait for it
  if (isInitializing) {
    console.log("Client is initializing, waiting...");
    while (isInitializing && !isClientReady) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (isClientReady && GlobalClient.client) {
      console.log("Client ready after waiting");
      return GlobalClient.client;
    }
  }
  
  // If client exists but not ready yet, wait for it
  if (GlobalClient.client && !isClientReady) {
    console.log("Client exists but still initializing, waiting for ready...");
    try {
      await Promise.race([
        readyPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 45000))
      ]);
      console.log("Client is now ready!");
      return GlobalClient.client;
    } catch (err) {
      console.log("Timeout waiting for client, continuing...");
      return GlobalClient.client;
    }
  }

  console.log("Creating new WhatsApp client...");
  isInitializing = true;
  
  const dataPath = path.join(__dirname, '..', 'WhatsAppData');
  console.log("WhatsApp data path:", dataPath);
  
  var client = new Client({
    authStrategy: new LocalAuth({
      dataPath: dataPath,
      clientId:'1'
    }),
    webVersion: "2.3000.1015910634-alpha", 
    webVersionCache: {
      remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015910634-alpha.html",
      type: "remote",
    },
  });

  // Initialize promises
  readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
  QrPromise = new Promise((resolve) => {
    resolveQr = resolve;
  });
  MessagePromise = new Promise((resolve) => {
    resolveMessage = resolve;
  });
  remote_sessionPromise = new Promise((resolve) => {
    resolve_remote_session = resolve;
  });

  // Handle authentication - This happens when there is a saved session
  client.on("authenticated", () => {
    console.log("Client authenticated - session loaded!");
    hasSession = true;
    // Don't mark as ready here, wait for "ready" event
  });

  client.on("ready", () => {
    console.log("WhatsApp Client is ready");
    isClientReady = true;
    isInitializing = false;
    if (resolveReady) {
      resolveReady({result:"ready"});
    }
  });

  client.on("message", (message:any) => {
    console.log("Message received:", message.body);
    if (resolveMessage) {
      resolveMessage({message:message.body, status:'received'})
    }
  });

  client.on("qr", (qr) => {
    console.log("QR Code received");
    if (resolveQr) {
      resolveQr({ result: "QR Code received", data: qr });
    }
  });

  client.on("remote_session_saved", () => {
    console.log("Remote session saved");
    hasSession = true;
    if (resolve_remote_session) {
      resolve_remote_session({message:"Remote session saved", status:'received'});
    }
  });

  // Handle disconnection
  client.on("disconnected", (reason) => {
    console.log("Client disconnected:", reason);
    isClientReady = false;
    isInitializing = false;
    hasSession = false;
  });

  // Handle loading screen
  client.on("loading_screen", (percent, message) => {
    console.log(`Loading: ${percent}% - ${message}`);
  });

  client.on("auth_failure", (msg) => {
    console.log("Authentication failure:", msg);
    hasSession = false;
  });

  client.on("change_state", (state) => {
    console.log("State changed:", state);
  });

  console.log("Initializing WhatsApp client...");
  await client.initialize();
  GlobalClient.client = client;
  
  console.log("Client initialization started");
  
  isInitializing = false;
  return client;
}

// Check if client is ready
const isReady = () => {
  return isClientReady && GlobalClient.client !== undefined;
}

// Check if there is a stored session
const hasStoredSession = () => {
  return hasSession;
}

export {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  remote_sessionPromise,
  MessagePromise,
  isReady,
  hasStoredSession,
};