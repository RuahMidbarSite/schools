// הוסר "use server" - הפונקציות ירוצו בצד הלקוח כדי לאפשר העברת קבצים (File)
const WHATSAPP_SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "http://localhost:3994";

// פונקציית עזר להמרת שם קובץ ל-Base64 (תומכת בעברית בדפדפן)
const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));

export async function sendMessageViaWhatsApp(
  message1: string,
  message2: string,
  file: File | null,
  phoneNumber: string,
  countryCode: string = "972",
  patternId?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    let fullPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (!fullPhoneNumber.startsWith(countryCode)) {
        fullPhoneNumber = `${countryCode}${fullPhoneNumber}`;
    }
    fullPhoneNumber = `${fullPhoneNumber}@c.us`;

    const formData = new FormData();
    formData.append("PhoneNumber", fullPhoneNumber);
    if (message1) formData.append("Message_1", message1);
    if (message2) formData.append("Message_2", message2);
    
    if (file && file.size > 0) {
      formData.append("FileNameBase64", toBase64(file.name));
      formData.append("file", file); 
    }
    
    if (patternId) formData.append("PatternID", patternId.toString());

    const response = await fetch(`${WHATSAPP_SERVER_URL}/SendMessage`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.status === "Success" ? { success: true } : { success: false, error: data.message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function savePatternFile(id: number, file: File | null) {
  if (!file) return { success: true };
  
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("FileNameBase64", toBase64(file.name));
    
    // שליחה לכתובת עם ה-ID ב-URL כפי שהשרת מצפה
    const response = await fetch(`${WHATSAPP_SERVER_URL}/SavePatternFile/${id}`, {
      method: "POST",
      body: formData,
    });
    
    return { success: response.ok };
  } catch (error) {
    console.error("❌ שגיאה בשמירת קובץ:", error);
    return { success: false };
  }
}

export async function getPatternFile(patternId: number): Promise<File | null> {
  try {
    const response = await fetch(`${WHATSAPP_SERVER_URL}/GetPatternFile/${patternId}`);
    if (!response.ok) return null;

    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'file.bin';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/);
      if (fileNameMatch) fileName = decodeURIComponent(fileNameMatch[1]);
    }

    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    return null;
  }
}

export async function deletePatternFile(patternId: number) {
  try {
    await fetch(`${WHATSAPP_SERVER_URL}/DeletePatternFile/${patternId}`, { method: 'DELETE' });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}