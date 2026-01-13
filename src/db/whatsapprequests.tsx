  // whatsapprequests.tsx - פונקציה מעודכנת לשליחת הודעות

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
  console.log("⏰ Time:", new Date().toISOString());
  console.log("📞 Phone:", phoneNumber);
  console.log("🌍 Country code:", countryCode);
  console.log("💬 Message 1:", message1?.substring(0, 50));
  console.log("💬 Message 2:", message2?.substring(0, 50) || "empty");
  console.log("📎 File:", file?.name || "no file");
  console.log("🆔 Pattern ID:", patternId || "none");
  
  try {
    // Prepare phone number
    let fullPhoneNumber = phoneNumber;
    
    // Remove any existing country code
    if (fullPhoneNumber.startsWith(countryCode)) {
      fullPhoneNumber = fullPhoneNumber.substring(countryCode.length);
    }
    
    // Remove any non-digits
    fullPhoneNumber = fullPhoneNumber.replace(/\D/g, '');
    
    // Add country code and @c.us
    fullPhoneNumber = `${countryCode}${fullPhoneNumber}@c.us`;
    
    console.log("📱 Full phone number:", fullPhoneNumber);

    // Prepare FormData
    const formData = new FormData();
    formData.append("PhoneNumber", fullPhoneNumber);

    if (message1 && message1.trim()) {
      console.log("➕ Adding Message_1");
      formData.append("Message_1", message1);
    }

    if (message2 && message2.trim()) {
      console.log("➕ Adding Message_2");
      formData.append("Message_2", message2);
    }

    if (file) {
      console.log("➕ Adding file:", file.name, `(${file.size} bytes)`);
      formData.append("file", file);
    }

    if (patternId) {
      console.log("➕ Adding PatternID:", patternId);
      formData.append("PatternID", patternId.toString());
    }

    // Send request
    const url = `${WHATSAPP_SERVER_URL}/SendMessage`;
    console.log("🌐 Sending POST to:", url);
    console.log("⏰ Time:", new Date().toISOString());

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    console.log("📥 Response status:", response.status);
    console.log("📥 Response ok:", response.ok);
    console.log("⏰ Time:", new Date().toISOString());

    const data = await response.json();
    console.log("📦 Response data:", data);

    if (!response.ok) {
      const errorMsg = data.message || `Server error ${response.status}`;
      console.error("❌ Server error:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    if (data.status === "Success") {
      console.log("✅ Message sent successfully!");
      console.log("📊 Message count:", data.messageCount);
      return { success: true };
    } else {
      console.error("❌ Unexpected response:", data);
      return {
        success: false,
        error: data.message || "Unknown error",
      };
    }
  } catch (error: any) {
    console.error("❌ sendMessageViaWhatsApp Error:", error);
    console.log("⏰ Error time:", new Date().toISOString());
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}