# WhatsAppServer
 Used only for whatsapp

Guide:
1. Create Self-signed certificate https://medium.com/@antelle/how-to-generate-a-self-signed-ssl-certificate-for-an-ip-address-f0dd8dddf754 with the IP being your computer public IP (for example 10.100...)
2. import the cert using the browser or make it into .crt and make it trusted root certificate in your computer.
3. import the cert.pem and cert.pem file into the keys directory
4. Run the server Either using npm run dev or npm run build + npm start ( The second option is going to result in a faster server most probably).
5. Now you can use whatsapp in the program.

6. 
