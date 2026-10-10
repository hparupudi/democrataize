import { GoogleGenAI } from "@google/genai";
import { QUESTIONS } from "@/lib/questionnaire";
import { geminiModel, requireGeminiKey } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = requireGeminiKey();
    const body = await request.json();
    const candidateName = String(body?.candidateName || "");
    const userScores = body?.userScores as Record<string, number>;
    const candidateScores = body?.candidateScores as Record<string, number>;
    const candidateRationales =
      (body?.candidateRationales as Record<string, string>) || {};

    if (!candidateName || !userScores || !candidateScores) {
      return Response.json(
        { error: "candidateName, userScores, and candidateScores are required" },
        { status: 400 },
      );
    }

    const issueLines = QUESTIONS.map((q) => {
      const u = userScores[q.id];
      const c = candidateScores[q.id];
      return `- ${q.title}: you=${u}, candidate=${c}. Side A: ${q.side_a} Side B: ${q.side_b}. Candidate note: ${candidateRationales[q.id] || "n/a"}`;
    }).join("\n");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Explain similarities and differences between a North Carolina voter and candidate ${candidateName} on these issues. Be concise, fair, and specific. Do not invent votes or quotes.

${issueLines}

Return JSON only:
{
  "summary": "2-3 sentence overall comparison",
  "similarities": ["..."],
  "differences": ["..."]
}`;

    const response = await ai.models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { temperature: 0.3 },
    });
    const text = response.text?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "Gemini returned an unparseable explanation" },
        { status: 502 },
      );
    }
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explain failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
