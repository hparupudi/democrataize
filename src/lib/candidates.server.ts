import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server";
import { ISSUES } from "./issues";
import type { CandidateResult } from "./candidates.functions";

const scoreShape = Object.fromEntries(ISSUES.map((i) => [i.id, z.number()])) as Record<string, z.ZodNumber>;

const Schema = z.object({
  location: z.string(),
  otherScores: z.array(z.object({ issue: z.string(), score: z.number() })),
  candidates: z.array(
    z.object({
      name: z.string(),
      office: z.string(),
      party: z.string(),
      wikipediaTitle: z.string().nullable(),
      website: z.string().nullable(),
      summary: z.string(),
      accomplishments: z.array(z.string()),
      plans: z.array(z.string()),
      getInvolved: z.array(z.string()),
      scores: z.object(scoreShape),
    }),
  ),
});

async function wiki(title: string | null) {
  if (!title) return { image: null, url: null };
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, {
      headers: { "User-Agent": "Democratize/1.0 (ballot guide demo)" },
    });
    if (!r.ok) return { image: null, url: null };
    const j = (await r.json()) as { thumbnail?: { source: string }; content_urls?: { desktop: { page: string } } };
    return { image: j.thumbnail?.source ?? null, url: j.content_urls?.desktop.page ?? null };
  } catch {
    return { image: null, url: null };
  }
}

export async function runAi(data: { address: string; others: { issue: string; text: string }[] }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");
  const runId = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });

  const issueText = ISSUES.map((i) => `- ${i.id} (${i.title}): -2 = strongly "${i.a}" … +2 = strongly "${i.b}"`).join("\n");
  const prompt = `Voter address: ${data.address}

The "location" field must be a short label like "Baltimore, MD — Congressional District 7" (under 80 characters).

Identify REAL candidates and incumbents for the most recent / upcoming elections relevant to this address: US Senate, US House district, Governor, and if known, state legislature. Include major-party candidates for each race (aim for 4-8 people). Only include real, verifiable people; never invent anyone. If unsure of the district, use statewide and federal races only.

For each candidate give: exact English Wikipedia article title (or null), official campaign website (or null), a 2-sentence summary, 3 key things they have done (record), 3 things they plan to do, and 3 concrete ways to get involved (volunteer, donate, events — reference their website when known).

Score each candidate on these issues from -2 to 2 based on their voting record and public statements:
${issueText}

The voter also wrote custom positions. Score each on the same scale for that issue id:
${data.others.map((o) => `- ${o.issue}: "${o.text}"`).join("\n") || "(none)"}`;

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: "You are a nonpartisan, factual civic research assistant. Be accurate and neutral.",
    prompt,
    output: Output.object({ schema: Schema }),
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });
  const out = await result.output;

  const clamp = (n: number) => Math.max(-2, Math.min(2, Math.round(n)));
  const candidates: CandidateResult[] = await Promise.all(
    out.candidates.map(async (c) => {
      const w = await wiki(c.wikipediaTitle);
      return {
        name: c.name, office: c.office, party: c.party, summary: c.summary, whyMatch: "",
        accomplishments: c.accomplishments, plans: c.plans, getInvolved: c.getInvolved,
        website: c.website, wikipediaUrl: w.url, image: w.image,
        scores: Object.fromEntries(Object.entries(c.scores).map(([k, v]) => [k, clamp(v)])),
      };
    }),
  );
  return {
    location: out.location,
    otherScores: Object.fromEntries(out.otherScores.map((o) => [o.issue, clamp(o.score)])),
    candidates,
  };
}
