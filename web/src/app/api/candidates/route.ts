import type { FeatureCollection } from "geojson";
import { query } from "@/lib/db";
import {
  districtKeysFromGeocode,
  geocodeNcAddress,
} from "@/lib/geocoder";
import { jurisdictionRank } from "@/lib/jurisdiction";
import { computeMatchPercent } from "@/lib/match";
import { requireTigerDataUrl } from "@/lib/env";

export const runtime = "nodejs";

type CandidateRow = {
  candidate_id: string;
  full_name: string;
  name_on_ballot: string;
  party_code: string;
  party_name: string;
  office_type: string;
  contest_name: string;
  district_key: string | null;
  district_label: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  is_incumbent: boolean | null;
  incumbency_status: string | null;
  incumbency_source: string | null;
  research_photo: string | null;
  campaign_platform: Record<string, unknown> | null;
  social_media_posts: { platform?: string; url?: string }[] | null;
  wikipedia: { url?: string } | null;
  boundary_geojson: FeatureCollection | null;
};

type ScoreRow = {
  candidate_id: string;
  issue_id: string;
  issue_title: string;
  score: number;
  rationale: string | null;
};

export async function POST(request: Request) {
  try {
    // Validate DB credentials before doing work.
    requireTigerDataUrl();

    const body = await request.json();
    const street = String(body?.street || "").trim();
    const city = String(body?.city || "").trim();
    const state = String(body?.state || "NC").trim();
    const zip = String(body?.zip || "").trim();
    const userScores = body?.userScores as Record<string, number>;
    const issueRanks = body?.issueRanks as string[];

    if (!street || !city || !zip) {
      return Response.json(
        { error: "street, city, and zip are required" },
        { status: 400 },
      );
    }
    if (!userScores || !issueRanks?.length) {
      return Response.json(
        { error: "userScores and issueRanks are required" },
        { status: 400 },
      );
    }

    const geo = await geocodeNcAddress({ street, city, state, zip });
    const districtKeys = districtKeysFromGeocode(geo);

    const candidates = await query<CandidateRow>(
      `
      SELECT
        c.candidate_id,
        c.full_name,
        c.name_on_ballot,
        c.party_code,
        c.party_name,
        c.office_type,
        c.contest_name,
        c.district_key,
        c.district_label,
        c.photo_url,
        c.email,
        c.phone,
        c.is_incumbent,
        c.incumbency_status,
        c.incumbency_source,
        r.photo_url AS research_photo,
        r.campaign_platform,
        r.social_media_posts,
        r.wikipedia,
        d.boundary_geojson
      FROM candidates c
      LEFT JOIN candidate_research r ON r.candidate_id = c.candidate_id
      LEFT JOIN districts d ON d.district_key = c.district_key
      WHERE
        c.district_key = ANY($1::text[])
        OR c.office_type IN ('us_senate', 'statewide_executive', 'statewide_judicial')
      ORDER BY c.contest_name, c.party_code, c.name_on_ballot
      `,
      [districtKeys],
    );

    if (!candidates.length) {
      return Response.json(
        {
          error:
            "No candidates found in TigerData for this address. Run the ingestion pipeline first.",
          geo,
          districtKeys,
        },
        { status: 404 },
      );
    }

    const ids = candidates.map((c) => c.candidate_id);
    const scores = await query<ScoreRow>(
      `
      SELECT candidate_id, issue_id, issue_title, score, rationale
      FROM candidate_issue_scores
      WHERE candidate_id = ANY($1::text[])
      `,
      [ids],
    );

    const scoresByCandidate = new Map<string, ScoreRow[]>();
    for (const row of scores) {
      const list = scoresByCandidate.get(row.candidate_id) || [];
      list.push(row);
      scoresByCandidate.set(row.candidate_id, list);
    }

    const raceMap = new Map<
      string,
      {
        contestName: string;
        officeType: string;
        districtKey: string | null;
        districtLabel: string | null;
        boundaryGeojson: FeatureCollection | null;
        candidates: unknown[];
      }
    >();

    for (const c of candidates) {
      const scoreRows = scoresByCandidate.get(c.candidate_id) || [];
      const scoreMap: Record<string, number> = {};
      const scoreDetails: Record<
        string,
        { score: number; rationale: string | null; title: string }
      > = {};
      for (const s of scoreRows) {
        scoreMap[s.issue_id] = Number(s.score);
        scoreDetails[s.issue_id] = {
          score: Number(s.score),
          rationale: s.rationale,
          title: s.issue_title,
        };
      }

      const matchPercent = computeMatchPercent(
        userScores,
        scoreMap,
        issueRanks,
      );

      const platform = c.campaign_platform || {};
      const website =
        (typeof platform.website_url === "string" && platform.website_url) ||
        null;
      const socialLinks = (c.social_media_posts || [])
        .filter((p) => p.url)
        .map((p) => ({
          platform: p.platform || "Social",
          url: String(p.url),
        }));

      const candidateView = {
        candidateId: c.candidate_id,
        fullName: c.full_name,
        nameOnBallot: c.name_on_ballot,
        partyCode: c.party_code,
        partyName: c.party_name,
        officeType: c.office_type,
        contestName: c.contest_name,
        districtKey: c.district_key,
        districtLabel: c.district_label,
        photoUrl: c.research_photo || c.photo_url,
        email: c.email,
        phone: c.phone,
        isIncumbent: c.is_incumbent,
        incumbencyStatus: c.incumbency_status,
        incumbencySource: c.incumbency_source,
        campaignWebsite: website,
        socialLinks,
        wikipediaUrl: c.wikipedia?.url || null,
        scores: scoreMap,
        scoreDetails,
        matchPercent,
        boundaryGeojson: c.boundary_geojson,
      };

      const key = c.contest_name;
      const existing = raceMap.get(key);
      if (existing) {
        existing.candidates.push(candidateView);
      } else {
        raceMap.set(key, {
          contestName: c.contest_name,
          officeType: c.office_type,
          districtKey: c.district_key,
          districtLabel: c.district_label,
          boundaryGeojson: c.boundary_geojson,
          candidates: [candidateView],
        });
      }
    }

    const races = Array.from(raceMap.values())
      .map((race) => ({
        ...race,
        candidates: [...race.candidates].sort(
          (a, b) =>
            (b as { matchPercent: number }).matchPercent -
            (a as { matchPercent: number }).matchPercent,
        ),
      }))
      .sort((a, b) => {
        const jr = jurisdictionRank(a.officeType) - jurisdictionRank(b.officeType);
        if (jr !== 0) return jr;
        return a.contestName.localeCompare(b.contestName);
      });

    return Response.json({
      geo,
      districtKeys,
      races,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
