import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Client, MessageMedia } from "whatsapp-web.js";
import {
  GetClientOrInitialize,
  Initialize,
  isReady,
  hasStoredSession,
  resetClient,
  getConnectionStatus,
  getLastQrCode,
} from "./WhatsApp";
import multer from "multer";
import path from "path";
import mime from "mime";
import chardet from "chardet";
import fs from "fs";

dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3994;

// 1. הגדרת מקורות מורשים
const allowedOrigins = [
  'http://localhost:3666',
  'http://localhost:3000',
  'http://127.0.0.1:3666',
  'https://schools-rho-ashen.vercel.app', 
  /\.vercel\.app$/                        
];

// 2. הגדרת CORS משופרת התומכת ב-ngrok
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// 3. headers ידניים למניעת חסימות
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PUT, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Upload directory setup
const uploadDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirectory),
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

// ✅ Status endpoint
app.get("/status", async (req: Request, res: Response) => {
  console.log("\n=== 📊 /status ===");
  try {
    const connected = await isReady();
    const hasSession = hasStoredSession();
    const statusMessage = getConnectionStatus();
    
    console.log(`🔍 Quick check: isClientReady=${connected}`);
    
    return res.status(200).json({ 
      connected,
      isReady: connected,
      hasSession,
      statusMessage,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ connected: false, error: String(err) });
  }
});

