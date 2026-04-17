import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as vision from '@google-cloud/vision';
import { parseOffice } from 'officeparser';
import { getAllDistricts } from '@/db/generalrequests';

const prisma = new PrismaClient();

let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    const credentialsStr = process.env.GOOGLE_CREDENTIALS || 
                           process.env.GOOGLE_VISION_CREDENTIALS || 
                           process.env.GOOGLE_DRIVE_CREDENTIALS;

    let initialized = false;

    if (credentialsStr) {
      try {
        let credentials = JSON.parse(credentialsStr);
        
        if (credentials.private_key && typeof credentials.private_key === 'string') {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

        visionClient = new vision.ImageAnnotatorClient({ credentials });
        console.log("✅ Vision Client initialized using JSON string from ENV");
        initialized = true;
      } catch (e) {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          console.error("❌ Failed to parse GOOGLE_CREDENTIALS JSON:", e.message);
        }
      }
    }

    if (!initialized && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        visionClient = new vision.ImageAnnotatorClient();
        console.log("🏠 Vision Client initialized using local file path");
        initialized = true;
      } catch (e) {
        console.error("❌ Failed to initialize Vision Client from local path:", e.message);
      }
    }

    if (!visionClient) {
      throw new Error("Google Vision credentials missing. Set GOOGLE_CREDENTIALS (JSON) or GOOGLE_APPLICATION_CREDENTIALS (Path)");
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
    
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const [result] = await client.textDetection({
      image: { content: base64Data }
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      throw new Error("לא נמצא טקסט בתמונה");
    }

    const fullText = detections[0].description || "";
    
    console.log("✅ Google Vision extracted text:", fullText.substring(0, 200) + "...");
    
    return fullText;
    
  } catch (error: any) {
    console.error("Google Vision error:", error);
    throw new Error(`שגיאה בזיהוי הטקסט: ${error.message}`);
  }
}

