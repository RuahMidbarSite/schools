"use strict";
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
exports.hasStoredSession = exports.isReady = exports.MessagePromise = exports.remote_sessionPromise = exports.readyPromise = exports.QrPromise = exports.GetClientOrInitialize = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const path_1 = __importDefault(require("path"));
// Singleton object, should only be instantiated once.
const GlobalClient = global;
let readyPromise;
let QrPromise;
let MessagePromise;
let remote_sessionPromise;
let resolveReady = null;
let resolveQr = null;
let resolveMessage = null;
let resolve_remote_session = null;
// Track client state
let isClientReady = false;
let isInitializing = false;
let hasSession = false;
const GetClientOrInitialize = () => __awaiter(void 0, void 0, void 0, function* () {
    // If client exists and is ready, return it immediately
    if (GlobalClient.client && isClientReady) {
        console.log("Client already exists and is ready");
        return GlobalClient.client;
    }
    // If client is initializing, wait for it
    if (isInitializing) {
        console.log("Client is initializing, waiting...");
        while (isInitializing && !isClientReady) {
            yield new Promise(resolve => setTimeout(resolve, 500));
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
            yield Promise.race([
                readyPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 45000))
            ]);
            console.log("Client is now ready!");
            return GlobalClient.client;
        }
        catch (err) {
            console.log("Timeout waiting for client, continuing...");
            return GlobalClient.client;
        }
    }
    console.log("Creating new WhatsApp client...");
    isInitializing = true;
    const dataPath = path_1.default.join(__dirname, '..', 'WhatsAppData');
    console.log("WhatsApp data path:", dataPath);
    var client = new whatsapp_web_js_1.Client({
        authStrategy: new whatsapp_web_js_1.LocalAuth({
            dataPath: dataPath,
            clientId: '1'
        }),
        webVersion: "2.3000.1015910634-alpha",
        webVersionCache: {
            remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015910634-alpha.html",
            type: "remote",
        },
    });
    // Initialize promises
    exports.readyPromise = readyPromise = new Promise((resolve) => {
        resolveReady = resolve;
    });
    exports.QrPromise = QrPromise = new Promise((resolve) => {
        resolveQr = resolve;
    });
    exports.MessagePromise = MessagePromise = new Promise((resolve) => {
        resolveMessage = resolve;
    });
    exports.remote_sessionPromise = remote_sessionPromise = new Promise((resolve) => {
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
            resolveReady({ result: "ready" });
        }
    });
    client.on("message", (message) => {
        console.log("Message received:", message.body);
        if (resolveMessage) {
            resolveMessage({ message: message.body, status: 'received' });
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
            resolve_remote_session({ message: "Remote session saved", status: 'received' });
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
    yield client.initialize();
    GlobalClient.client = client;
    console.log("Client initialization started");
    isInitializing = false;
    return client;
});
exports.GetClientOrInitialize = GetClientOrInitialize;
// Check if client is ready
const isReady = () => {
    return isClientReady && GlobalClient.client !== undefined;
};
exports.isReady = isReady;
// Check if there is a stored session
const hasStoredSession = () => {
    return hasSession;
};
exports.hasStoredSession = hasStoredSession;
