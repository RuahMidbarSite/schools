
// import { Client, LocalAuth, RemoteAuth } from "whatsapp-web.js";
// import { MongoStore } from "wwebjs-mongo";
// import mongoose from "mongoose";

// export const Qr = global as unknown as { Qr: string };
// export const ready = global as unknown as { ready: boolean };
// const GlobalClient = global as unknown as { client: Client };

// export var client: Client = GlobalClient.client
// export const Connect = async ():Promise<any> => {
//    if(typeof client!=="undefined" && client.pupPage) {
//     return
//    }
//   // Load the session data
//   mongoose.connect(process.env.MONGODB_URI).then(() => {
//     const store = new MongoStore({ mongoose: mongoose });
//     // vercel only allows temp writing in "/tmp" so don't change it.
//     client =
//       GlobalClient.client ||
//       new Client({
//         // authStrategy: new RemoteAuth({
//         //   store: store,
//         //   backupSyncIntervalMs: 300000,
//         //   clientId: "1",
//         //   dataPath: "/tmp",
//         // }),
//          authStrategy: new LocalAuth(),
//       });
//     addListeners();

//     client.initialize();
    
//     return client
//   })

// };
// const addListeners = () => {
//   if(client.listeners('ready').length > 0) {
//     return
//   }
//   client.on("ready", () => {
//     console.log("Client is ready to send messages!");
//     if (!ready.ready) {
//       ready.ready = true;
//     }
//   });
//   client.on("message", (message: { body: any }) => {
//     console.log("Incoming message:", message.body);
//   });
//   client.on("qr", (qr: any) => {
//     Qr.Qr = qr;
//     //qrcode.generate(qr, { small: true } ,(qrcode)=> Qr.Qr = qrcode);
//   });

//   client.on("remote_session_saved", () => {
//     console.log("saved remoted...");
//   });
// };

// export const Initialize:()=>Promise<Client> = ()=> Connect()



// if (process.env.NODE_ENV !== "production") GlobalClient.client = client;
