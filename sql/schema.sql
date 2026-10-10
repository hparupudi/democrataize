-- TigerData / TimescaleDB (PostgreSQL) schema for NC candidate pipeline.

CREATE TABLE IF NOT EXISTS districts (
    district_key TEXT PRIMARY KEY,
    office_type TEXT NOT NULL,
    district_label TEXT NOT NULL,
    district_number TEXT,
    state_fips TEXT NOT NULL DEFAULT '37',
    geoid TEXT,
    boundary_geojson JSONB NOT NULL,
    source TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    candidate_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    name_on_ballot TEXT NOT NULL,
    party_code TEXT NOT NULL,
    party_name TEXT NOT NULL,
    office_type TEXT NOT NULL,
    contest_name TEXT NOT NULL,
    district_key TEXT REFERENCES districts (district_key),
    district_label TEXT,
    election_date DATE NOT NULL,
    photo_url TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    email TEXT,
    phone TEXT,
    geocoder_lat DOUBLE PRECISION,
    geocoder_lon DOUBLE PRECISION,
    geocoder_districts JSONB,
    fec_candidate_id TEXT,
    is_incumbent BOOLEAN,
    incumbency_status TEXT,
    incumbency_source TEXT,
    incumbency_detail TEXT,
    source_row JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe upgrades for databases created before incumbency columns existed.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_incumbent BOOLEAN;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS incumbency_status TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS incumbency_source TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS incumbency_detail TEXT;

CREATE TABLE IF NOT EXISTS candidate_research (
    candidate_id TEXT PRIMARY KEY REFERENCES candidates (candidate_id) ON DELETE CASCADE,
    social_media_posts JSONB NOT NULL DEFAULT '[]'::jsonb,
    campaign_platform JSONB NOT NULL DEFAULT '{}'::jsonb,
    introduced_legislation JSONB NOT NULL DEFAULT '[]'::jsonb,
    speech_transcripts JSONB NOT NULL DEFAULT '[]'::jsonb,
    photo_url TEXT,
    raw_gemini_response TEXT,
    researched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade path for DBs created when wikipedia was stored instead of legislation.
ALTER TABLE candidate_research
    ADD COLUMN IF NOT EXISTS introduced_legislation JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS candidate_issue_scores (
    candidate_id TEXT NOT NULL REFERENCES candidates (candidate_id) ON DELETE CASCADE,
    issue_id TEXT NOT NULL,
    issue_title TEXT NOT NULL,
    score SMALLINT NOT NULL CHECK (score BETWEEN -2 AND 2),
    rationale TEXT,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (candidate_id, issue_id)
);

CREATE INDEX IF NOT EXISTS idx_candidates_office ON candidates (office_type);
CREATE INDEX IF NOT EXISTS idx_candidates_party ON candidates (party_code);
CREATE INDEX IF NOT EXISTS idx_candidates_district ON candidates (district_key);
CREATE INDEX IF NOT EXISTS idx_issue_scores_issue ON candidate_issue_scores (issue_id);
