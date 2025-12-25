import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // קריאת הנתונים שנשלחו מהלקוח
    const body = await req.json();
    const { prompt } = body;
    
    // שליפת מפתח ה-API משתני הסביבה
    const apiKey = process.env.GROQ_API_KEY;

    // בדיקות תקינות
    if (!apiKey) {
      console.error("❌ Missing GROQ_API_KEY in environment variables");
      return NextResponse.json({ error: "Configuration Error: Missing API Key" }, { status: 500 });
    }

    if (!prompt) {
      console.error("❌ Received request without 'prompt' field");
      return NextResponse.json({ error: "Bad Request: Field 'prompt' is required" }, { status: 400 });
    }

    // שליחה ל-Groq API
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
            // הנחיה קריטית: המערכת מחזירה אך ורק JSON תקני
            content: "You are a helpful assistant designed to output valid JSON only. Do not include any explanation, markdown formatting, or conversational text outside the JSON object."
          },
          {
            role: "user",
            content: prompt // ההנחיה המלאה (כולל רשימת המועמדים ודרישות ה-JSON)
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // יצירתיות נמוכה לדיוק בפורמט ובעובדות
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Groq API Error:", errorData);
        return NextResponse.json({ error: "External API Error", details: errorData }, { status: response.status });
    }

    // פענוח התשובה
    const aiData = await response.json();
    const content = aiData.choices[0].message.content;

    // המרה ל-JSON לפני השליחה ללקוח
    try {
        const jsonContent = JSON.parse(content);
        return NextResponse.json(jsonContent);
    } catch (parseError) {
        console.error("❌ Failed to parse AI response as JSON:", content);
        return NextResponse.json({ error: "Invalid JSON response from AI", raw: content }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ Server Error in route-placement:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}