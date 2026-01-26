"use server";

const WHATSAPP_SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "http://localhost:3994";

export async function sendMessageViaWhatsApp(
  message1: string,
  message2: string,
  file: File | null,
  phoneNumber: string,
  countryCode: string = "972",
  patternId?: number
): Promise<{ success: boolean; error?: string }> {
  console.log("\n=== 📤 sendMessageViaWhatsApp Called ===");
  console.log("⏰ זמן:", new Date().toISOString());
  console.log("📞 טלפון:", phoneNumber);
  console.log("🌍 קוד מדינה:", countryCode);
  console.log("💬 הודעה 1:", message1?.substring(0, 50));
  console.log("💬 הודעה 2:", message2?.substring(0, 50) || "ריק");
  console.log("📎 קובץ:", file?.name || "אין קובץ");
  console.log("🆔 מזהה תבנית:", patternId || "אין");
  
  try {
    // נרמול מספר טלפון
    let fullPhoneNumber = phoneNumber;
    
    // הסרת קוד מדינה קיים
    if (fullPhoneNumber.startsWith(countryCode)) {
      fullPhoneNumber = fullPhoneNumber.substring(countryCode.length);
    }
    
    // הסרת תווים לא מספריים
    fullPhoneNumber = fullPhoneNumber.replace(/\D/g, '');
    
    // הוספת קוד מדינה ו-@c.us
    fullPhoneNumber = `${countryCode}${fullPhoneNumber}@c.us`;
    
    console.log("📱 מספר טלפון מלא:", fullPhoneNumber);

    // הכנת FormData
    const formData = new FormData();
    formData.append("PhoneNumber", fullPhoneNumber);
    
    if (message1 && message1.trim()) {
      console.log("➕ מוסיף הודעה 1");
      formData.append("Message_1", message1);
    }
    
    if (message2 && message2.trim()) {
      console.log("➕ מוסיף הודעה 2");
      formData.append("Message_2", message2);
    }
    
    if (file && file.size > 0) {
      console.log(`➕ מוסיף קובץ: ${file.name} (${file.size} בתים)`);
      
      // המרת שם הקובץ ל-Base64 (אם יש תווים עבריים)
      const fileNameBase64 = Buffer.from(file.name, 'utf8').toString('base64');
      formData.append("FileNameBase64", fileNameBase64);
      
      // המרה לBlob
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const blob = new Blob([buffer], { type: file.type || 'application/octet-stream' });
      
      formData.append("file", blob, "temp_file.bin");
    }
    
    if (patternId) {
      console.log("➕ מוסיף מזהה תבנית:", patternId);
      formData.append("PatternID", patternId.toString());
    }

    // שליחת הבקשה
    const url = `${WHATSAPP_SERVER_URL}/SendMessage`;
    console.log("🌐 שולח POST ל:", url);
    console.log("⏰ זמן:", new Date().toISOString());
    
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    console.log("📥 סטטוס תגובה:", response.status);
    console.log("📥 תגובה תקינה:", response.ok);
    console.log("⏰ זמן:", new Date().toISOString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ שגיאת שרת:", errorText);
      return {
        success: false,
        error: `שגיאת שרת ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log("📦 נתוני תגובה:", data);

    if (data.status === "Success") {
      console.log("✅ הודעה נשלחה בהצלחה!");
      console.log("📊 מספר הודעות:", data.messageCount);
      return { success: true };
    } else {
      console.error("❌ תגובה לא צפויה:", data);
      return {
        success: false,
        error: data.message || "שגיאה לא ידועה",
      };
    }
  } catch (error: any) {
    console.error("❌ שגיאה ב-sendMessageViaWhatsApp:", error);
    console.log("⏰ זמן שגיאה:", new Date().toISOString());
    return {
      success: false,
      error: error.message || "שגיאת רשת",
    };
  }
}

export async function savePatternFile(id: number, file: File | null) {
  if (!file) return { success: true };
  
  console.log(`💾 שומר קובץ לתבנית ${id}: ${file.name}`);
  
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patternId", id.toString());
    
    // המרת שם קובץ עברי ל-Base64
    const fileNameBase64 = Buffer.from(file.name, 'utf8').toString('base64');
    formData.append("FileNameBase64", fileNameBase64);
    
    const response = await fetch(`${WHATSAPP_SERVER_URL}/SavePatternFile`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      console.error("❌ שגיאה בשמירת קובץ");
      return { success: false };
    }
    
    console.log("✅ קובץ נשמר בהצלחה");
    return { success: true };
    
  } catch (error) {
    console.error("❌ שגיאה בשמירת קובץ:", error);
    return { success: false };
  }
}

export async function getPatternFile(patternId: number): Promise<File | null> {
  try {
    console.log(`📥 טוען קובץ לתבנית ${patternId}...`);
    
    const response = await fetch(`${WHATSAPP_SERVER_URL}/GetPatternFile/${patternId}`);
    
    if (!response.ok) {
      console.log(`ℹ️ אין קובץ לתבנית ${patternId}`);
      return null;
    }

    // קבלת שם הקובץ מה-header
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'file.bin';
    
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/);
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1]);
      }
    }

    // המרה ל-File
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    
    console.log(`✅ קובץ נטען: ${fileName} (${file.size} בתים)`);
    return file;
    
  } catch (error) {
    console.error(`❌ שגיאה בטעינת קובץ לתבנית ${patternId}:`, error);
    return null;
  }
}

export async function deletePatternFile(patternId: number) {
  const WHATSAPP_SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "http://localhost:3994";
  try {
    await fetch(`${WHATSAPP_SERVER_URL}/DeletePatternFile/${patternId}`, { method: 'DELETE' });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}