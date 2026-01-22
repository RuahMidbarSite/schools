"use server";

const WHATSAPP_SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "http://localhost:3994";

export async function sendMessageViaWhatsApp(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  console.log("\n=== 📤 sendMessageViaWhatsApp Called (Base64 Fix) ===");
  
  try {
    const phoneNumber = formData.get("PhoneNumber") as string;
    const message1 = formData.get("Message_1") as string;
    const message2 = formData.get("Message_2") as string;
    const patternId = formData.get("PatternID") as string;
    
    const file = formData.get("file") as File | null;
    const countryCode = formData.get("CountryCode") as string || "972";

    if (!phoneNumber) {
        return { success: false, error: "Missing phone number" };
    }

    // 1. נרמול מספר הטלפון
    let fullPhoneNumber = phoneNumber;
    if (fullPhoneNumber.startsWith(countryCode)) {
      fullPhoneNumber = fullPhoneNumber.substring(countryCode.length);
    }
    fullPhoneNumber = fullPhoneNumber.replace(/\D/g, ''); 
    fullPhoneNumber = `${countryCode}${fullPhoneNumber}@c.us`;
    
    // 2. בניית FormData חדש לשליחה לשרת Express
    const apiFormData = new FormData();
    apiFormData.append("PhoneNumber", fullPhoneNumber);

    if (message1) apiFormData.append("Message_1", message1);
    if (message2) apiFormData.append("Message_2", message2);
    if (patternId) apiFormData.append("PatternID", patternId);

    // === תיקון קריטי: המרת שם הקובץ ל-Base64 ===
    if (file && file.size > 0) {
      console.log(`📎 Processing file: ${file.name} | Size: ${file.size}`);
      
      // 1. יצירת "קוד סודי" (Base64) לשם הקובץ בעברית - זה מונע שיבושים
      const fileNameBase64 = Buffer.from(file.name, 'utf8').toString('base64');
      apiFormData.append("FileNameBase64", fileNameBase64);

      // זיהוי סוג קובץ
      let mimeType = file.type || 'application/octet-stream';
      
      // המרה ל-Buffer ואז ל-Blob
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const blob = new Blob([buffer], { type: mimeType });
      
      // 2. שליחת הקובץ עצמו עם שם זמני באנגלית (כדי לא לבלבל את הרשת)
      // השרת יקבל את השם האמיתי מהשדה FileNameBase64 שצירפנו למעלה
      apiFormData.append("file", blob, "temp_file.bin");
      
    } else {
      console.log("📎 No file attached.");
    }

    // 3. שליחה לשרת ה-Express
    const url = `${WHATSAPP_SERVER_URL}/SendMessage`;
    
    const response = await fetch(url, {
      method: "POST",
      body: apiFormData, 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server Error Response:", errorText);
      throw new Error(`Server error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.status === "Success") {
      console.log("✅ Message sent successfully!");
      return { success: true };
    } else {
      console.error("❌ API returned false status:", data);
      return { success: false, error: data.message || "Unknown error" };
    }

  } catch (error: any) {
    console.error("❌ sendMessageViaWhatsApp Error:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

export async function savePatternFile(id: number, file: File | null) {
  if (!file) return { success: true };
  console.log(`💾 Saving file for pattern ${id}: ${file.name}`);
  // כאן אפשר להוסיף לוגיקה לשמירת קובץ תבנית אם צריך בעתיד
  return { success: true }; 
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