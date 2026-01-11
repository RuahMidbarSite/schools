"use strict";
// server.ts - FINAL WORKING VERSION
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const whatsapp_web_js_1 = require("whatsapp-web.js");
const WhatsApp_1 = require("./WhatsApp");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const mime_1 = __importDefault(require("mime"));
const chardet_1 = __importDefault(require("chardet"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3994;
// ✅ CORS - תיקון מלא!
app.use((0, cors_1.default)({
    origin: ['http://localhost:3666', 'http://localhost:3000', 'http://127.0.0.1:3666'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));
// ✅ Pre-flight requests for all routes
app.options('*', (0, cors_1.default)());
// Middleware to parse JSON bodies
app.use(express_1.default.json());
// Define the directory where uploaded files will be stored
const uploadDirectory = path_1.default.join(__dirname, "uploads");
// Ensure that the directory exists
if (!fs_1.default.existsSync(uploadDirectory)) {
    fs_1.default.mkdirSync(uploadDirectory);
}
const memoryStorage = multer_1.default.memoryStorage();
// Multer disk storage for saving files to the 'uploads' directory
const diskStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        // patternID for the request
        const PatternID = req.params.id;
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + PatternID + path_1.default.extname(file.originalname));
    },
});
// Initialize multer
const MemoryWithNoStoring = (0, multer_1.default)({ storage: memoryStorage });
const MemoryWithStoring = (0, multer_1.default)({ storage: diskStorage });
const createMulterFileObject = (filePath) => {
    const stats = fs_1.default.statSync(filePath);
    const buffer = fs_1.default.readFileSync(filePath);
    return {
        fieldname: "file",
        originalname: path_1.default.basename(filePath),
        encoding: chardet_1.default.detect(buffer),
        mimetype: mime_1.default.lookup(filePath),
        buffer: buffer,
        size: stats.size,
        destination: path_1.default.dirname(filePath),
        filename: path_1.default.basename(filePath),
        path: filePath,
    };
};
app.get("/", (req, res) => {
    res.send("WhatsApp Server is Running");
});
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "WhatsApp Server is running" });
});
// Initialize endpoint - waits up to 30 seconds for saved session
app.get("/Initialize", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("/Initialize endpoint called");
        const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
        // Check if client is already ready
        const { isReady } = yield Promise.resolve().then(() => __importStar(require("./WhatsApp")));
        if (isReady()) {
            console.log("Client is already ready - returning ready status");
            return res.status(200).json({ result: 'ready' });
        }
        // Wait up to 30 seconds for saved session
        console.log("Waiting up to 30 seconds for saved session...");
        const waitForReady = new Promise((resolve) => {
            setTimeout(() => {
                console.log("30 seconds timeout reached");
                resolve(null);
            }, 30000);
        });
        const result = yield Promise.race([
            WhatsApp_1.readyPromise,
            waitForReady
        ]);
        // Check again if ready
        if (isReady()) {
            console.log("Client became ready!");
            return res.status(200).json({ result: 'ready' });
        }
        // If still not ready, return QR
        console.log("No saved session, waiting for QR...");
        const qrResult = yield WhatsApp_1.QrPromise;
        console.log("QR Code ready");
        return res.status(200).json(qrResult);
    }
    catch (err) {
        console.error("Error in /Initialize:", err);
        return res.status(500).json({
            status: "Error",
            message: err instanceof Error ? err.message : "Unknown error"
        });
    }
}));
// WaitQr endpoint - waits for QR code to be scanned
app.get("/WaitQr", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📱 /WaitQr endpoint called - waiting for session to be saved");
        // Wait for the remote session to be saved (QR scanned)
        const result = yield WhatsApp_1.remote_sessionPromise;
        console.log("✅ QR scanned successfully:", result);
        return res.status(200).json(result);
    }
    catch (err) {
        console.error("❌ Error in /WaitQr:", err);
        return res.status(500).json({
            status: "Error",
            message: err instanceof Error ? err.message : "Unknown error"
        });
    }
}));
// SendMessage endpoint
app.post("/SendMessage", MemoryWithNoStoring.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        console.log("Getting WhatsApp client...");
        const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
        // Wait up to 45 seconds for client to be ready
        console.log("Waiting for client to be ready (up to 45 seconds)...");
        const { isReady } = yield Promise.resolve().then(() => __importStar(require("./WhatsApp")));
        let waitCount = 0;
        while (!isReady() && waitCount < 90) { // 90 * 500ms = 45 seconds
            yield new Promise(resolve => setTimeout(resolve, 500));
            waitCount++;
            if (waitCount % 10 === 0) { // Print every 5 seconds
                console.log(`Still waiting... (${waitCount * 0.5} seconds)`);
            }
        }
        if (!isReady()) {
            console.log("Client not ready after 45 seconds");
            return res.status(401).json({
                status: "Error",
                message: "WhatsApp not authenticated after 45 seconds. Please scan QR code first.",
            });
        }
        console.log("Client is ready!");
        const requestBody = req.body;
        const phoneNumber = requestBody.PhoneNumber;
        console.log("📞 Target phone number:", phoneNumber);
        const promises = [];
        // Check if file does not exist and you get a patternID
        if (requestBody.PatternID && !req.file) {
            console.log("🔍 Looking for pattern file with ID:", requestBody.PatternID);
            const directoryPath = path_1.default.join(__dirname, "uploads");
            const files = fs_1.default.readdirSync(directoryPath);
            const found_file = files.find((val) => val.startsWith(`file-${requestBody.PatternID}`));
            if (found_file) {
                console.log("✅ Found pattern file:", found_file);
                const filePath = path_1.default.join(directoryPath, found_file);
                const multerFile = yield createMulterFileObject(filePath);
                const mimetype = multerFile.mimetype;
                const filename = multerFile.originalname;
                const filesize = multerFile.size;
                const data = multerFile.buffer.toString("base64");
                const media = new whatsapp_web_js_1.MessageMedia(mimetype, data, filename, filesize);
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
            }
            else {
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
            const media = new whatsapp_web_js_1.MessageMedia(mimetype, data, filename, filesize);
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
        const responses = yield Promise.all(promises);
        console.log("=== ✅ All messages sent successfully ===");
        console.log("📊 Total messages sent:", responses.length);
        return res.status(200).json({
            body: responses,
            status: "Success",
            sentTo: phoneNumber,
            messageCount: promises.length
        });
    }
    catch (err) {
        console.error("=== ❌ SendMessage Critical Error ===");
        console.error("Error:", err);
        console.error("Error message:", err instanceof Error ? err.message : "Unknown");
        console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
        return res.status(500).json({
            status: "Error",
            message: err instanceof Error ? err.message : "Unknown error",
            error: String(err)
        });
    }
    finally {
        // Cleanup memory
        if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer) {
            req.file.buffer = Buffer.alloc(0);
        }
    }
}));
app.post("/SavePatternFile/:id", MemoryWithStoring.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestBody = req.body;
        console.log("💾 File saved with ID:", requestBody.PatternID);
        return res.status(200).json({
            message: `File saved successfully with ID: ${requestBody.PatternID}`,
        });
    }
    catch (err) {
        console.error("❌ Error in /SavePatternFile:", err);
        return res.status(500).json({
            status: "Error",
            message: err instanceof Error ? err.message : "Unknown error"
        });
    }
}));
app.delete("/DeletePatternFile/:PatternID", (req, res) => {
    try {
        const { PatternID } = req.params;
        console.log("🗑️ Delete request for pattern:", PatternID);
        const directoryPath = path_1.default.join(__dirname, "uploads");
        const files = fs_1.default.readdirSync(directoryPath);
        const found_file = files.find((val) => val.startsWith(`file-${PatternID}`));
        if (found_file) {
            const filePath = path_1.default.join(directoryPath, found_file);
            fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
                if (err) {
                    return res.status(404).json({ status: "Error", message: "File not found" });
                }
                fs_1.default.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                        return res.status(500).json({ status: "Error", message: "Error deleting file" });
                    }
                    console.log("✅ File deleted:", found_file);
                    return res.status(200).json({ status: "Success", message: "File deleted successfully" });
                });
            });
        }
        else {
            return res.status(404).json({ status: "Error", message: "File not found" });
        }
    }
    catch (err) {
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
