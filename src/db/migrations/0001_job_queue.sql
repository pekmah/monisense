CREATE TABLE IF NOT EXISTS job_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  client_batch_id text,
  type text NOT NULL DEFAULT 'sms_ingest',
  status text NOT NULL DEFAULT 'queued',
  existing_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_jobs integer NOT NULL DEFAULT 0,
  completed_jobs integer NOT NULL DEFAULT 0,
  failed_jobs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_batches_user_idx ON job_batches (user_id);
CREATE INDEX IF NOT EXISTS job_batches_status_idx ON job_batches (status);
CREATE UNIQUE INDEX IF NOT EXISTS job_batches_user_client_batch_unique
  ON job_batches (user_id, client_batch_id);

CREATE TABLE IF NOT EXISTS classification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES job_batches (id),
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  job_type text NOT NULL DEFAULT 'parse_and_classify',
  raw_sms text NOT NULL,
  raw_sms_hash text NOT NULL,
  parsed_json jsonb,
  result_json jsonb,
  error_code text,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classification_jobs_batch_idx ON classification_jobs (batch_id);
CREATE INDEX IF NOT EXISTS classification_jobs_user_idx ON classification_jobs (user_id);
CREATE INDEX IF NOT EXISTS classification_jobs_status_idx ON classification_jobs (status);
CREATE INDEX IF NOT EXISTS classification_jobs_run_after_idx ON classification_jobs (run_after);
CREATE UNIQUE INDEX IF NOT EXISTS classification_jobs_batch_hash_unique
  ON classification_jobs (batch_id, raw_sms_hash);
