import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Client, MessageMedia } from "whatsapp-web.js";
import {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  authenticatedPromise,
  isReady,
  hasStoredSession,
  getLastQr
} from "./WhatsApp";
import multer from "multer";
import path from "path";
import mime from "mime";
import chardet from "chardet";
import fs from "fs";

dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3994;

// CORS
app.use(cors({
  origin: ['http://localhost:3666', 'http://localhost:3000', 'http://127.0.0.1:3666'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());
app.use(express.json());

// Upload directory setup
const uploadDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const PatternID = req.params.id;
    cb(null, file.fieldname + "-" + PatternID + path.extname(file.originalname));
  },
});

const MemoryWithNoStoring = multer({ storage: memoryStorage });
const MemoryWithStoring = multer({ storage: diskStorage });

const createMulterFileObject = (filePath: string) => {
  const stats = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);
  return {
    fieldname: "file",
    originalname: path.basename(filePath),
    encoding: chardet.detect(buffer),
    mimetype: mime.lookup(filePath),
    buffer: buffer,
    size: stats.size,
    destination: path.dirname(filePath),
    filename: path.basename(filePath),
    path: filePath,
  };
};

app.get("/", (req: Request, res: Response) => {
  res.send("WhatsApp Server is Running");
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "WhatsApp Server is running" });
});

