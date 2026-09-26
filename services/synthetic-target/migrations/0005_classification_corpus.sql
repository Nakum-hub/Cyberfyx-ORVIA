-- Synthetic classification corpus for EX04/EX12 (TEST FIXTURE, fictional values).
-- customer_profiles holds columns whose true categories are known, including
-- decoys (numbers that fail the Aadhaar or card checksum, free text with a few
-- addresses), so classifier precision and recall can be measured rather than
-- assumed. Its grants are deliberately uneven so access exposure has something
-- real to find: the write agent can also read it, and legacy_contact_exports is
-- readable by PUBLIC. Rows are seeded per scope by the operator fixture.
CREATE TABLE customer_profiles (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 profile_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 full_name text,contact_email text,mobile text,pan text,aadhaar text,card_number text,ifsc text,ip_address text,
 city text,notes text,order_reference text,legacy_card text,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_profiles ON customer_profiles FOR ALL USING(target_scope(tenant_id,legal_entity_id,environment_id)) WITH CHECK(target_scope(tenant_id,legal_entity_id,environment_id));
CREATE TABLE legacy_contact_exports (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 export_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,contact_email text,mobile text,exported_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE legacy_contact_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_contact_exports FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_exports ON legacy_contact_exports FOR ALL USING(target_scope(tenant_id,legal_entity_id,environment_id)) WITH CHECK(target_scope(tenant_id,legal_entity_id,environment_id));
REVOKE ALL ON customer_profiles,legacy_contact_exports FROM PUBLIC;
GRANT SELECT ON customer_profiles,legacy_contact_exports TO orvia_target_observer;
GRANT SELECT,UPDATE ON customer_profiles TO orvia_target_agent;
-- The deliberate exposure: anyone who can connect may read the legacy export table.
GRANT SELECT ON legacy_contact_exports TO PUBLIC;
