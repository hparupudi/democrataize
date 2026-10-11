"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FeatureCollection } from "geojson";
import { QUESTIONS } from "./questionnaire";

export type AnswerRecord = {
  issueId: string;
  choice: "A" | "B" | "C" | "neutral";
  strength?: "strong" | "somewhat";
  customText?: string;
  score: number;
  spokenTranscript?: string;
};

export type CandidateView = {
  candidateId: string;
  fullName: string;
  nameOnBallot: string;
  partyCode: string;
  partyName: string;
  officeType: string;
  contestName: string;
  districtKey: string | null;
  districtLabel: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  isIncumbent: boolean | null;
  incumbencyStatus: string | null;
  incumbencySource: string | null;
  campaignWebsite: string | null;
  socialLinks: { platform: string; url: string }[];
  introducedLegislation: {
    title: string;
    billId: string | null;
    url: string | null;
    chamber: string | null;
    status: string | null;
    summary: string | null;
  }[];
  scores: Record<string, number>;
  scoreDetails: Record<
    string,
    { score: number; rationale: string | null; title: string }
  >;
  matchPercent: number | null;
  insufficientInformation: boolean;
  boundaryGeojson: FeatureCollection | null;
};

export type RaceGroup = {
  contestName: string;
  officeType: string;
  districtKey: string | null;
  districtLabel: string | null;
  boundaryGeojson: FeatureCollection | null;
  candidates: CandidateView[];
};

type AppState = {
  answers: Record<string, AnswerRecord>;
  issueRanks: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    matchedAddress?: string;
  } | null;
  races: RaceGroup[];
  setAnswer: (answer: AnswerRecord) => void;
  setIssueRanks: (ranks: string[]) => void;
  setAddress: (address: AppState["address"]) => void;
  setRaces: (races: RaceGroup[]) => void;
  userScores: () => Record<string, number>;
  reset: () => void;
};

const initialRanks = QUESTIONS.map((q) => q.id);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      answers: {},
      issueRanks: initialRanks,
      address: null,
      races: [],
      setAnswer: (answer) =>
        set((state) => ({
          answers: { ...state.answers, [answer.issueId]: answer },
        })),
      setIssueRanks: (ranks) => set({ issueRanks: ranks }),
      setAddress: (address) => set({ address }),
      setRaces: (races) => set({ races }),
      userScores: () => {
        const scores: Record<string, number> = {};
        for (const [id, answer] of Object.entries(get().answers)) {
          scores[id] = answer.score;
        }
        return scores;
      },
      reset: () =>
        set({
          answers: {},
          issueRanks: initialRanks,
          address: null,
          races: [],
        }),
    }),
    { name: "nc-ballot-match" },
  ),
);
