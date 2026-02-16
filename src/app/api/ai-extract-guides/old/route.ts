import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawText, image, isImage } = body;

    const dynamicList = await getDynamicProfessions();

    const basePrompt = `
    Analyze the content and extract instructor details.

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

    let result;

    if (isImage && image) {
      // שימוש ב-Claude API עם Vision
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error("Anthropic API Key is missing");
      }

      // הסרת הפרפיקס data:image/...;base64, אם קיים
      const base64Data = image.includes('base64,') 
        ? image.split('base64,')[1] 
        : image;

      // זיהוי סוג התמונה
      let mediaType = "image/jpeg";
      if (image.includes('image/png')) mediaType = "image/png";
      else if (image.includes('image/gif')) mediaType = "image/gif";
      else if (image.includes('image/webp')) mediaType = "image/webp";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: "text",
                  text: basePrompt + "\n\nExtract the instructor information from this image. If the image contains text from WhatsApp or any messaging app, extract all relevant details."
                }
              ],
            },
          ],
        }),
      });

      const aiData = await response.json();
      
      if (aiData.error) {
        throw new Error(aiData.error.message || "Claude API error");
      }

      const content = aiData.content[0].text;
      
      // ניקוי התשובה מ-markdown code blocks אם קיימים
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);

    } else if (rawText) {
      // שימוש ב-Groq API לטקסט בלבד (הפונקציונליות המקורית)
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error("Groq API Key is missing");
      }

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
            { role: "user", content: basePrompt + "\n\nTEXT TO ANALYZE:\n" + rawText }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      const aiData = await response.json();
      const content = aiData.choices[0].message.content;
      result = JSON.parse(content);
    } else {
      throw new Error("No input provided");
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}