import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { program, candidates } = body; 
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

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
            content: `You are an Expert Educational Consultant for "Ruach Midbar". 
            Your goal is to evaluate EVERY candidate provided, score them realistically from 0 to 100, and provide a clear, natural recommendation reason in Hebrew.

            ### OUTPUT FORMAT (JSON ONLY):
            {
              "recommendations": [
                {
                  "name": "שם המדריך",
                  "score": 75,
                  "reason": "הסבר מפורט וטבעי בעברית הכולל את המרחק, מקצועות, והתייחסות להערות. למשל: 'מתאים לתוכנית בזכות קרבה גיאוגרפית וקורות חיים מרשימים, למרות זמינות חלקית בימי הפעילות.'"
                }
              ],
              "summary": "סיכום קצר של ההמלצה הכללית לבחירת המועמדים המובילים."
            }

            ### CRITICAL ANTI-HALLUCINATION RULE:
            You MUST evaluate ONLY the candidates explicitly provided in the 'CANDIDATES' JSON. NEVER invent, hallucinate, or generate random names. If a name is not in the JSON array, DO NOT include it.

            ### STRICT SCORING FORMULA (Calculate internally, DO NOT output the math):
            100% means a "Perfect Unicorn Candidate". Calculate the score using this exact logic. 
            FINAL SCORE MUST BE BETWEEN 0 AND 100. If the calculation results in <0, set to 0. If >100, set to 100.

            1. BASE SCORE BY DISTANCE (Max 60 points):
               - Distance 0-20 km: Base = 60
               - Distance 21-40 km: Base = 45
               - Distance 41-70 km: Base = 30
               - Distance 71-100 km: Base = 15
               - Distance 100+ km: Base = 5
               - If distance is 'לא ידוע', Base = 35.

            2. GENERAL BONUSES (Add to base):
               - If 'hasCV' is true: Add +10 points.
               - If 'isAssigned' is true (experience): Add +10 points.

            3. NOTES SENTIMENT ANALYSIS & PENALTIES (CRITICAL):
               You MUST read the 'notes' field like a human HR manager and adjust the score:
               - SEVERE NEGATIVE (e.g., "בעייתי", "לא מומלץ", bad behavior): Subtract -50 to -80 points!
               - POSITIVE NOTES (e.g., "מומלץ מאוד", "מעולה"): Add +10 to +30 points.
               - DISTANCE ISSUE IN NOTES: If notes mention they are "רחוק" or "לא יכול להגיע", Subtract -30 points.
               - WRONG PROFESSION: If the program asks for a specific topic (e.g., 'לחימה') and they don't have it, Subtract -70 points.

            4. AVAILABILITY & SCHEDULE PENALTIES:
               - NO CONFLICT: If notes are empty or do not mention the program's days, assume full availability. (No penalty).
               - PARTIAL CONFLICT (Limited Flexibility): If the program offers multiple days (e.g., "א, ב, ג") and the candidate is ONLY available for SOME of them, Subtract -10 points.
               - FULL CONFLICT (Disqualified): If the notes explicitly prove the candidate CANNOT work on ALL of the program's proposed days, subtract -70 points.

            5. VIP LOGIC: Only when the program plan is "מותאמת" or "טיפול" or empty "":
               - If the candidate HAS "מותאמת" or "טיפול" in their professions: Add a MASSIVE +35 points.
               - For each profession they have that matches the program's needs: Add +5 points.

            ### REASONING & FORMATTING RULES (STRICT):
            - Write reasons ONLY IN HEBREW.
            -  DO NOT EXPLAIN THE MATH: NEVER mention points, base scores, or subtractions in the 'reason' field (e.g., DO NOT write "הוספנו 10 נקודות" or "העניק לו 60 נקודות"). The reason MUST sound like a natural human evaluation.
            -  SORTING: You MUST sort the "recommendations" array from the highest score to the lowest score before outputting the JSON.`
          },
          {
            role: "user",
            content: `PROGRAM DETAILS: ${JSON.stringify(program)}\nCANDIDATES: ${JSON.stringify(candidates)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, 
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      return NextResponse.json({ error: "Groq API Error", details: errorDetails }, { status: response.status });
    }

    const aiData = await response.json();
    const jsonResponse = JSON.parse(aiData.choices[0].message.content);
    
    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error("❌ API AI Consultation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}