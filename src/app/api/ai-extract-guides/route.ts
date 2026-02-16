import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as vision from '@google-cloud/vision';

const prisma = new PrismaClient();

// יצירת לקוח Google Vision
let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    // Google Vision יכול לעבוד עם credentials בשתי דרכים:
    // 1. משתנה סביבה GOOGLE_APPLICATION_CREDENTIALS שמצביע על קובץ JSON
    // 2. העברת credentials ישירות בקוד
    
    // תמיכה במספר משתני סביבה (אם יש לך כבר משתנה אחר)
    const credentials = process.env.GOOGLE_VISION_CREDENTIALS 
                     || process.env.GOOGLE_DRIVE_CREDENTIALS
                     || process.env.GOOGLE_CREDENTIALS;
    
    if (credentials) {
      // אם יש credentials כ-JSON string
      visionClient = new vision.ImageAnnotatorClient({
        credentials: JSON.parse(credentials)
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // אם יש נתיב לקובץ credentials
      visionClient = new vision.ImageAnnotatorClient();
    } else {
      throw new Error("Google Vision credentials not configured");
    }
  }
  return visionClient;
}

async function getDynamicProfessions() {
  try {
    const professions = await prisma.professionTypes.findMany({
      select: { ProfessionName: true }
    });
    return professions.map(p => p.ProfessionName);
  } catch (e) {
    return ["מחול", "ספורט", "מוזיקה", "אילוף כלבים", "העשרה", "שחמט", "חשיבה"];
  }
}

async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const client = getVisionClient();
    
    // הסרת הפרפיקס data:image/...;base64, אם קיים
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    // שליחת התמונה ל-Google Vision
    const [result] = await client.textDetection({
      image: { content: base64Data }
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      throw new Error("לא נמצא טקסט בתמונה");
    }

    // הטקסט המלא הוא באינדקס 0
    const fullText = detections[0].description || "";
    
    console.log("✅ Google Vision extracted text:", fullText.substring(0, 200) + "...");
    
    return fullText;
    
  } catch (error: any) {
    console.error("Google Vision error:", error);
    throw new Error(`שגיאה בזיהוי הטקסט: ${error.message}`);
  }
}

