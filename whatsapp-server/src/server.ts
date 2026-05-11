import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import mime from "mime";
import chardet from "chardet";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

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

// 2. הגדרת CORS
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// 3. headers ידניים
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PUT, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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
    let originalName = file.originalname;
    try {
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {}
    cb(null, `file-${PatternID}-${originalName}`);
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

// ✅ Status endpoint - בודק רק מפתחות מטא
app.get("/status", async (req: Request, res: Response) => {
  const isMetaConnected = !!process.env.META_ACCESS_TOKEN && !!process.env.META_PHONE_ID;
  return res.status(200).json({ 
    connected: isMetaConnected,
    isReady: isMetaConnected,
    statusMessage: isMetaConnected ? "Meta API Connected" : "Missing Meta Configuration",
    timestamp: new Date().toISOString()
  });
});

// ✅ משיכת קובץ תבנית
app.get("/GetPatternFile/:id", (req: Request, res: Response) => {
  const patternId = req.params.id;
  const directoryPath = path.join(__dirname, "uploads");
  
  try {
    if (!fs.existsSync(directoryPath)) {
        return res.status(404).send("Uploads directory not found");
    }
    const files = fs.readdirSync(directoryPath);
    const fileName = files.find(f => f.startsWith(`file-${patternId}`));

    if (fileName) {
      const filePath = path.join(directoryPath, fileName);
      res.download(filePath, fileName.split('-').slice(2).join('-') || fileName);
    } else {
      res.status(404).send("File not found");
    }
  } catch (error) {
    console.error("Error in GetPatternFile:", error);
    res.status(500).send("Error accessing files");
  }
});

// --- מערכת הגנה דינמית מפני לולאות ---
let dynamicMessageCounter = 0;
let currentSessionLimit = 0;

app.post("/StartBatch", (req: Request, res: Response) => {
    const { limit } = req.body;
    currentSessionLimit = limit || 0;
    dynamicMessageCounter = 0; // איפוס המונה בכל תחילת שליחה
    console.log(`\n🛡️ SECURITY: New batch started. Limit set to ${currentSessionLimit} messages.`);
    res.status(200).json({ status: "Success", limit: currentSessionLimit });
});

// ✅ SendMessage endpoint - מטא API 
app.post("/SendMessage", MemoryWithNoStoring.single("file"), async (req: Request, res: Response) => {
    console.log("\n=== 📨 /SendMessage (Meta API) ===");
    
    // בדיקת חסימת האבטחה הדינמית
    if (currentSessionLimit > 0 && dynamicMessageCounter >= currentSessionLimit) {
        console.error(`⛔ STOP: Dynamic limit reached (${currentSessionLimit}). Blocking further messages.`);
        return res.status(429).json({ error: "Dynamic limit exceeded for safety" });
    }
    dynamicMessageCounter++;
    
    try {
        const { META_PHONE_ID, META_ACCESS_TOKEN } = process.env;
        const requestBody = req.body;
        
        let rawPhone = requestBody.PhoneNumber.replace('@c.us', '').replace(/[\s-]/g, '');
        if (rawPhone.startsWith('0')) rawPhone = '972' + rawPhone.substring(1);
        const waId = rawPhone;

        console.log(`📞 Target number: ${waId}`);

        const sendMetaText = async (text: string) => {
            const url = `https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`;
            await axios.post(url, {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: waId,
                type: "text",
                text: { preview_url: false, body: text }
            }, {
                headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
        };

        let messageCount = 0;

       let fileToUpload: Express.Multer.File | any = req.file;
        
        if (requestBody.PatternID && !req.file) {
            const files = fs.readdirSync(uploadDirectory);
            const found_file = files.find((val) => val.startsWith(`file-${requestBody.PatternID}`));
            if (found_file) {
                const filePath = path.join(uploadDirectory, found_file);
                fileToUpload = createMulterFileObject(filePath);
            }
        }

        if (fileToUpload) {
            console.log("📎 Uploading media to Meta...");
            const form = new FormData();
            form.append('messaging_product', 'whatsapp');
            form.append('file', fileToUpload.buffer, { filename: fileToUpload.originalname });
            
            const uploadRes = await axios.post(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/media`, form, {
                headers: { 
                    'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                    ...form.getHeaders()
                }
            });
            
            const mediaId = uploadRes.data.id;
            console.log(`📤 Sending message. Mode: ${requestBody.TemplateName ? 'Template' : 'Free Text'}`);

            if (requestBody.TemplateName) {
                // שליחה באמצעות תבנית מאושרת ממטא (עבור הודעות ראשונות למנהלים)
                await axios.post(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
                    messaging_product: "whatsapp",
                    to: waId,
                    type: "template",
                    template: {
                        name: requestBody.TemplateName,
                        language: { code: "he" },
                        components: [
                            {
                                type: "header",
                                parameters: [
                                    { 
                                        type: "document", 
                                        document: { 
                                            id: mediaId, 
                                            filename: requestBody.FileName || "תשפז תוכניות לבתי ספר.pdf" 
                                        } 
                                    }
                                ]
                            },
                            {
                                type: "body",
                                parameters: [
                                    { 
                                        type: "text", 
                                        text: requestBody.ContactName || "מנהל/ת" 
                                    }
                                ]
                            }
                        ]
                    }
                }, {
                    headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
                });
            } else {
                // שליחה כהודעה חופשית (עבור מנהלים שכבר בשיחה איתך)
                await axios.post(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
                    messaging_product: "whatsapp",
                    to: waId,
                    type: "document",
                    document: { 
                        id: mediaId, 
                        caption: requestBody.Message_1 || "", 
                        filename: requestBody.FileName || "תשפז תוכניות לבתי ספר.pdf" 
                    }
                }, {
                    headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
                });
            }
            
            messageCount++;
            await new Promise(r => setTimeout(r, 1000));
        } else if (requestBody.Message_1) {
            console.log("💬 Sending Message_1...");
            await sendMetaText(requestBody.Message_1);
            messageCount++;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (requestBody.Message_2) {
            console.log("💬 Sending Message_2...");
            await sendMetaText(requestBody.Message_2);
            messageCount++;
        }
        
        console.log(`✅ Total messages sent via Meta API: ${messageCount}`);
        return res.status(200).json({ status: "Success", sentTo: waId, messageCount: messageCount });
        
    } catch (err: any) {
        console.error("❌ Error in /SendMessage:", err.response?.data || err.message);
        return res.status(500).json({ status: "Error", message: "Failed to send message via Meta API", error: err.response?.data || String(err) });
    }
});

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
  console.log(`\n🚀 Meta WhatsApp Server is LIVE on port: ${port}`);
  console.log(`✅ Clean Architecture - No QR Codes required`);
  console.log(`⏰ Startup time: ${new Date().toISOString()}\n`);
});