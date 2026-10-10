import { GoogleGenAI } from "@google/genai";
import { QUESTIONS } from "@/lib/questionnaire";
import { geminiModel, requireGeminiKey } from "@/lib/env";

export const runtime = "nodejs";

const HALF_STEPS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2] as const;

export async function POST(request: Request) {
  try {
    const apiKey = requireGeminiKey();
    const body = await request.json();
    const issueId = String(body?.issueId || "");
    const customText = String(body?.customText || "").trim();
    if (!issueId || !customText) {
      return Response.json(
        { error: "issueId and customText are required" },
        { status: 400 },
      );
    }

    const question = QUESTIONS.find((q) => q.id === issueId);
    if (!question) {
      return Response.json({ error: "Unknown issue" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Score this voter's custom stance on a political issue.

Issue: ${question.title}
Side A (-2): ${question.side_a}
Side B (+2): ${question.side_b}

Voter custom response:
"""
${customText}
"""

Return ONLY JSON:
{"score": <number>, "rationale": "<short explanation>"}

score MUST be one of: ${HALF_STEPS.join(", ")}
-2 strongly Side A, -1 somewhat Side A, 0 Neutral, 1 somewhat Side B, 2 strongly Side B.
Use .5 increments for nuanced positions.`;

    const response = await ai.models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { temperature: 0.1 },
    });

    const text = response.text?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "Gemini returned an unparseable score response" },
        { status: 502 },
      );
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      score: number;
      rationale?: string;
    };
    const score = Number(parsed.score);
    if (!HALF_STEPS.includes(score as (typeof HALF_STEPS)[number])) {
      return Response.json(
        { error: `Score ${score} is not a valid half-step value` },
        { status: 502 },
      );
    }

    return Response.json({
      score,
      rationale: parsed.rationale || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scoring failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