async function analyzeTextWithGroq(text: string, dynamicList: string[], typeOfInput: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Groq API Key is missing");
  }
  const districts = await getAllDistricts();
  const validAreas = districts.map(d => d.AreaName).join(", ");

  //base prompt with critical rules and dynamic profession list
  const baseRules = `
    Analyze the text and extract instructor details.

    ### GLOBAL LANGUAGE RULE (CRITICAL):
    - ALL extracted text fields in the JSON MUST be in HEBREW.
    - NEVER return English characters in any text field. This is a hard constraint.
    
    1. **Profession Mapping (CRITICAL - ANTI-HALLUCINATION)**:
       - The COMPLETE allowed list is: [${dynamicList.join(", ")}].
       - Output for "Profession" MUST be one or more of these EXACT strings.
       - Use semantic matching (e.g., "כלכלה" -> "פיננסי").
       - CRITICAL: The ACTUAL original job titles used by the person (e.g., 'יוצרת תוכן', 'סטייליסטית אישית') MUST be written in the "Notes" field.
       - If NO semantic match exists in the allowed list, return "". Do NOT force a match.
    
    2. **Name Splitting**: 
       - Split into "FirstName" and "LastName". Clean special characters.
       
    3. **CellPhone**: Extract digits only. Remove leading '0' (e.g., '546560170').

    4. **Notes (DECISION-READY TAGS - DO NOT INVENT)**:
      - Create a functional summary to help a manager or AI match this instructor to programs.
      - INCLUDE (if found): Original job titles, years of experience, specific niches (e.g. דימוי גוף), population experience (e.g. נוער בסיכון), mobility (ניידות), hourly rate, and availability.
      - DO NOT include the City or the mapped Profession name to avoid redundancy.
      - CRITICAL: If a detail is NOT mentioned, SKIP IT. Never guess.
      - FORMATTING: Comma-separated tags, concise, maximum 25 words.

    5. **Area Mapping**:
       - Map the City to exactly one Area from: [${validAreas}].

    6. **hourlyRate**: Extract number only if mentioned.
  `;

  // additional rules for when the input is a message
  const messageRules = `
    0. **CRITICAL FILTERING RULE**:
       - Extract ONLY if offering services. Ignore hiring ads.
       
    X. **WhatsApp Name Extraction**:
       - Check for "~ name ~" format if name is not in text.
       
    Y. **Notes Weighting (LOGISTICS FOCUS)**:
       - For messages, PRIORITIZE availability (days/hours), hourly rate, and mobility.
       - Example: "סטייליסטית אישית, פנויה בראשון ורביעי, 300 שח לשעה, ניידת עם רכב."
  `;

  // additional rules for when the input is a CV or resume
  const cvRules = `
    0. **CV/RESUME BYPASS**: 
       - Formal document. Process fully.
       
    X. **Holistic Name Extraction**:
       - Look at the very top or under 'פרטים אישיים'.
       
    Y. **Notes Weighting (PROFESSIONAL FOCUS)**: 
       - For CVs, PRIORITIZE seniority, specific original titles (e.g., 'מנהלת תוכן'), certifications (e.g., 'תעודת הוראה'), and specific niches.
       - Example: "כלכלנית וסטייליסטית אישית, ידע בדימוי גוף לילדים ונוער, ניידת, עוסק פטור."
  `;

 // Combine base rules with conditional rules based on input type
  let finalPrompt = baseRules;
  if (typeOfInput === "pdf" || typeOfInput === "docx") {
    finalPrompt += "\n\n### CV SPECIFIC INSTRUCTIONS:\n" + cvRules;
  } else {
    finalPrompt += "\n\n### MESSAGE SPECIFIC INSTRUCTIONS:\n" + messageRules;
  }

  finalPrompt += `
    \nReturn ONLY a valid JSON object:
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
        { role: "user", content: finalPrompt + "\n\nTEXT TO ANALYZE:\n" + text }
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
    const { rawText, image, isImage, file } = body;

    console.log("📥 Received request:", {
      hasRawText: !!rawText,
      hasImage: !!image,
      hasFile: !!file,
      isImage
    });

    const dynamicList = await getDynamicProfessions();
    let result;
    let typeOfInput;
    let textToAnalyze = "";

    if (isImage && image) {
      console.log("🖼️ Processing image with Google Vision API...");
      typeOfInput = "image";
      textToAnalyze = await extractTextFromImage(image);
    } 
    else if (rawText) {
      console.log("📝 Processing text with Groq API...");
      typeOfInput = "text";
      textToAnalyze = rawText;
    } 
    else if (file) {
      const fileBuffer = Buffer.from(file, 'base64');
      const fileSignature = fileBuffer.toString('utf8', 0, 4);

      if (fileSignature.startsWith('PK')) {
        console.log("📂 Processing Word file with officeparser...");
        const ast = await parseOffice(fileBuffer);
        typeOfInput="docx";
        textToAnalyze = ast.toText();
      } 
     else if (fileSignature.startsWith('%PDF')) {
        console.log("📄 Processing PDF file with Google Vision OCR...");
        typeOfInput = "pdf";
        
        const client = getVisionClient();
        
        const request = {
          requests: [
            {
              inputConfig: {
                content: fileBuffer.toString('base64'),
                mimeType: 'application/pdf',
              },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' as const }], 
            },
          ],
        };

        const [result] = await client.batchAnnotateFiles(request);
        
        const fileResponses = result.responses?.[0]?.responses || [];
        let combinedText = "";
        
        for (const pageResponse of fileResponses) {
          if (pageResponse.fullTextAnnotation) {
            combinedText += pageResponse.fullTextAnnotation.text + "\n\n";
          }
        }
        
        if (!combinedText.trim()) {
           throw new Error("Google Vision failed to extract text from this PDF.");
        }
        
        textToAnalyze = combinedText;
        console.log("✅ PDF Text extracted perfectly using Google Vision");
      }
      else {
        throw new Error("Unsupported file type. Please provide a PDF or DOCX file.");
      }
    } 
    else {
      throw new Error("No input provided (neither text, image nor file)");
    }

    if (textToAnalyze) {
      if (textToAnalyze.length > 8000) {
        console.log("✂️ Text too long, trimming to 8000 characters");
        textToAnalyze = textToAnalyze.substring(0, 8000);
      }
      
      console.log("🤖 Analyzing text with Groq...");
      result = await analyzeTextWithGroq(textToAnalyze, dynamicList,typeOfInput);
    }

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
    const errorMsg = error.message || "";
    const isRateLimit = errorMsg.toLowerCase().includes("rate limit") || errorMsg.includes("429");

    return NextResponse.json({
      error: errorMsg,
      guides: []
    }, {
      status: isRateLimit ? 429 : 500
    });
  }
}