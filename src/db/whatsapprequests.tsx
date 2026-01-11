"use client";

// WhatsApp server configuration - use environment variable
const WHATSAPP_SERVER_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';

// Debug: Log the URL on module load
if (typeof window !== 'undefined') {
  console.log('🌐 WhatsApp Server URL configured:', WHATSAPP_SERVER_URL);
}

/**
 * Send message via WhatsApp
 */
export async function sendMessageViaWhatsApp(
  message_1: string, 
  message_2: string, 
  addedFile: File | null, 
  cellPhone: string, 
  countryCode: string, 
  PatternID?: number
) {
  try {
    console.log('📤 Starting WhatsApp message send...');
    console.log('📤 Server URL:', WHATSAPP_SERVER_URL);
    
    // Clean phone number - remove leading zero
    let cleanPhone = cellPhone;
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Build full phone number with WhatsApp format
    const fullPhoneNumber = `${countryCode}${cleanPhone}@c.us`;
    console.log('📞 Full phone number:', fullPhoneNumber);

    // Build form data
    const formData = new FormData();
    formData.append('PhoneNumber', fullPhoneNumber);
    
    if (message_1) {
      formData.append('Message_1', message_1);
      console.log('📝 Message 1:', message_1.substring(0, 50) + '...');
    }
    
    if (message_2) {
      formData.append('Message_2', message_2);
      console.log('📝 Message 2:', message_2.substring(0, 50) + '...');
    }
    
    if (addedFile) {
      formData.append('file', addedFile);
      console.log('📎 File:', addedFile.name, `(${addedFile.size} bytes)`);
    }
    
    if (PatternID) {
      formData.append('PatternID', String(PatternID));
      console.log('📖 Pattern ID:', PatternID);
    }

    const url = `${WHATSAPP_SERVER_URL}/SendMessage`;
    console.log('🌐 Sending POST to:', url);

    // Send request
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Remove Content-Type header - let browser set it with boundary for FormData
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error response:', errorText);
      return { 
        success: false, 
        error: `Server returned ${response.status}: ${errorText}` 
      };
    }
    
    const result = await response.json();
    console.log('✅ Success! Result:', result);
    
    return { 
      success: true, 
      data: result 
    };
    
  } catch (error) {
    console.error('❌ Request failed with error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: `Cannot connect to WhatsApp server at ${WHATSAPP_SERVER_URL}. Is the server running?`
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Save pattern file
 */
export async function savePatternFile(PatternID: number, addedFile: File | null) {
  try {
    if (!addedFile) {
      console.warn('⚠️ No file provided for pattern', PatternID);
      return { success: false, error: 'No file provided' };
    }

    console.log('💾 Saving file for pattern:', PatternID);

    const formData = new FormData();
    formData.append('file', addedFile);

    const url = `${WHATSAPP_SERVER_URL}/SavePatternFile/${PatternID}`;
    console.log('🌐 Sending POST to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error saving file:', errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log('✅ File saved successfully');
    
    return { 
      success: true, 
      data: result 
    };
    
  } catch (error) {
    console.error('❌ Error saving pattern file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete pattern file
 */
export async function deletePatternFile(PatternID: number) {
  try {
    console.log('🗑️ Deleting file for pattern:', PatternID);

    const url = `${WHATSAPP_SERVER_URL}/DeletePatternFile/${PatternID}`;
    console.log('🌐 Sending DELETE to:', url);
    
    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error deleting file:', errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.text();
    console.log('✅ File deleted successfully');
    
    return { 
      success: true, 
      data: result 
    };
    
  } catch (error) {
    console.error('❌ Error deleting pattern file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}