-- Owner decision 2026-09-30 (docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md): real engagements proceed without an external
-- legal review. The two gates that named a legal review now record what actually happens: Cyberfyx management approves the
-- engagement letter and the processing agreement template versions. A gate named "legal review" recorded against a management
-- decision would state something that did not happen, so the names change rather than the meaning of the old ones.
-- Rows already recorded under the old names are kept (the table is immutable) and still satisfy the new gate: a legal review is
-- at least as strong as a management approval.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
ALTER TABLE vendor.practice_activations DROP CONSTRAINT practice_activations_gate_check;
ALTER TABLE vendor.practice_activations ADD CONSTRAINT practice_activations_gate_check CHECK (gate IN (
  'ENGAGEMENT_LETTER_TEMPLATE_APPROVED','PROCESSING_AGREEMENT_TEMPLATE_APPROVED','PRODUCTION_CRITERIA','PRODUCTION_AUDIT_KEY',
  'LEGAL_REVIEW_ENGAGEMENT_LETTER','LEGAL_REVIEW_PROCESSING_AGREEMENT'));
-- New rows use the new names only; the legacy names stay readable for history.
CREATE FUNCTION vendor.practice_activation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NEW.gate IN ('LEGAL_REVIEW_ENGAGEMENT_LETTER','LEGAL_REVIEW_PROCESSING_AGREEMENT') THEN
    RAISE EXCEPTION 'legacy_gate_name' USING ERRCODE = 'P0001', HINT = 'gate'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER practice_activation_guard BEFORE INSERT ON vendor.practice_activations FOR EACH ROW EXECUTE FUNCTION vendor.practice_activation_guard();
CREATE OR REPLACE FUNCTION vendor.practice_gates_missing() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT coalesce(array_agg(g ORDER BY g), '{}') FROM unnest(ARRAY['ENGAGEMENT_LETTER_TEMPLATE_APPROVED','PROCESSING_AGREEMENT_TEMPLATE_APPROVED','PRODUCTION_AUDIT_KEY','PRODUCTION_CRITERIA']) g
  WHERE NOT EXISTS (SELECT 1 FROM vendor.practice_activations a WHERE a.gate = g
    OR (g = 'ENGAGEMENT_LETTER_TEMPLATE_APPROVED' AND a.gate = 'LEGAL_REVIEW_ENGAGEMENT_LETTER')
    OR (g = 'PROCESSING_AGREEMENT_TEMPLATE_APPROVED' AND a.gate = 'LEGAL_REVIEW_PROCESSING_AGREEMENT')) $$;
