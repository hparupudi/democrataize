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
