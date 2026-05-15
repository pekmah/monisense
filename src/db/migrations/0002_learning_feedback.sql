ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS client_feedback_id text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS merchant_name text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS amount_minor integer;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS old_category_id text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS old_category text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS final_category_id text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS ai_confidence integer;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS classification_source text;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS correction_type text NOT NULL DEFAULT 'corrected';

CREATE UNIQUE INDEX IF NOT EXISTS user_feedback_user_client_unique
  ON user_feedback (user_id, client_feedback_id);

CREATE TABLE IF NOT EXISTS classification_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  merchant_key text NOT NULL,
  merchant_display_name text NOT NULL,
  clean_description text,
  amount_band text,
  direction text,
  final_category text NOT NULL,
  rejected_category text,
  source_feedback_id uuid REFERENCES user_feedback (id),
  weight integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classification_examples_user_merchant_idx
  ON classification_examples (user_id, merchant_key);
CREATE INDEX IF NOT EXISTS classification_examples_user_category_idx
  ON classification_examples (user_id, final_category);
