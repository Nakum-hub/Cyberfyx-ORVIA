-- Vendor-only database. Never apply through the customer migration runner.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing commercial schema in customer database' USING ERRCODE='42501';
  END IF;
END $$;
CREATE SCHEMA vendor;
CREATE TABLE vendor.installation (
  singleton integer PRIMARY KEY CHECK (singleton=1),
  boundary text NOT NULL CHECK (boundary='VENDOR_COMMERCIAL_ONLY'),
  schema_version integer NOT NULL CHECK (schema_version=1)
);
INSERT INTO vendor.installation VALUES (1,'VENDOR_COMMERCIAL_ONLY',1);
CREATE TABLE vendor.accounts (id uuid PRIMARY KEY, state text NOT NULL CHECK(state IN ('ACTIVE','SUSPENDED')));
CREATE TABLE vendor.memberships (
  account_id uuid NOT NULL REFERENCES vendor.accounts(id), actor_id uuid NOT NULL,
  capability text NOT NULL CHECK(capability IN ('ORDER_READ','ORDER_CREATE')),
  PRIMARY KEY(account_id,actor_id,capability)
);
CREATE TABLE vendor.plan_versions (
  id uuid PRIMARY KEY, amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 1000000000000),
  currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  terms_digest text NOT NULL CHECK(terms_digest ~ '^[a-f0-9]{64}$'),
  created_by uuid NOT NULL, approved_by uuid NOT NULL CHECK(approved_by<>created_by),
  state text NOT NULL CHECK(state IN ('APPROVED','RETIRED'))
);
CREATE TABLE vendor.orders (
  id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES vendor.accounts(id),
  plan_version_id uuid NOT NULL REFERENCES vendor.plan_versions(id),
  payment_method text NOT NULL CHECK(payment_method IN ('UPI','CARD')),
  amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 1000000000000), currency text NOT NULL,
  terms_digest text NOT NULL, idempotency_key uuid NOT NULL, request_digest text NOT NULL,
  state text NOT NULL CHECK(state IN ('PENDING','FAILED','PAID','PARTIALLY_REFUNDED','REFUNDED','REVIEW_REQUIRED')),
  provider text, merchant_id text, mode text CHECK(mode IN ('TEST','LIVE')), provider_order_id text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(account_id,idempotency_key), UNIQUE(provider,merchant_id,mode,provider_order_id),
  CHECK ((provider IS NULL AND merchant_id IS NULL AND mode IS NULL AND provider_order_id IS NULL) OR
         (provider='RAZORPAY' AND merchant_id IS NOT NULL AND mode IS NOT NULL AND provider_order_id IS NOT NULL))
);
CREATE TABLE vendor.payment_bindings (
  provider text NOT NULL, merchant_id text NOT NULL, mode text NOT NULL, payment_id text NOT NULL,
  order_id uuid NOT NULL REFERENCES vendor.orders(id),
  PRIMARY KEY(provider,merchant_id,mode,payment_id)
);
CREATE TABLE vendor.payment_events (
  provider text NOT NULL, merchant_id text NOT NULL, mode text NOT NULL, event_id text NOT NULL,
  order_id uuid NOT NULL REFERENCES vendor.orders(id), body_digest text NOT NULL,
  fact jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(provider,merchant_id,mode,event_id)
);
CREATE INDEX payment_events_order ON vendor.payment_events(order_id);
CREATE TABLE vendor.entitlement_outbox (
  order_id uuid PRIMARY KEY REFERENCES vendor.orders(id),
  state text NOT NULL CHECK(state IN ('READY','HELD','ISSUED_REVIEW_REQUIRED','ISSUED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE vendor.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id uuid NOT NULL REFERENCES vendor.accounts(id),
  actor_id uuid, action text NOT NULL, order_id uuid NOT NULL REFERENCES vendor.orders(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE FUNCTION vendor.prevent_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable commercial history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER payment_events_immutable BEFORE UPDATE OR DELETE ON vendor.payment_events FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON vendor.audit FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
CREATE TRIGGER payment_bindings_immutable BEFORE UPDATE OR DELETE ON vendor.payment_bindings FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
CREATE TRIGGER plans_immutable BEFORE UPDATE OR DELETE ON vendor.plan_versions FOR EACH ROW EXECUTE FUNCTION vendor.prevent_rewrite();
