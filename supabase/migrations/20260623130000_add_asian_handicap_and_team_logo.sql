
-- Add asian_handicap fields to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_handicap text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_handicap text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_home numeric(5,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_draw numeric(5,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_away numeric(5,2);

-- Add logo_url to teams (for uploaded images)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url text;
