-- Review triage queue: one row per inbound review, with the deterministic
-- sentiment/urgency classification recorded at ingest time so the explanation
-- cannot drift from what was shown to the responder.
CREATE TABLE IF NOT EXISTS review_events (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  author_name TEXT,
  rating INTEGER,
  body TEXT NOT NULL,
  sentiment_label TEXT NOT NULL,
  sentiment_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'low',
  urgency_score INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_events_company_created
  ON review_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_events_urgency
  ON review_events (company_id, urgency);
