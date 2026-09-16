CREATE TABLE bootstrap_profile (
  singleton integer PRIMARY KEY CHECK (singleton = 1),
  installation_id uuid NOT NULL,
  profile text NOT NULL CHECK (profile IN ('codex-a00','ui-b00','rehearsal')),
  fixture_id text NOT NULL CHECK (fixture_id = 'bootstrap-probe-v1')
);
CREATE TABLE bootstrap_probes (
  id uuid PRIMARY KEY,
  marker text NOT NULL CHECK (marker ~ '^syn_probe_[a-f0-9]{32}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON bootstrap_profile, bootstrap_probes FROM PUBLIC;
