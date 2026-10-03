-- Owner request 2026-10-03 (contract 0.61.0): CSV exports from the organisation's own systems are recognised by their header
-- as a consent export or a privacy requests export, staged like any other file and applied only on a staff decision.
ALTER TABLE app.file_intake_items DROP CONSTRAINT file_intake_items_detected_kind_check;
ALTER TABLE app.file_intake_items ADD CONSTRAINT file_intake_items_detected_kind_check CHECK (detected_kind IN
  ('LICENCE', 'RELEASE', 'REGULATORY_PACKAGE', 'DATA_ASSET_INVENTORY', 'ESTATE_ROWS', 'CONSENT_EXPORT', 'PRIVACY_REQUESTS', 'DOCUMENT', 'UNRECOGNISED'));
