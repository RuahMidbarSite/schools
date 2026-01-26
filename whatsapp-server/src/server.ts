import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Client, MessageMedia } from "whatsapp-web.js";
import {
  GetClientOrInitialize,
  Initialize,
  isReady,
  hasStoredSession,
  resetClient
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

// ✅ Status endpoint - פשוט ומהיר
app.get("/status", async (req: Request, res: Response) => {
  console.log("\n=== 📊 /status ===");
  
  try {
    const connected = await isReady();
    const hasSession = hasStoredSession();
    
    console.log(`Status: connected=${connected}, hasSession=${hasSession}`);
    
    return res.status(200).json({ 
      connected,
      isReady: connected,
      hasSession,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ 
      connected: false,
      isReady: false,
      hasSession: false,
      error: err instanceof Error ? err.message : "Unknown"
    });
  }
});

// 🔥 Initialize endpoint
app.get("/Initialize", async (req: Request, res: Response) => {
  console.log("\n=== 🚀 /Initialize ===");
  
  try {
    const result = await Initialize();
    
    if (result.result === 'ready') {
      console.log("✅ Returning: ready");
      return res.status(200).json({ result: 'ready' });
    }
    
    if (result.result === 'qr' && result.qr) {
      console.log("✅ Returning: QR code");
      return res.status(200).json({ result: 'qr', data: result.qr });
    }
    
    return res.status(500).json({
      status: "Error",
      message: "Unexpected result"
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({
      status: "Error",
      message: err instanceof Error ? err.message : "Unknown"
    });
  }
});

// ✅ ResetSession
app.post("/ResetSession", async (req: Request, res: Response) => {
  console.log("\n=== 🗑️ /ResetSession ===");
  
  try {
    await resetClient();
    
    console.log("✅ Session reset complete");
    return res.status(200).json({
      status: "Success",
      message: "Session deleted. Call /Initialize for fresh QR."
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({
      status: "Error",
      message: err instanceof Error ? err.message : "Unknown"
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
      console.log("📌 Getting client...");
      const client: Client = await GetClientOrInitialize();
      
      console.log("⏳ Waiting for client to be ready (up to 60 seconds)...");
      let waitCount = 0;
      while (!isReady() && waitCount < 120) {
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

      // המתנה נוספת לסנכרון מלא
      console.log("⏳ Waiting additional 30 seconds for full WhatsApp sync...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log("✅ Sync complete!");

      const requestBody: {
        PhoneNumber: string;
        Message_1: string | undefined;
        Message_2: string | undefined;
        PatternID: string | undefined;
      } = req.body;
      
      let phoneNumber = requestBody.PhoneNumber;
      console.log("📞 Original number:", phoneNumber);

      phoneNumber = phoneNumber.replace('@c.us', '').replace(/[\s-]/g, '');
      console.log("🧹 Cleaned number:", phoneNumber);

      let chatId: string;
      let chat: any;
      
      try {
        console.log("🔍 Getting number ID from WhatsApp...");
        const numberId = await client.getNumberId(phoneNumber);
        
        if (!numberId) {
          console.log("❌ Number not found on WhatsApp!");
          return res.status(404).json({ 
            status: "Error", 
            message: `Number ${phoneNumber} is not registered on WhatsApp`
          });
        }
        
        chatId = numberId._serialized;
        console.log("✅ Got chat ID:", chatId);
        
        console.log("📂 Loading chat...");
        try {
          chat = await client.getChatById(chatId);
          console.log("✅ Chat loaded successfully");
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (chatErr) {
          console.log("⚠️ Could not load chat, will try direct send:", chatErr);
          chat = null;
        }
        
      } catch (err) {
        console.log("⚠️ Error getting number ID:", err);
        chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
        console.log("🔄 Using fallback chat ID:", chatId);
        chat = null;
      }

      const responses: any[] = [];
      let messageCount = 0;
      
      // 1️⃣ שלח הודעה ראשונה
      if (requestBody.Message_1) {
        console.log("💬 Sending Message_1...");
        try {
          console.log("📤 Sending message directly without sendSeen...");
          const response = await client.sendMessage(chatId, requestBody.Message_1, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Message_1 sent!");
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
          console.error("❌ Error sending Message_1:", err);
          throw err;
        }
      }
      
      // 2️⃣ שלח קובץ
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
          const response = await client.sendMessage(chatId, media, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Pattern file sent!");
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (req.file) {
        console.log("📎 Processing uploaded file...");
        
        if (req.file.size === 0) {
          console.error("❌ Error: Received file with 0 bytes!");
        } else {
          let fileName = "file.bin";

          if (req.body.FileNameBase64) {
            try {
              const decoded = Buffer.from(req.body.FileNameBase64, 'base64').toString('binary');
              fileName = decodeURIComponent(escape(decoded));
              console.log(`🏷️ Decoded Hebrew Filename: ${fileName}`);
            } catch (e) {
              console.error("❌ Base64 decode failed, using fallback");
              fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            }
          } else {
            fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
          }

          const media = new MessageMedia(
            req.file.mimetype,
            req.file.buffer.toString("base64"),
            fileName,
            req.file.size
          );
          
          console.log("📤 Sending uploaded file with name:", fileName);
          const response = await client.sendMessage(chatId, media, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Uploaded file sent!");
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // 3️⃣ שלח הודעה שנייה
      if (requestBody.Message_2) {
        console.log("💬 Sending Message_2...");
        try {
          const response = await client.sendMessage(chatId, requestBody.Message_2, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Message_2 sent!");
        } catch (err) {
          console.error("❌ Error sending Message_2:", err);
          throw err;
        }
      }
      
      console.log(`✅ Total messages sent: ${messageCount}`);
      console.log("✅ All messages sent!");
      console.log("⏰ Time:", new Date().toISOString());
      
      return res.status(200).json({ 
        body: responses, 
        status: "Success",
        sentTo: chatId,
        messageCount: messageCount
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