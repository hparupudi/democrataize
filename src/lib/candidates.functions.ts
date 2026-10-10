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
