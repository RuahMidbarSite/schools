import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getDynamicProfessions() {
  try {
    // שליפת המקצועות המעודכנים מה-DB שלך
    const professions = await prisma.professionTypes.findMany({
      select: { ProfessionName: true }
    });
    return professions.map(p => p.ProfessionName);
  } catch (e) {
    // רשימת גיבוי למקרה של תקלה בתקשורת עם ה-DB
    return ["מחול", "ספורט", "מוזיקה", "אילוף כלבים", "העשרה", "שחמט", "חשיבה"];
  }
}

export async function POST(req: Request) {
  try {
    const { rawText } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("Groq API Key is missing");
    }

    const dynamicList = await getDynamicProfessions();

    const prompt = `
    Analyze the text and extract instructor details.
    
  1. **Profession Mapping (CRITICAL - STRICT RULES)**:
       - You MUST ONLY choose from this exact list: [${dynamicList.join(", ")}].
       - FORBIDDEN: Do NOT invent new professions. Do NOT use ANY word that is not in the list above.
       - Use your broad general knowledge to find the CLOSEST semantic match from the list.
         For example: even if the text says "היפ הופ" and the list contains "מחול" — you must recognize that hip-hop is a dance style and return "מחול".
         Think like a domain expert: what category from the list best describes this activity?
       - If multiple matches found, return all separated by comma (e.g., "שחמט, חשיבה").
       - If absolutely NO reasonable match exists in the list, return an empty string "".
    
    2. **Name Splitting**: Split full names into "FirstName" (1st word) and "LastName" (rest of the words).

   "3. **CellPhone**: Extract digits only. 
   - STRICT RULE: Remove the leading '0' from Israeli numbers (e.g., return '585333944' instead of '0585333944').
   - Remove any '+', '972', spaces, or parentheses. 
   - Return ONLY the clean digits."

    4. **Notes (BALANCED SUMMARY)**:
       - Provide a concise summary of experience and availability (up to 15 words).
       - STRICTLY REMOVE: The City name and the exact Profession Names (to avoid redundancy).
       - INCLUDE: Vital details like 'בעל ניסיון בבתי ספר', 'עבודה עם חינוך מיוחד', or 'זמין לבקרים'.

    5. **City**: Extract the city/location if mentioned.

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
          { role: "user", content: prompt + "\n\nTEXT TO ANALYZE:\n" + rawText }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // טמפרטורה נמוכה לשמירה על דיוק ועקביות
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}