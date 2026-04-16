import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as vision from '@google-cloud/vision';
import { PDFParse } from 'pdf-parse';// pdf library for parsing PDF files
import { getAllDistricts } from '@/db/generalrequests';

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
  const districts = await getAllDistricts();
  const validAreas = districts.map(d => d.AreaName).join(", ");
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

    4. **Notes (CRITICAL DISPATCH INFO & SUMMARY)**:
      - PRIORITY 1 (Sub-specialties): Extract specific styles/instruments not in the main profession (e.g., 'Hip-Hop', 'Guitar', 'פילאטיס מכשירים').
      - PRIORITY 2 (Availability & Schedule): Explicitly note specific days/hours they CAN or CANNOT work, and if they seek full-time/part-time (משרה מלאה/חלקית).
      - PRIORITY 3 (Target Audience): Note preferences for specific age groups or education stages (e.g., 'יסודי', 'נוער', 'הגיל הרך').
      - PRIORITY 4 (Logistics & Constraints): Mention any missing equipment, special requirements, or mobility/travel limits.
      - STRICTLY REMOVE: The City name and the exact main Profession Names (to avoid redundancy).
      - FORMATTING: Keep it extremely concise, punchy, and highly scannable. Maximum 20-25 words. Use commas or short phrases instead of full sentences.
      - EXAMPLE OUTPUT: "היפ הופ וברייקדאנס, מעדיף יסודי. פנוי א,ג,ה בבוקר. חסר בידורית. לא עובד עם נוער."

    5. **City**: 
       - First priority: extract the city where the instructor LIVES if mentioned.
       - Second priority: if no city of residence is mentioned, use the area or city where they TEACH or WORK (e.g., "אזור רחובות", "בתל אביב").
       - If multiple areas mentioned, take the first one.

    6. **Area Mapping (NEW - CRITICAL)**:
       - The ONLY allowed Areas are: [${validAreas}].
       - If an Area is mentioned, use it.
       - IMPORTANT: If NO Area is mentioned but a City is found, use your knowledge of Israel to map the City to the most logical Area from the list above.
       - Example: "תל אביב" -> "מרכז", "חיפה" -> "צפון", "באר שבע" -> "דרום".
       - Return EXACTLY one name from the list above. If unknown, return ""

    7. **hourlyRate**: If an hourly rate is mentioned, extract it as a number. Remove any currency symbols or text (e.g., "₪", "ש"ח", "לשעה") and return only the digits.

    Return ONLY a valid JSON object:
    { "guides": [{ "FirstName": "...", "LastName": "...", "Profession": "...", "Notes": "...", "CellPhone": "...", "City": "..." , "Area": "..." }] }
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
    const { rawText, image, isImage, file } = body; // get the file field from the request body 

    console.log("📥 Received request:", { 
      hasRawText: !!rawText, 
      hasImage: !!image, 
      hasFile: !!file,
      isImage 
    });

    const dynamicList = await getDynamicProfessions();
    let result;
    let textToAnalyze = ""; // the returned text

    if (isImage && image) {
      console.log("🖼️ Processing image with Google Vision API...");
      textToAnalyze = await extractTextFromImage(image);
    } 
    else if (rawText) {
      console.log("📝 Processing text with Groq API...");
      textToAnalyze = rawText;
    } 
    else if (file) {
      console.log("📄 Processing PDF file...");
      // Base64 decode the file and parse it with PDFParse
      const pdfBuffer = Buffer.from(file, 'base64');
      const parser = new PDFParse({ data: pdfBuffer });
      const pdfResult = await parser.getText();
      textToAnalyze = pdfResult.text;
      await parser.destroy();
    } 
    else {
      throw new Error("No input provided (neither text, image nor file)");
    }

    if (textToAnalyze) {
      console.log("🤖 Analyzing text with Groq...");
      result = await analyzeTextWithGroq(textToAnalyze, dynamicList);
    }

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

    // 🌟 התיקון כאן: בודקים אם השגיאה קשורה למכסה (Rate Limit)
    const errorMsg = error.message || "";
    const isRateLimit = errorMsg.toLowerCase().includes("rate limit") || 
                        errorMsg.includes("429");

    return NextResponse.json({ 
      error: errorMsg,
      guides: []
    }, { 
      status: isRateLimit ? 429 : 500 // אם זה Rate Limit, מחזירים 429
    });
  }
}