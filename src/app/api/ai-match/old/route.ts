import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

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
1. you will return only a JSON object, with no explanations or additional text.
2. you will only ectract the values that are present in the text and you will not add any value that is not explicitly mentioned in the text.
3. you will return the values in hebrew as they are mentioned in the text, without any change or translation.
4. If a field is missing: return "" (empty string) for text fields, return 0 for number fields, and return null for the Date field. examples: "ProgramName": "".
5. Clean Data Extraction: For all fields, extract only the core value. Remove "filler" words like "בית ספר", "ביה"ס", "תוכנית", "תכנית", "העיר", "אזור", or "סוג". 
   Examples: 
   - Instead of "תוכנית מנהיגות", return "מנהיגות".
   - Instead of "בית ספר אגמים", return "אגמים".
   - Instead of "אזור הדרום", return "דרום".

the JSON object should have the following structure:
{
  "RawSchoolName": "School name in Hebrew (e.g., 'תחכמוני')",
  "City": "City name in Hebrew (e.g., 'חדרה')",
  "ProgramName": "Program name in Hebrew (e.g., 'מוסיקה')",
  "Weeks": "The number of weeks the program will run (e.g., 30)",
  "LessonsPerDay": "Number of lessons per day (e.g., 6)",
  "PricingPerPaidLesson": "Price per lesson (e.g., 487)",
  "District": "Region name in Hebrew only, without the word 'אזור' (e.g., 'דרום')",
  "Date": "ISO date YYYY-MM-DD",
  "ChosenDay": "Day of the week in Hebrew (e.g., 'ראשון')"
}`
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    const aiData = await response.json();
    return NextResponse.json(JSON.parse(aiData.choices[0].message.content));
  } catch (error: any) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}