require('dotenv').config();
const vision = require('@google-cloud/vision');

async function testGoogleVision() {
  console.log("🔍 בודק חיבור ל-Google Vision API...\n");
  
  try {
    // בדיקת משתני סביבה
    console.log("📋 בודק משתני סביבה:");
    console.log("   GOOGLE_VISION_CREDENTIALS:", !!process.env.GOOGLE_VISION_CREDENTIALS ? "✅ קיים" : "❌ חסר");
    console.log("   GOOGLE_APPLICATION_CREDENTIALS:", !!process.env.GOOGLE_APPLICATION_CREDENTIALS ? "✅ קיים" : "❌ חסר");
    console.log();
    
    // יצירת לקוח
    let client;
    
    if (process.env.GOOGLE_VISION_CREDENTIALS) {
      console.log("✅ משתמש ב-GOOGLE_VISION_CREDENTIALS (JSON string)");
      try {
        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
        console.log("   Project ID:", credentials.project_id);
        console.log("   Client Email:", credentials.client_email);
        client = new vision.ImageAnnotatorClient({ credentials });
      } catch (e) {
        throw new Error("שגיאה בפענוח ה-JSON: " + e.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("✅ משתמש ב-GOOGLE_APPLICATION_CREDENTIALS (file path)");
      console.log("   Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
      client = new vision.ImageAnnotatorClient();
    } else {
      throw new Error("לא נמצאו credentials! הוסף GOOGLE_VISION_CREDENTIALS או GOOGLE_APPLICATION_CREDENTIALS לקובץ .env");
    }
    
    console.log();
    console.log("🌐 מנסה להתחבר ל-Google Vision API...");
    
    // תמונת בדיקה קטנה (1x1 pixel לבן עם טקסט "TEST")
    // זו תמונה שלא תחזיר טקסט, אבל תוודא שה-API עובד
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const [result] = await client.textDetection({
      image: { content: testImage }
    });
    
    console.log("✅ החיבור הצליח!");
    console.log("📊 תגובה מה-API:", result.textAnnotations ? "קיבלנו תגובה" : "תגובה ריקה (צפוי)");
    console.log();
    console.log("🎉 Google Vision API מוכן לשימוש!");
    console.log();
    console.log("💡 כעת תוכל:");
    console.log("   • להעלות תמונות במערכת");
    console.log("   • לזהות טקסט בעברית ואנגלית");
    console.log("   • לחלץ פרטי מדריכים מצילומי מסך");
    console.log();
    console.log("📊 מכסת השימוש החודשית:");
    console.log("   • 1,000 תמונות ראשונות: חינמי");
    console.log("   • תמונות נוספות: $1.50 לאלף");
    console.log();
    console.log("🔗 לניטור שימוש:");
    console.log("   https://console.cloud.google.com/apis/dashboard");
    
  } catch (error) {
    console.error();
    console.error("❌ שגיאה:", error.message);
    console.error();
    
    if (error.message.includes('credentials') || error.message.includes('JSON')) {
      console.log("💡 פתרון - בעיית Credentials:");
      console.log("   1. ודא שיצרת Service Account ב-Google Cloud Console");
      console.log("   2. ודא שהורדת את קובץ ה-JSON");
      console.log("   3. הוסף לקובץ .env את אחד מהבאים:");
      console.log();
      console.log("   אפשרות A (מומלץ למפתחים):");
      console.log("   GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-key.json");
      console.log();
      console.log("   אפשרות B (מומלץ לייצור):");
      console.log("   GOOGLE_VISION_CREDENTIALS='{\"type\":\"service_account\",\"project_id\":\"...\"}'");
      console.log();
    } else if (error.message.includes('API') || error.message.includes('enable')) {
      console.log("💡 פתרון - בעיית API:");
      console.log("   1. לך ל-Google Cloud Console");
      console.log("   2. בחר את הפרויקט שלך");
      console.log("   3. לך ל-APIs & Services > Library");
      console.log("   4. חפש 'Cloud Vision API'");
      console.log("   5. לחץ 'Enable'");
      console.log("   6. חכה 2-3 דקות ונסה שוב");
      console.log();
      console.log("   קישור ישיר:");
      console.log("   https://console.cloud.google.com/apis/library/vision.googleapis.com");
      console.log();
    } else if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log("💡 פתרון - עברת את המכסה:");
      console.log("   • 1,000 התמונות החינמיות נגמרו החודש");
      console.log("   • החודש הבא המכסה תתאפס אוטומטית");
      console.log("   • או הוסף billing account לקבל תמונות נוספות");
      console.log();
    } else if (error.message.includes('ENOENT') || error.message.includes('file')) {
      console.log("💡 פתרון - קובץ לא נמצא:");
      console.log("   • ודא שהנתיב לקובץ JSON נכון");
      console.log("   • ודא שהקובץ קיים במיקום");
      console.log("   • השתמש בנתיב יחסי: ./credentials/key.json");
      console.log();
    }
    
    console.log("📖 מדריך מלא:");
    console.log("   קרא את GOOGLE_VISION_SETUP.md");
    console.log();
    
    process.exit(1);
  }
}

// הרצת הבדיקה
console.log("=" .repeat(60));
console.log("    Google Vision API - בדיקת חיבור");
console.log("=" .repeat(60));
console.log();

testGoogleVision();