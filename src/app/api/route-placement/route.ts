import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, candidates, programDetails } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key Missing" }, { status: 500 });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a placement expert for educational programs.
            
            GOAL: Find the BEST instructor for "${programDetails?.label}".
            
            GEOGRAPHIC HIERARCHY (Priority):
            1. Exact City Match: "${programDetails?.city}".
            2. Area/District Match: "${programDetails?.area}".
            3. Proximity: If no match in city/area, find the closest candidate based on logic.
            
            PROFESSIONAL MATCH:
            - Candidate MUST have "${programDetails?.profession}" within their "professions" string.
            
            INSTRUCTIONS:
            - You MUST return a "selectedId". Do not return null if there are candidates.
            - If you have multiple candidates, pick the one who matches BOTH profession and city. 
            - If no one matches the city, pick the one in the same area with the right profession.
            - Incorporate user note: "${prompt}".

            Return ONLY JSON: {"selectedId": number, "explanation": "Hebrew explanation of why this candidate was chosen (mentioning city/area/profession)"}`
          },
          {
            role: "user",
            content: `Candidates List: ${JSON.stringify(candidates)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 
      }),
    });

    const data = await response.json();
    return NextResponse.json(JSON.parse(data.choices[0].message.content));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}