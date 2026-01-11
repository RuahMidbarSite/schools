// server.ts - FINAL WORKING VERSION

import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Client, MessageMedia } from "whatsapp-web.js";

import {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  remote_sessionPromise,
  MessagePromise,
} from "./WhatsApp";
import multer from "multer";
import path from "path";
import mime from "mime";
import chardet from "chardet";
import fs from "fs";
dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3994;

// ✅ CORS - תיקון מלא!
app.use(cors({
  origin: ['http://localhost:3666', 'http://localhost:3000', 'http://127.0.0.1:3666'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ✅ Pre-flight requests for all routes
app.options('*', cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Define the directory where uploaded files will be stored
const uploadDirectory = path.join(__dirname, "uploads");

// Ensure that the directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const memoryStorage = multer.memoryStorage();

// Multer disk storage for saving files to the 'uploads' directory
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // patternID for the request
    const PatternID = req.params.id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + PatternID + path.extname(file.originalname)
    );
  },
});

// Initialize multer
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

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "WhatsApp Server is running" });
});

// Initialize endpoint - waits up to 30 seconds for saved session
app.get("/Initialize", async (req: Request, res: Response) => {
  try {
    console.log("📡 [/Initialize] Called");
    
    // Check if already ready
    const { isReady } = await import("./WhatsApp");
    if (isReady()) {
      console.log("✅ [/Initialize] Already ready");
      return res.status(200).json({ result: 'ready' });
    }
    
    // Get or create client
    const client = await GetClientOrInitialize();
    console.log("🔧 [/Initialize] Client obtained");
    
    // Wait for either ready or QR (max 30 seconds)
    const result: any = await Promise.race([
      readyPromise.then(() => ({ type: 'ready' })),
      QrPromise.then((qrData: any) => ({ type: 'qr', data: qrData })),
      new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 30000))
    ]);
    
    console.log("🎯 [/Initialize] Result:", result.type);
    
    if (result.type === 'ready') {
      return res.status(200).json({ result: 'ready' });
    }
    
    if (result.type === 'qr') {
      console.log("📱 [/Initialize] Returning QR");
      return res.status(200).json(result.data);
    }
    
    // Timeout
    console.log("⏰ [/Initialize] Timeout - checking state...");
    if (isReady()) {
      return res.status(200).json({ result: 'ready' });
    }
    
    return res.status(408).json({ 
      status: "Timeout", 
      message: "Failed to initialize within 30 seconds" 
    });
    
  } catch (err) {
    console.error("❌ [/Initialize] Error:", err);
    return res.status(500).json({ 
      status: "Error", 
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});
// WaitQr endpoint - waits for QR code to be scanned
app.get("/WaitQr", async (req: Request, res: Response) => {
  try {
    console.log("📱 /WaitQr endpoint called - waiting for session to be saved");
    
    // Wait for the remote session to be saved (QR scanned)
    const result = await remote_sessionPromise;
    
    console.log("✅ QR scanned successfully:", result);
    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in /WaitQr:", err);
    return res.status(500).json({ 
      status: "Error", 
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// SendMessage endpoint
app.post(
  "/SendMessage",
  MemoryWithNoStoring.single("file"),
  async (req: Request, res: Response) => {
    console.log("=== 📨 SendMessage Request Received ===");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
    console.log("📎 File:", req.file ? {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    } : "No file attached");
    
    try {
      // Get WhatsApp client
      console.log("🔌 Getting WhatsApp client...");
      const client: Client = await GetClientOrInitialize();
      
      // ✅ המתנה של עד 30 שניות שה-client יהיה מוכן
      console.log("⏳ Waiting for client to be ready (up to 30 seconds)...");
      const { isReady } = await import("./WhatsApp");
      
      let waitCount = 0;
      while (!isReady() && waitCount < 60) { // 60 * 500ms = 30 שניות
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
        if (waitCount % 10 === 0) { // הדפס כל 5 שניות
          console.log(`⏳ Still waiting... (${waitCount * 0.5} seconds)`);
        }
      }
      
      if (!isReady()) {
        console.log("❌ Client not ready after 30 seconds");
        return res.status(401).json({ 
          status: "Error", 
          message: "WhatsApp not authenticated after 30 seconds. Please scan QR code first.",
        });
      }
      
      console.log("✅ Client is ready!");
      
      const requestBody: {
        PhoneNumber: string;
        Message_1: string | undefined;
        Message_2: string | undefined;
        PatternID: string | undefined;
      } = req.body;
      
      const phoneNumber = requestBody.PhoneNumber;
      console.log("📞 Target phone number:", phoneNumber);
      
      const promises: Promise<any>[] = [];
      
      // Check if file does not exist and you get a patternID
      if (requestBody.PatternID && !req.file) {
        console.log("🔍 Looking for pattern file with ID:", requestBody.PatternID);
        const directoryPath = path.join(__dirname, "uploads");
        const files = fs.readdirSync(directoryPath);
        const found_file = files.find((val) =>
          val.startsWith(`file-${requestBody.PatternID}`)
        );
        
        if (found_file) {
          console.log("✅ Found pattern file:", found_file);
          const filePath = path.join(directoryPath, found_file);
          const multerFile = await createMulterFileObject(filePath);
          
          const mimetype = multerFile.mimetype;
          const filename = multerFile.originalname;
          const filesize = multerFile.size;
          const data = multerFile.buffer.toString("base64");
          
          const media = new MessageMedia(mimetype, data, filename, filesize);
          if (media) {
            console.log("📤 Sending pattern file to WhatsApp...");
            const media_promise = client.sendMessage(phoneNumber, media)
              .then(response => {
                console.log("✅ Pattern file sent successfully");
                return response;
              })
              .catch(err => {
                console.error("❌ Failed to send pattern file:", err);
                throw err;
              });
            promises.push(media_promise);
          }
        } else {
          console.log("⚠️ Pattern file not found for ID:", requestBody.PatternID);
        }
      }

      // Access the uploaded file from req.file
      const uploadedFile = req.file;
      if (uploadedFile) {
        console.log("🔎 Processing uploaded file:", uploadedFile.originalname);

        const mimetype = uploadedFile.mimetype;
        const filename = uploadedFile.originalname;
        const filesize = uploadedFile.size;
        const data = uploadedFile.buffer.toString("base64");

        const media = new MessageMedia(mimetype, data, filename, filesize);
        if (media) {
          console.log("📤 Sending uploaded file to WhatsApp...");
          const media_promise = client.sendMessage(phoneNumber, media)
            .then(response => {
              console.log("✅ Uploaded file sent successfully");
              return response;
            })
            .catch(err => {
              console.error("❌ Failed to send uploaded file:", err);
              throw err;
            });
          promises.push(media_promise);
        }
      }

      // Send Message_1
      if (requestBody.Message_1) {
        console.log("💬 Sending Message_1:", requestBody.Message_1.substring(0, 50) + "...");
        const textMessageBody = requestBody.Message_1;
        const message_promise = client.sendMessage(phoneNumber, textMessageBody)
          .then(response => {
            console.log("✅ Message_1 sent successfully");
            return response;
          })
          .catch(err => {
            console.error("❌ Failed to send Message_1:", err);
            throw err;
          });
        promises.push(message_promise);
      }
      
      // Send Message_2
      if (requestBody.Message_2) {
        console.log("💬 Sending Message_2:", requestBody.Message_2.substring(0, 50) + "...");
        const textMessageBody = requestBody.Message_2;
        const message_promise = client.sendMessage(phoneNumber, textMessageBody)
          .then(response => {
            console.log("✅ Message_2 sent successfully");
            return response;
          })
          .catch(err => {
            console.error("❌ Failed to send Message_2:", err);
            throw err;
          });
        promises.push(message_promise);
      }
      
      console.log(`⏳ Waiting for ${promises.length} message(s) to be sent...`);
      
      // Wait for all messages
      const responses = await Promise.all(promises);
      
      console.log("=== ✅ All messages sent successfully ===");
      console.log("📊 Total messages sent:", responses.length);
      
      return res.status(200).json({ 
        body: responses, 
        status: "Success",
        sentTo: phoneNumber,
        messageCount: promises.length
      });
        
    } catch (err) {
      console.error("=== ❌ SendMessage Critical Error ===");
      console.error("Error:", err);
      console.error("Error message:", err instanceof Error ? err.message : "Unknown");
      console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
      
      return res.status(500).json({ 
        status: "Error", 
        message: err instanceof Error ? err.message : "Unknown error",
        error: String(err)
      });
    } finally {
      // Cleanup memory
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
      const requestBody: {
        PatternID: string;
      } = req.body;

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
    console.log("🗑️ Delete request for pattern:", PatternID);
    
    const directoryPath = path.join(__dirname, "uploads");
    const files = fs.readdirSync(directoryPath);

    const found_file = files.find((val) => val.startsWith(`file-${PatternID}`));
    
    if (found_file) {
      const filePath = path.join(directoryPath, found_file);
      
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          return res.status(404).json({ status: "Error", message: "File not found" });
        }

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
            return res.status(500).json({ status: "Error", message: "Error deleting file" });
          }

          console.log("✅ File deleted:", found_file);
          return res.status(200).json({ status: "Success", message: "File deleted successfully" });
        });
      });
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

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 [server]: Server is running at http://localhost:${port}`);
  console.log(`🌐 [server]: Listening on all interfaces (0.0.0.0:${port})`);
  console.log(`📡 [server]: CORS enabled for localhost:3666`);
});