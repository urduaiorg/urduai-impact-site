CREATE TABLE IF NOT EXISTS survey_referrals (
  id TEXT PRIMARY KEY,
  participant_name TEXT NOT NULL,
  facilitator_id TEXT NOT NULL,
  survey_id TEXT NOT NULL CHECK (survey_id IN ('pre', 'post', 'six-month')),
  created_at TEXT NOT NULL,
  consent_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referrals_created ON survey_referrals(created_at);
CREATE INDEX IF NOT EXISTS referrals_facilitator ON survey_referrals(facilitator_id, created_at);
CREATE INDEX IF NOT EXISTS referrals_survey ON survey_referrals(survey_id, created_at);
