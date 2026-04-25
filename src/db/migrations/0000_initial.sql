CREATE TABLE IF NOT EXISTS error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  code text NOT NULL,
  domain text NOT NULL,
  type text NOT NULL,
  severity text NOT NULL,
  exposure text NOT NULL,
  status integer NOT NULL,
  message text NOT NULL,
  display_title text,
  display_message text,
  details jsonb,
  cause_message text,
  stack text,
  service text NOT NULL,
  component text,
  operation text,
  method text,
  path text,
  client_id text,
  metadata jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_events_request_id_idx ON error_events (request_id);
CREATE INDEX IF NOT EXISTS error_events_code_idx ON error_events (code);
CREATE INDEX IF NOT EXISTS error_events_occurred_at_idx ON error_events (occurred_at);

CREATE TABLE IF NOT EXISTS classification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  raw_sms_hash text NOT NULL,
  clean_description text NOT NULL,
  parsed_json jsonb NOT NULL,
  ai_output_json jsonb,
  suggested_category text,
  confidence_bps integer,
  needs_review boolean NOT NULL DEFAULT true,
  model_name text NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classification_logs_user_idx ON classification_logs (user_id);
CREATE INDEX IF NOT EXISTS classification_logs_hash_idx ON classification_logs (raw_sms_hash);
CREATE INDEX IF NOT EXISTS classification_logs_created_at_idx ON classification_logs (created_at);

CREATE TABLE IF NOT EXISTS merchant_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  merchant_key text NOT NULL,
  merchant_display_name text NOT NULL,
  category_name text NOT NULL,
  confidence_bps integer NOT NULL,
  source text NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_memory_user_idx ON merchant_memory (user_id);
CREATE INDEX IF NOT EXISTS merchant_memory_key_idx ON merchant_memory (merchant_key);
CREATE UNIQUE INDEX IF NOT EXISTS merchant_memory_user_key_unique ON merchant_memory (user_id, merchant_key);

CREATE TABLE IF NOT EXISTS category_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  proposed_name text NOT NULL,
  normalized_name text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS category_proposals_user_idx ON category_proposals (user_id);
CREATE INDEX IF NOT EXISTS category_proposals_name_idx ON category_proposals (normalized_name);

CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  merchant_key text,
  ai_suggested_category text,
  final_category text NOT NULL,
  was_ai_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_feedback_user_idx ON user_feedback (user_id);
CREATE INDEX IF NOT EXISTS user_feedback_merchant_idx ON user_feedback (merchant_key);