// 🆕 GetQR endpoint - משופר להחזיר QR מהזיכרון
app.get("/GetQR", async (req: Request, res: Response) => {
  console.log("\n=== 📱 /GetQR ===");
  try {
    // 1️⃣ בדוק אם כבר מחובר
    if (await isReady()) {
      return res.status(200).json({ result: 'ready', message: 'Already connected' });
    }

    // 2️⃣ קבל QR מהזיכרון
    const latestQr = getLastQrCode();

    // תמיכה בפורמט תמונה
    if (req.query.format === 'image' && latestQr) {
      const img = Buffer.from(latestQr.split(',')[1], 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': img.length });
      return res.end(img);
    }

    // 3️⃣ החזר QR או הודעת המתנה
    if (latestQr) {
      return res.status(200).json({ result: 'qr', data: latestQr });
    }

    return res.status(404).json({ result: 'waiting', message: 'QR not ready yet' });
  } catch (err) {
    return res.status(500).json({ status: "Error", message: String(err) });
  }
});

// 🔥 Initialize endpoint - הגנה מפני אתחולים כפולים
app.get("/Initialize", async (req: Request, res: Response) => {
  console.log("\n=== 🚀 /Initialize ===");
  try {
    // 1️⃣ בדוק אם כבר מחובר
    const alreadyConnected = await isReady();
    if (alreadyConnected) {
      console.log("✅ Already connected - returning ready");
      return res.status(200).json({ result: 'ready' });
    }

    // 2️⃣ בדוק אם יש QR מוכן
    const latestQr = getLastQrCode();
    if (latestQr) {
      console.log("✨ Returning existing QR from memory to avoid loop");
      return res.status(200).json({ result: 'qr', data: latestQr });
    }

    // 3️⃣ התחל אתחול חדש
    console.log("🛠️ Starting fresh initialization...");
    const qrPromise = Initialize();
    const timeoutPromise = new Promise<{ result: 'timeout' }>((resolve) => 
      setTimeout(() => resolve({ result: 'timeout' as const }), 8000)
    );

    const result = await Promise.race([qrPromise, timeoutPromise]);
    
    if (result.result === 'timeout') {
      return res.status(202).json({ result: 'connecting', message: 'Initializing in background...' });
    }
    
    return res.status(200).json(result.result === 'qr' ? { result: 'qr', data: result.qr } : result);
  } catch (err) {
    return res.status(500).json({ status: "Error", message: String(err) });
  }
});

// ✅ ResetSession
app.post("/ResetSession", async (req: Request, res: Response) => {
  console.log("\n=== 🗑️ /ResetSession ===");
  try {
    await resetClient();
    return res.status(200).json({ status: "Success", message: "Session deleted." });
  } catch (err) {
    return res.status(500).json({ status: "Error", message: String(err) });
  }
});

// ✅ SendMessage endpoint - עם הקוד הישן שעובד!
app.post("/SendMessage", MemoryWithNoStoring.single("file"), async (req: Request, res: Response) => {
    console.log("\n=== 📨 /SendMessage Called ===");
    console.log("⏰ Time:", new Date().toISOString());
    
    try {
      console.log("=== 🎯 GetClientOrInitialize ===");
      const client: Client = await GetClientOrInitialize();
      
      console.log("⏳ Waiting for client to be ready (up to 60 seconds)...");
      let waitCount = 0;
      while (!(await isReady()) && waitCount < 120) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
        if (waitCount % 20 === 0) {
          console.log(`⏳ Still waiting... (${waitCount * 0.5} seconds)`);
        }
      }
      
      if (!(await isReady())) {
        console.log("❌ Client not ready after 60 seconds");
        return res.status(401).json({ 
          status: "Error", 
          message: "WhatsApp not authenticated. Please scan QR code first.",
        });
      }
      
      console.log("✅ Client is ready!");
      console.log("🔍 Quick check: isClientReady=true");

      // המתנה נוספת לסנכרון מלא - זה קריטי!
      console.log("⏳ Waiting additional 2 seconds for full WhatsApp sync...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("✅ Sync complete!");

      const requestBody = req.body;
      let phoneNumber = requestBody.PhoneNumber.replace('@c.us', '').replace(/[\s-]/g, '');
      console.log("📞 Cleaned number:", phoneNumber);

      let chatId: string;
      
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
        
      } catch (err) {
        console.log("⚠️ Error getting number ID:", err);
        chatId = `${phoneNumber}@c.us`;
        console.log("🔄 Using fallback chat ID:", chatId);
      }

      const responses: any[] = [];
      let messageCount = 0;
      
      // 1️⃣ שלח הודעה ראשונה
      if (requestBody.Message_1) {
        console.log("💬 Sending Message_1...");
        try {
          const response = await client.sendMessage(chatId, requestBody.Message_1, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Message_1 sent!");
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error("❌ Error sending Message_1:", err);
          throw err;
        }
      }
      
      // 2️⃣ שלח קובץ מ-PatternID
      if (requestBody.PatternID && !req.file) {
        console.log("🔍 Looking for pattern file:", requestBody.PatternID);
        const files = fs.readdirSync(uploadDirectory);
        const found_file = files.find((val) =>
          val.startsWith(`file-${requestBody.PatternID}`)
        );
        
        if (found_file) {
          console.log("✅ Found pattern file:", found_file);
          const filePath = path.join(uploadDirectory, found_file);
          const multerFile = createMulterFileObject(filePath);
          
          const media = new MessageMedia(
            multerFile.mimetype || 'image/png',
            multerFile.buffer.toString("base64"),
            multerFile.originalname
          );
          
          console.log("📤 Sending pattern file...");
          const response = await client.sendMessage(chatId, media, {
            sendSeen: false
          });
          
          responses.push(response);
          messageCount++;
          console.log("✅ Pattern file sent!");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 3️⃣ שלח קובץ מועלה
      if (req.file) {
        console.log("📎 Processing uploaded file...");
        
        let fileName = req.file.originalname;

        if (req.body.FileNameBase64) {
          try {
            const decoded = Buffer.from(req.body.FileNameBase64, 'base64').toString('binary');
            fileName = decodeURIComponent(escape(decoded));
            console.log(`🏷️ Decoded Hebrew Filename: ${fileName}`);
          } catch (e) {
            console.error("❌ Base64 decode failed, using fallback");
            fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
          }
        }

        const media = new MessageMedia(
          req.file.mimetype,
          req.file.buffer.toString("base64"),
          fileName
        );
        
        console.log("📤 Sending uploaded file with name:", fileName);
        const response = await client.sendMessage(chatId, media, {
          sendSeen: false
        });
        
        responses.push(response);
        messageCount++;
        console.log("✅ Uploaded file sent!");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 4️⃣ שלח הודעה שנייה
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
      console.log("⏰ Time:", new Date().toISOString());
      
      return res.status(200).json({ 
        status: "Success",
        sentTo: chatId,
        messageCount: messageCount
      });
        
    } catch (err) {
      console.error("❌ Error in /SendMessage:", err);
      return res.status(500).json({ 
        status: "Error", 
        message: String(err),
        error: String(err)
      });
    }
  }
);

app.post("/SavePatternFile/:id", MemoryWithStoring.single("file"), async (req, res) => {
    return res.status(200).json({ message: "File saved successfully" });
});

app.delete("/DeletePatternFile/:PatternID", (req, res) => {
    const { PatternID } = req.params;
    const files = fs.readdirSync(uploadDirectory);
    const found_file = files.find((val) => val.startsWith(`file-${PatternID}`));
    if (found_file) {
      fs.unlinkSync(path.join(uploadDirectory, found_file));
      return res.status(200).json({ status: "Success" });
    }
    return res.status(404).json({ status: "Error" });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 WhatsApp Server is LIVE on port: ${port}`);
  console.log(`🌐 Access via ngrok for Vercel`);
  console.log(`⏰ Startup time: ${new Date().toISOString()}\n`);
});