// ✅ Initialize endpoint - מחזיר QR או ready
app.get("/Initialize", async (req: Request, res: Response) => {
  console.log("\n=== 📡 /Initialize Called ===");
  console.log("⏰ Time:", new Date().toISOString());
  
  try {
    // Check if already ready
    if (isReady()) {
      console.log("✅ Already ready (stored session)");
      return res.status(200).json({ result: 'ready' });
    }
    
    console.log("🔧 Initializing client...");
    const client = await GetClientOrInitialize();
    
    console.log("⏳ Waiting for ready or QR (up to 30 seconds)...");
    
    // Wait for either ready or QR
    const result: any = await Promise.race([
      readyPromise.then(() => ({ type: 'ready' })),
      authenticatedPromise.then(() => ({ type: 'authenticated' })),
      QrPromise.then((qr: string) => ({ type: 'qr', qr })),
      new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 30000))
    ]);
    
    console.log("🎯 Result:", result.type);
    console.log("⏰ Time:", new Date().toISOString());
    
    if (result.type === 'ready') {
      console.log("✅ Client is ready");
      return res.status(200).json({ result: 'ready' });
    }
    
    if (result.type === 'authenticated') {
      console.log("✅ Client authenticated");
      // Wait a bit more for ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      return res.status(200).json({ result: 'ready' });
    }
    
    if (result.type === 'qr') {
      console.log("📱 Returning QR code");
      return res.status(200).json({ 
        result: 'qr', 
        data: result.qr 
      });
    }
    
    // Timeout - check current state
    console.log("⏰ Timeout - checking state...");
    if (isReady()) {
      return res.status(200).json({ result: 'ready' });
    }
    
    // Maybe QR was generated during timeout
    const lastQr = getLastQr();
    if (lastQr) {
      console.log("📱 Returning last QR from timeout");
      return res.status(200).json({ 
        result: 'qr', 
        data: lastQr 
      });
    }
    
    return res.status(408).json({ 
      status: "Timeout", 
      message: "Failed to initialize within 30 seconds" 
    });
    
  } catch (err) {
    console.error("❌ Error in /Initialize:", err);
    return res.status(500).json({ 
      status: "Error", 
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// ✅ WaitQr - ממתין לסריקת QR
app.get("/WaitQr", async (req: Request, res: Response) => {
  console.log("\n=== 📱 /WaitQr Called ===");
  console.log("⏰ Time:", new Date().toISOString());
  
  try {
    console.log("⏳ Waiting for QR scan (up to 3 minutes)...");
    
    const result = await Promise.race([
      authenticatedPromise.then(() => ({ status: 'authenticated' })),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("QR scan timeout")), 180000) // 3 minutes
      )
    ]);
    
    console.log("✅ QR scanned!");
    console.log("⏰ Time:", new Date().toISOString());
    
    // Wait for ready state
    console.log("⏳ Waiting for ready state (up to 10 seconds)...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const clientReady = isReady();
    console.log(`🔍 Client ready: ${clientReady}`);
    
    if (!clientReady) {
      console.log("⏳ Waiting additional 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return res.status(200).json({ 
      ...(result as object),
      clientReady: isReady(),
      message: "QR scanned successfully"
    });
    
  } catch (err) {
    console.error("❌ Error in /WaitQr:", err);
    console.log("⏰ Time:", new Date().toISOString());
    
    if (err instanceof Error && err.message.includes("timeout")) {
      return res.status(408).json({ 
        status: "Timeout", 
        message: "QR code was not scanned within 3 minutes"
      });
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// ✅ SendMessage endpoint
app.post(
  "/SendMessage",
  MemoryWithNoStoring.single("file"),
  async (req: Request, res: Response) => {
    console.log("\n=== 📨 /SendMessage Called ===");
    console.log("⏰ Time:", new Date().toISOString());
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
    console.log("📎 File:", req.file ? req.file.originalname : "No file");
    
    try {
      console.log("🔌 Getting client...");
      const client: Client = await GetClientOrInitialize();
      
      console.log("⏳ Waiting for client to be ready (up to 60 seconds)...");
      let waitCount = 0;
      while (!isReady() && waitCount < 120) { // 60 seconds
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
        if (waitCount % 20 === 0) {
          console.log(`⏳ Still waiting... (${waitCount * 0.5} seconds)`);
        }
      }
      
      if (!isReady()) {
        console.log("❌ Client not ready after 60 seconds");
        return res.status(401).json({ 
          status: "Error", 
          message: "WhatsApp not authenticated. Please scan QR code first.",
        });
      }
      
     
      console.log("✅ Client is ready!");

      // ✅ תיקון 2: המתנה נוספת לסנכרון מלא
      console.log("⏳ Waiting additional 30 seconds for full WhatsApp sync...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log("✅ Sync complete!");


      const requestBody: {
        PhoneNumber: string;
        Message_1: string | undefined;
        Message_2: string | undefined;
        PatternID: string | undefined;
      } = req.body;
      
      const phoneNumber = requestBody.PhoneNumber;
console.log("📞 Target:", phoneNumber);

// ✅ תיקון: צור/מצא את הצ'אט לפני שליחה
let actualPhoneNumber = phoneNumber; // ← משתנה חדש שניתן לשנות
try {
  console.log("🔍 Getting chat...");
  const numberId = await client.getNumberId(phoneNumber.replace('@c.us', ''));
  
  if (!numberId) {
    console.log("❌ Number not found on WhatsApp!");
    return res.status(404).json({ 
      status: "Error", 
      message: `Number ${phoneNumber} is not registered on WhatsApp`
    });
  }
  
  console.log("✅ Number found:", numberId._serialized);
  actualPhoneNumber = numberId._serialized; // ← משתמש במשתנה החדש
  
} catch (err) {
  console.log("⚠️ Error checking number:", err);
}

const promises: Promise<any>[] = [];
      
      // Handle pattern file
      if (requestBody.PatternID && !req.file) {
        console.log("🔍 Looking for pattern file:", requestBody.PatternID);
        const files = fs.readdirSync(uploadDirectory);
        const found_file = files.find((val) =>
          val.startsWith(`file-${requestBody.PatternID}`)
        );
        
        if (found_file) {
          console.log("✅ Found pattern file:", found_file);
          const filePath = path.join(uploadDirectory, found_file);
          const multerFile = await createMulterFileObject(filePath);
          
          const media = new MessageMedia(
            multerFile.mimetype,
            multerFile.buffer.toString("base64"),
            multerFile.originalname,
            multerFile.size
          );
          
          console.log("📤 Sending pattern file...");
          promises.push(client.sendMessage(phoneNumber, media));
        }
      }

      // Handle uploaded file
      if (req.file) {
        console.log("📎 Processing uploaded file:", req.file.originalname);
        const media = new MessageMedia(
          req.file.mimetype,
          req.file.buffer.toString("base64"),
          req.file.originalname,
          req.file.size
        );
        
        console.log("📤 Sending uploaded file...");
        promises.push(client.sendMessage(phoneNumber, media));
      }

     // Handle Message_1
if (requestBody.Message_1) {
  console.log("💬 Sending Message_1...");
  
  // ✅ שיטה חלופית - יצירת צ'אט ושליחה ישירות
  try {
    const chat = await client.getChatById(actualPhoneNumber || phoneNumber);
    promises.push(chat.sendMessage(requestBody.Message_1));
  } catch (err) {
    console.log("⚠️ Fallback to direct send");
    promises.push(client.sendMessage(phoneNumber, requestBody.Message_1));
  }
}
      
      // Handle Message_2
if (requestBody.Message_2) {
  console.log("💬 Sending Message_2...");
  
  try {
    const chat = await client.getChatById(actualPhoneNumber || phoneNumber);
    promises.push(chat.sendMessage(requestBody.Message_2));
  } catch (err) {
    console.log("⚠️ Fallback to direct send");
    promises.push(client.sendMessage(phoneNumber, requestBody.Message_2));
  }
}
      
      console.log(`⏳ Sending ${promises.length} message(s)...`);
      
      const responses = await Promise.all(promises);
      
      console.log("✅ All messages sent!");
      console.log("⏰ Time:", new Date().toISOString());
      
      return res.status(200).json({ 
        body: responses, 
        status: "Success",
        sentTo: phoneNumber,
        messageCount: promises.length
      });
        
    } catch (err) {
      console.error("❌ Error in /SendMessage:", err);
      console.log("⏰ Time:", new Date().toISOString());
      
      return res.status(500).json({ 
        status: "Error", 
        message: err instanceof Error ? err.message : "Unknown error",
        error: String(err)
      });
    } finally {
      if (req.file?.buffer) {
        req.file.buffer = Buffer.alloc(0);
      }
    }
  }
);

app.post(
  "/SavePatternFile/:id",
  MemoryWithStoring.single("file"),
  async (req: Request, res: Response) => {
    try {
      const requestBody: { PatternID: string } = req.body;
      console.log("💾 File saved with ID:", requestBody.PatternID);
      return res.status(200).json({
        message: `File saved successfully with ID: ${requestBody.PatternID}`,
      });
    } catch (err) {
      console.error("❌ Error in /SavePatternFile:", err);
      return res.status(500).json({ 
        status: "Error", 
        message: err instanceof Error ? err.message : "Unknown error"
      });
    }
  }
);

app.delete("/DeletePatternFile/:PatternID", (req, res) => {
  try {
    const { PatternID } = req.params;
    console.log("🗑️ Delete pattern:", PatternID);
    
    const files = fs.readdirSync(uploadDirectory);
    const found_file = files.find((val) => val.startsWith(`file-${PatternID}`));
    
    if (found_file) {
      const filePath = path.join(uploadDirectory, found_file);
      fs.unlinkSync(filePath);
      console.log("✅ File deleted:", found_file);
      return res.status(200).json({ status: "Success", message: "File deleted" });
    } else {
      return res.status(404).json({ status: "Error", message: "File not found" });
    }
  } catch (err) {
    console.error("❌ Error in /DeletePatternFile:", err);
    return res.status(500).json({ 
      status: "Error", 
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(`🌐 Listening on 0.0.0.0:${port}`);
  console.log(`📡 CORS enabled for localhost:3666`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});