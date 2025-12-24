import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { candidates, programDetails, count } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;
    const candidatesToSelect = count || 1;

    console.log(`🚀 [Server] Processing request for: ${programDetails?.city}, Candidates: ${candidates?.length}`);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ matches: [], explanation: "No candidates provided" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert Israeli HR recruiter.
            
            **Mission:** Select the TOP ${candidatesToSelect} best instructors for a program in: "${programDetails.city}" (${programDetails.area}).
            **Required Profession:** "${programDetails.profession}".

            **Rules:**
            1. **Profession Match (Critical):** Must have "${programDetails.profession}" (or very similar).
            2. **Location:** Prioritize low 'dbDistance'. If missing, use geographic knowledge (e.g., Rehovot is close to Ness Ziona).
            
            **Output:**
            Strict JSON only. No markdown code blocks. No extra text.
            Structure: { "matches": [ { "id": 123, "explanation": "..." } ] }
            If no match, return { "matches": [] }`
          },
          {
            role: "user",
            content: `Candidates: ${JSON.stringify(candidates)}`
          }
        ],
        // ביטול response_format קשיח לפעמים עוזר במודלים מסוימים, אבל נשאיר אם זה עובד לרוב
        response_format: { type: "json_object" }, 
        temperature: 0.1 // הורדת יצירתיות כדי לקבל JSON יציב
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Groq API Error:", errText);
        throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // --- הגנה מפני קריסת JSON ---
    let result;
    try {
        result = JSON.parse(aiContent);
    } catch (parseError) {
        console.error("JSON Parse Failed. Raw content:", aiContent);
        // ניסיון לנקות Markdown אם קיים
        const cleanJson = aiContent.replace(/```json|```/g, '').trim();
        try {
            result = JSON.parse(cleanJson);
        } catch (retryError) {
             return NextResponse.json({ error: "Invalid JSON from AI", raw: aiContent }, { status: 500 });
        }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("🔥 [Server Logic Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}