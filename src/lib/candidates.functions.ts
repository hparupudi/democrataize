import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  address: z.string().min(3).max(300),
  others: z.array(z.object({ issue: z.string().max(80), text: z.string().max(500) })).max(9),
});

export type CandidateResult = {
  name: string;
  office: string;
  party: string;
  summary: string;
  whyMatch: string;
  accomplishments: string[];
  plans: string[];
  getInvolved: string[];
  website: string | null;
  sources: string[];
  wikipediaUrl: string | null;
  image: string | null;
  scores: Record<string, number>;
};

export const findCandidates = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { runAi } = await import("./candidates.server");
    return runAi(data);
  });

const AskInput = z.object({
  issueId: z.string().max(40),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(20),
});

export const askAboutIssue = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const { runAsk } = await import("./candidates.server");
    return runAsk(data);
  });

const CandAskInput = z.object({
  candidate: z.object({ name: z.string().max(120), office: z.string().max(200), party: z.string().max(80), matchPct: z.number() }),
  agree: z.array(z.string().max(60)).max(9),
  differ: z.array(z.string().max(60)).max(9),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(20),
});

export const askAboutCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CandAskInput.parse(d))
  .handler(async ({ data }) => {
    const { runCandidateAsk } = await import("./candidates.server");
    return runCandidateAsk(data);
  });

const RankInput = z.object({
  prompt: z.string().min(1).max(1000),
  positions: z.array(z.object({ id: z.string().max(40), stance: z.string().max(600) })).max(9),
});

export const recommendRanking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RankInput.parse(d))
  .handler(async ({ data }) => {
    const { runRank } = await import("./candidates.server");
    return runRank(data);
  });
