-- Separate vendor database only. No customer migration, identity or roles.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM vendor.installation WHERE singleton=1 AND boundary='VENDOR_COMMERCIAL_ONLY' AND schema_version=2
  ) THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE='42501'; END IF;
END $$;
ALTER TABLE vendor.memberships DROP CONSTRAINT memberships_capability_check;
ALTER TABLE vendor.memberships ADD CONSTRAINT memberships_capability_check
  CHECK(capability IN ('ORDER_READ','ORDER_CREATE','LICENCE_PREPARE','LICENCE_APPROVE','LICENCE_ISSUE'));
CREATE TABLE vendor.licence_requests (
  order_id uuid PRIMARY KEY REFERENCES vendor.orders(id),
  licence_id uuid NOT NULL UNIQUE,
  claims jsonb NOT NULL,
  digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
  prepared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE vendor.licence_approvals (
  order_id uuid PRIMARY KEY REFERENCES vendor.licence_requests(order_id),
  digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
  approved_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE vendor.issued_licences (
  order_id uuid PRIMARY KEY REFERENCES vendor.licence_approvals(order_id),
  licence_id uuid NOT NULL UNIQUE,
  document jsonb NOT NULL,
  digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
  issued_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER licence_requests_immutable BEFORE UPDATE OR DELETE ON vendor.licence_requests FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
CREATE TRIGGER licence_approvals_immutable BEFORE UPDATE OR DELETE ON vendor.licence_approvals FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
CREATE TRIGGER issued_licences_immutable BEFORE UPDATE OR DELETE ON vendor.issued_licences FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
ALTER TABLE vendor.installation DROP CONSTRAINT installation_schema_version_check;
ALTER TABLE vendor.installation ADD CONSTRAINT installation_schema_version_check CHECK(schema_version IN (1,2,3));
UPDATE vendor.installation SET schema_version=3 WHERE singleton=1;