async function analyzeTextWithGroq(text: string, dynamicList: string[]): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Groq API Key is missing");
  }

  const basePrompt = `
    Analyze the text and extract instructor details.

    0. **CRITICAL FILTERING RULE - Read before anything else**:
       - You are looking ONLY for people who are OFFERING their services as instructors (job seekers, freelancers presenting themselves).
       - IGNORE and DO NOT extract any message from an employer, organization, or school that is LOOKING TO HIRE an instructor.
       - How to tell the difference:
         * INCLUDE: "אני מדריך...", "מחפש עבודה", "מציע שירותי", "זמין להדרכה", "ניסיון ב...", "דרוש? לא - אני מציע"
         * EXCLUDE: "דרוש מדריך", "מחפשים מדריך", "נא לפנות אלינו", "משרה פנויה", "אנחנו מגייסים"
       - If a message is from an employer → return it with an empty guides array: { "guides": [] }
    
    1. **Profession Mapping (CRITICAL - STRICT RULES)**:
       - The COMPLETE allowed list is: [${dynamicList.join(", ")}].
       - The output for "Profession" field MUST be one or more of these EXACT strings, copied character by character.
       - FORBIDDEN: ANY word or phrase not copied verbatim from the list above is absolutely prohibited.
       - FORBIDDEN: Do NOT split, combine, shorten, translate, or rephrase items from the list.
       - VALIDATION STEP (mandatory): Before returning, check each word in your answer against the list. If even one word does not appear in the list exactly — remove it.
       - Use your broad general knowledge to find the CLOSEST semantic match from the list. For example: "היפ הופ" → "מחול", "כדורגל" → "ספורט".
       - If multiple matches found, return all separated by comma (e.g., "שחמט, חשיבה").
       - If NO match exists in the list, return an empty string "".
    
    2. **Name Splitting**: 
       - Split full names into "FirstName" (1st word) and "LastName" (rest of the words).
       - If no full name is found in the message body, look for the sender's name in the WhatsApp header format: "~ name ~" or "~name~" and use it as FirstName.
       - Clean the name from special characters like "~", "*", spaces.
       
    3. **CellPhone**: Extract digits only. 
       - STRICT RULE: Remove the leading '0' from Israeli numbers (e.g., return '585333944' instead of '0585333944').
       - Remove any '+', '972', spaces, or parentheses. 
       - Return ONLY the clean digits.

    4. **Notes (SPECIFIC FOCUS & SUMMARY)**:
       - PRIORITY: Extract specific sub-specialties or styles (e.g., if Profession is 'Dance', include 'Hip-Hop' or 'Ballet'; if 'Music', include 'Guitar' or 'Drums').
       - Provide a concise summary of experience and availability (up to 15 words).
       - STRICTLY REMOVE: The City name and the exact main Profession Names (to avoid redundancy).
       - INCLUDE: Vital details like 'היפ הופ', 'פילאטיס מכשירים', 'בעל ניסיון בבתי ספר', or 'זמין לבקרים'.

    5. **City**: 
       - First priority: extract the city where the instructor LIVES if mentioned.
       - Second priority: if no city of residence is mentioned, use the area or city where they TEACH or WORK (e.g., "אזור רחובות", "בתל אביב").
       - If multiple areas mentioned, take the first one.
    
    Return ONLY a valid JSON object:
    { "guides": [{ "FirstName": "...", "LastName": "...", "Profession": "...", "Notes": "...", "CellPhone": "...", "City": "..." }] }
  `;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${apiKey}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a data extraction assistant. Always output valid JSON." },
        { role: "user", content: basePrompt + "\n\nTEXT TO ANALYZE:\n" + text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const aiData = await response.json();
  
  if (!response.ok) {
    throw new Error(aiData.error?.message || "Groq API error");
  }
  
  const content = aiData.choices[0].message.content;
  return JSON.parse(content);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawText, image, isImage } = body;

    console.log("📥 Received request:", { 
      hasRawText: !!rawText, 
      hasImage: !!image, 
      isImage 
    });

    const dynamicList = await getDynamicProfessions();
    let result;

    if (isImage && image) {
      console.log("🖼️ Processing image with Google Vision API...");
      
      // שלב 1: חילוץ טקסט מהתמונה באמצעות Google Vision
      const extractedText = await extractTextFromImage(image);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json({ 
          guides: [],
          message: "לא נמצא טקסט בתמונה"
        });
      }

      console.log("📝 Extracted text length:", extractedText.length, "characters");
      
      // שלב 2: ניתוח הטקסט באמצעות Groq (בדיוק כמו טקסט רגיל)
      console.log("🤖 Analyzing text with Groq...");
      result = await analyzeTextWithGroq(extractedText, dynamicList);

    } else if (rawText) {
      console.log("📝 Processing text with Groq API...");
      result = await analyzeTextWithGroq(rawText, dynamicList);
      
    } else {
      throw new Error("No input provided (neither text nor image)");
    }

    console.log("✅ Final result:", result);

    // וידוא שהתוצאה תקינה
    if (!result || !result.guides) {
      console.error("Invalid result structure:", result);
      return NextResponse.json({ 
        error: "Invalid response structure from AI",
        guides: [] 
      }, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("❌ AI Extraction Error:", error);
    console.error("Stack:", error.stack);
    
    // הודעות שגיאה ברורות למשתמש
    let userMessage = error.message;
    
    if (error.message.includes("credentials")) {
      userMessage = "שגיאה בהגדרות Google Vision. אנא בדוק את ה-credentials.";
    } else if (error.message.includes("quota")) {
      userMessage = "חרגת ממכסת השימוש ב-Google Vision. נסה שוב מאוחר יותר.";
    }
    
    return NextResponse.json({ 
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      guides: []
    }, { status: 500 });
  }
}