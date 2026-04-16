import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { program, candidates, aiCount } = body;
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
            content: `You are the Expert Recruitment Matcher for "Ruah Midbar". 
            Your EXACT goal is to find and return the TOP ${aiCount || 1} WINNING candidates.

            ### OUTPUT INSTRUCTIONS (CRITICAL):
            Return a valid JSON object EXACTLY like this structure:
            
            {
              "internal_analysis": "MANDATORY CHECKLIST: For EVERY candidate, state their ID and evaluate: 1. Profession Match (Pass/Fail) 2. Schedule Match (Pass/Fail) 3. Distance. End with a strict DISQUALIFIED or QUALIFIED status.",
              "matches": [
                { 
                  "id": "WINNER_ID", 
                  "explanation": "Only Hebrew text. Max 10-30 words. Focus ONLY on the winner and his reasons for qualification. Create a complete, natural sentence using these exact phrases if applicable: 'התאמה מקצועית', 'התאמה בלוח זמנים', 'התאמה לקהל היעד/עומס', 'קרבה יחסית', 'צירף קורות חיים', 'מדריך ששובץ בעבר', 'התאמה לפי הערות'."
                }
              ]
            }

            - You must return UP TO ${aiCount || 1} candidates in the "matches" array.
            - CRITICAL RULE: If fewer than ${aiCount || 1} candidates pass the strict ELIMINATION rules, return ONLY the ones who passed. 
            - NEVER pad the list with disqualified candidates just to reach the requested count. It is perfectly fine to return a smaller array (or even an empty array []) if not enough candidates are fully qualified.
            - The "matches" array must ONLY contain the final, winning candidates. 
            - NEVER write negative explanations like "לא נבחר" (was not selected) inside the explanation field. If you are writing "לא נבחר", that candidate's ID should NOT be in this array!
            
            ### TWO-STEP MATCHING PROCESS (FOLLOW STRICTLY):

            STEP 1: ELIMINATION (You MUST run this checklist in 'internal_analysis')
            - PROFESSION MISMATCH: 
              * If program 'plan' has a specific topic (like 'ספורט'), candidate MUST match it.
              * If program 'plan' is empty or "מותאמת", treat ALL candidates as a perfect profession match (SKIP this elimination).
            - UNAVAILABLE: Notes say "busy", "abroad", or "לא לשבץ". If notes are empty, treat as AVAILABLE.
            - SCHEDULE COLLISION (CRITICAL): The program's 'days' represent OPTIONAL days (e.g., "א,ב" means Sunday OR Monday).
              * HEBREW DAYS: א=ראשון, ב=שני, ג=שלישי, ד=רביעי, ה=חמישי, ו=שישי.
              * THE "AT LEAST ONE" RULE: A candidate is QUALIFIED if they are available for AT LEAST ONE of the program's days.
              * HANDLING NEGATIVE NOTES ("לא יכול ב..."): If a candidate lists days they CANNOT work, you MUST assume they CAN work on all other days.
              * DISQUALIFICATION TRIGGER: Disqualify ONLY IF the candidate's blocked days explicitly cover EVERY SINGLE ONE of the program's days. 
              * EXAMPLE OF A QUALIFIED CANDIDATE (DO NOT DISQUALIFY): If the program is "א,ב,ג" and the candidate says "לא פנוי ראשון, שלישי, חמישי", they are QUALIFIED because Monday (ב) is not blocked.

           STEP 2: RANK THE SURVIVORS (The Rule of Distance & VIP Skills)
            - ABSOLUTE VIP OVERRIDE: If the program's plan is "מותאמת", any candidate who explicitly has "מותאמת" or "טיפול" in their professions MUST BE SELECTED FIRST. They ALWAYS win over regular candidates, completely REGARDLESS of distance. Distance only matters to break ties between two VIP candidates, or two regular candidates.
            - Otherwise, distance is the ABSOLUTE PRIMARY metric. A candidate who is significantly closer ALWAYS wins.
            - REGULAR TIE-BREAKERS ('hasCV: true', 'isAssigned: true', positive 'notes') ONLY apply if the distance difference is SMALL (less than 10km) between candidates of the same VIP tier.`
          },
          {
            role: "user",
            content: `Please provide the results in **JSON** format.\n\nPROGRAM: ${JSON.stringify(program)}\nCANDIDATES: ${JSON.stringify(candidates)}`
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, 
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      return NextResponse.json({ error: "Groq API Error", details: errorDetails }, { status: response.status });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices[0].message.content;

    // המרה של המחרוזת שהתקבלה ל-JSON אמיתי כדי לשלוח ל-Frontend
    const jsonResponse = JSON.parse(rawContent);
    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}