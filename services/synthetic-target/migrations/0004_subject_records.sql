-- Synthetic records target for the DPDP operations test adapter.
--
-- This is a TEST ADAPTER target: fictional records in the isolated _targets
-- database, never a customer system. It exists so correction, erasure,
-- anonymisation and suppression can be executed through a connector and then
-- verified by an independent read under a different database role
-- (orvia_target_observer), which is what a real connector must also offer.
CREATE TABLE subject_records (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 system_id uuid NOT NULL,subject_reference text NOT NULL CHECK(subject_reference ~ '^[A-Za-z0-9_.:-]{1,120}$'),
 fields jsonb NOT NULL,suppressed boolean NOT NULL DEFAULT false,
 erased_at timestamptz,anonymised_at timestamptz,version bigint NOT NULL DEFAULT 1,changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(system_id,subject_reference));
-- The operation ledger is the target's idempotency guarantee: a key seen before
-- returns its recorded outcome and is never applied twice.
CREATE TABLE subject_operations (
 idempotency_key text PRIMARY KEY CHECK(idempotency_key ~ '^[a-f0-9]{64}$'),
 system_id uuid NOT NULL,subject_reference text NOT NULL,
 operation text NOT NULL CHECK(operation IN ('SUPPRESS','ERASE','ANONYMISE','CORRECT','READ_REFERENCE')),
 request_digest text NOT NULL,applied boolean NOT NULL,outcome text NOT NULL CHECK(outcome IN ('COMPLETED','ACKNOWLEDGED')),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(system_id,subject_reference) REFERENCES subject_records(system_id,subject_reference));
-- Fixture-controlled behaviour, so failure, silent acknowledgement, timeout and
-- unreadable targets can be exercised deliberately. Set only by the operator fixture.
CREATE TABLE subject_controls (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,system_id uuid PRIMARY KEY,
 mode text NOT NULL CHECK(mode IN ('HEALTHY','UNAVAILABLE','ACK_WITHOUT_EFFECT','APPLY_THEN_TIMEOUT')),
 read_mode text NOT NULL DEFAULT 'AVAILABLE' CHECK(read_mode IN ('AVAILABLE','UNAVAILABLE')));
ALTER TABLE subject_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_records FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_records ON subject_records FOR ALL USING(target_scope(tenant_id,legal_entity_id,environment_id)) WITH CHECK(target_scope(tenant_id,legal_entity_id,environment_id));
ALTER TABLE subject_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_operations FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_operations ON subject_operations FOR ALL USING(EXISTS(SELECT 1 FROM subject_records r WHERE r.system_id=subject_operations.system_id AND r.subject_reference=subject_operations.subject_reference))
 WITH CHECK(EXISTS(SELECT 1 FROM subject_records r WHERE r.system_id=subject_operations.system_id AND r.subject_reference=subject_operations.subject_reference));
ALTER TABLE subject_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_controls FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_controls ON subject_controls FOR SELECT USING(target_scope(tenant_id,legal_entity_id,environment_id));
REVOKE ALL ON subject_records,subject_operations,subject_controls FROM PUBLIC;
GRANT SELECT,UPDATE ON subject_records TO orvia_target_agent;
GRANT SELECT,INSERT ON subject_operations TO orvia_target_agent;
GRANT SELECT ON subject_records,subject_operations TO orvia_target_observer;
GRANT SELECT ON subject_controls TO orvia_target_agent,orvia_target_observer;
