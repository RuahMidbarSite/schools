const WHATSAPP_SERVER_URL = 'http://localhost:3994';

async function testWhatsAppServer() {
  console.log('🔍 בודק את שרת WhatsApp...\n');
  
  try {
    console.log('📡 1. בודק סטטוס חיבור...');
    const res = await fetch(`${WHATSAPP_SERVER_URL}/Initialize`);
    const data = await res.json();
    console.log('תגובה:', JSON.stringify(data, null, 2));
    
    if (data.result === 'ready') {
      console.log('✅ מחובר!\n');
      
      console.log('📤 2. שולח הודעת טסט...');
      const formData = new FormData();
      formData.append('PhoneNumber', '972526554868@c.us');
      formData.append('Message_1', 'טסט מהסקריפט');
      
      const sendRes = await fetch(`${WHATSAPP_SERVER_URL}/SendMessage`, {
        method: 'POST',
        body: formData
      });
      
      console.log('סטטוס:', sendRes.status);
      
      if (sendRes.ok) {
        const sendData = await sendRes.json();
        console.log('✅ הודעה נשלחה:', JSON.stringify(sendData, null, 2));
      } else {
        const errorText = await sendRes.text();
        console.error('❌ שגיאה:', errorText);
      }
    } else {
      console.log('⚠️ לא מחובר - צריך לסרוק QR');
    }
    
  } catch (err) {
    console.error('❌ שגיאה:', err.message);
  }
}

testWhatsAppServer();