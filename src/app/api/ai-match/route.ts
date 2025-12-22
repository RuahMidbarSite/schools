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
            content: `חלץ נתונים ל-JSON בלבד:
            1. "RawSchoolName": שם ביה"ס (למשל: "תחכמוני").
            2. "City": שם העיר (למשל: "חדרה").
            3. "ProgramName": שם התוכנית (למשל: "מוסיקה").
            4. "Weeks": מספר שבועות (למשל: 30).
            5. "LessonsPerDay": מספר שיעורים ביום (למשל: 6).
            6. "PricingPerPaidLesson": מחיר לשיעור (למשל: 487).
            7. "District": אזור/מועצה (למשל: "דרום"). שים לב: חלץ את שם האזור בלבד ללא המילה "אזור".
            8. "Date": תאריך ISO (YYYY-MM-DD).
            9. "ChosenDay": יום בשבוע (א-ו).
            אל תוסיף הערות. אם שדה חסר, החזר "" או 0.`
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