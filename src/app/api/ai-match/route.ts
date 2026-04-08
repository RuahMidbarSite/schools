import { NextResponse } from "next/server";
import { getAllDistricts } from '@/db/generalrequests';

export async function POST(req: Request) {
  try {
    const { text, validPlans } = await req.json();
    const plansListString = validPlans.join(", ");
    const apiKey = process.env.GROQ_API_KEY;
    const districts = await getAllDistricts();
    const validAreas = districts.map(d => d.AreaName).join(", ");
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in data extraction for a School system. The user will provide text in Hebrew. You must extract the relevant information and return a valid JSON object.
rules:
1. You will return only a JSON object, with no explanations or additional text.
2. You will only extract the values that are present in the text and you will not add any value that is not explicitly mentioned in the text.
3. You will return the values in Hebrew as they are mentioned in the text, without any change or translation.
4. If a field is missing: return "" (empty string) for text fields, return 0 for number fields, and return null for the Date field.
5. School Identification: Do NOT confuse program descriptors with the school name. Words like 'הרצאה', 'סדנה', 'תוכנית' or the plan name itself (e.g., 'קיימות') belong to the ProgramName or Plan, NEVER to the RawSchoolName. The school name is typically located adjacent to (either immediately before or after) educational keywords like 'בית ספר', 'ביה"ס', 'תיכון', 'מקיף', 'אולפנה', 'ישיבה', or immediately next to the city name.
6. Flexible 'Plan' Extraction: The user may request a program from this known list: [${plansListString}]. If they request something explicitly, extract it EXACTLY as requested (e.g., if they ask for 'ריקוד', return 'ריקוד' even if it is NOT in the list). If and ONLY IF no specific program topic is mentioned in the text at all, return an empty string "".
7. Days vs. ChosenDay Logic: "Days" represents the optional or available days proposed by the school. "ChosenDay" represents the final scheduled day. By default, any days mentioned in the text MUST go ONLY to the "Days" field, while "ChosenDay" remains empty (""). You will ONLY populate "ChosenDay" if the text explicitly states that a day was finalized, selected, or scheduled (using keywords like 'נקבע', 'שובץ', 'נבחר', 'סופי').
8. Clean Data Extraction: For all fields, extract only the core value. Remove "filler" words like "בית ספר", "ביה"ס", "תוכנית", "תכנית", "העיר", "אזור", or "סוג". 
  Examples: 
  - Instead of "תוכנית מנהיגות", return "מנהיגות".
  - Instead of "בית ספר אגמים", return "אגמים".
  - Instead of "אזור הדרום", return "דרום".
The JSON object should have exactly the following structure:
{
  "RawSchoolName": "School name in Hebrew. Enter only the school name without the city name (e.g., 'תחכמוני')",
  "City": "City name in Hebrew (e.g., 'חדרה')",
  "ProgramName": "The explicit name of the program if provided. If no explicit name is given, this MUST be exactly the same as the 'Plan' field. NEVER put statuses like 'חדש', 'פעיל' or dates in this field. (e.g., 'מוסיקה')",
  "Weeks": "The number of weeks the program will run (e.g., 30)",
  "LessonsPerDay": "Number of lessons per day (e.g., 6)",
  "PricingPerPaidLesson": "Price per lesson: key words: 'מחיר,שח,ש"ח,עולה' (e.g., 487)",
  "District": "Region name in Hebrew only, without the word 'אזור' (e.g., 'דרום')",
  "Date": "ISO date YYYY-MM-DD. Recognize dates even if the word 'תאריך' is missing (e.g., c'1/4/26' or 1.4.26). Handle single-digit days and months by adding leading zeros (e.g., '1/4/26' -> '2026-04-01'). If missing, return null.",
  "Days": "The AVAILABLE or OPTIONAL days proposed by the school. By default, all mentioned days go here. Convert full names to short letters (ראשון->א, שני->ב, שלישי->ג, רביעי->ד, חמישי->ה, שישי->ו). Separate multiple letters with a comma without spaces (e.g., 'א,ג,ה').",
  "ChosenDay": "The FINAL, SCHEDULED day for the program. LEAVE THIS EMPTY (\"\") UNLESS the text explicitly states the day was chosen/scheduled. The days that are chosen/scheduled are only allowed from the 'Days' field. If explicitly scheduled, convert letters to full names (א->ראשון, ב->שני...). Separate multiple days with a comma (e.g., 'ראשון,רביעי').",
  "Plan": "The CORE category or profession of the program (e.g., 'קיימות', 'אנגלית', 'ריקוד'). Extract the raw core topic explicitly requested by the user, even if it is not in your known list. If no specific topic is requested, return empty string \"\".",
  "Grade": "Grade level in Hebrew. Can be a single letter or multiple letters. CRITICAL: Remove quotes from grades 11 and 12 (e.g., change 'י\"א' to 'יא', and 'י\"ב' to 'יב'). Keywords: 'כיתה, כיתות, שכבה' (e.g., 'א' or 'א-ו')",
  "SchoolsContact": "Extract any contact name or phone number mentioned. If a name and phone are both present, return them as 'Name 05X-XXXXXXX'. If missing, return ''.",
  "Product": "group of people that the program is for in Hebrew only from this list: ['תלמידים', 'מורים', 'הורים'] (e.g., 'תלמידים')",
  "FreeLessonNumbers": "Number of free/bonus lessons (e.g., 2)"
}
            }`
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    const aiData = await response.json();
    if (!response.ok) {
      const isRateLimit = response.status === 429 || 
                          JSON.stringify(aiData).toLowerCase().includes("rate limit");
      
      return NextResponse.json(
        { error: aiData.error?.message || "Groq API Error" }, 
        { status: isRateLimit ? 429 : response.status }
      );
    }

    // אם הכל תקין, מחזירים את התוצאה
    return NextResponse.json(JSON.parse(aiData.choices[0].message.content));

  } catch (error: any) {
    console.error("❌ API Error:", error);
    
    // בדיקה נוספת למקרה שהשגיאה קרתה בזמן ה-JSON.parse או ה-fetch
    const isRateLimit = error.message?.toLowerCase().includes("rate limit");
    
    return NextResponse.json(
      { error: "Server Error" }, 
      { status: isRateLimit ? 429 : 500 }
    );
  }
}