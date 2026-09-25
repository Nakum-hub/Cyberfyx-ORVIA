DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR NOT EXISTS(
    SELECT 1 FROM vendor.installation WHERE singleton=1 AND boundary='VENDOR_COMMERCIAL_ONLY' AND schema_version=1
  ) THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE='42501'; END IF;
END $$;
CREATE TABLE vendor.checkout_attempts (
  order_id uuid PRIMARY KEY REFERENCES vendor.orders(id),
  state text NOT NULL CHECK(state IN ('STARTED','UNKNOWN','BOUND')),
  request jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CHECK((state='BOUND')=(completed_at IS NOT NULL))
);
ALTER TABLE vendor.installation DROP CONSTRAINT installation_schema_version_check;
ALTER TABLE vendor.installation ADD CONSTRAINT installation_schema_version_check CHECK(schema_version IN (1,2));
UPDATE vendor.installation SET schema_version=2 WHERE singleton=1;
