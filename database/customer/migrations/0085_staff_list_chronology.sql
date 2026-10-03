-- Immutable insertion order for staff lists. Historical insertion times are unknown:
-- existing rows retain NULL rather than acquiring a fabricated creation date.
-- Readers place that legacy cohort last and use UUID ties within it.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['purpose_versions','notice_versions','policy_versions','systems','target_mappings','obligations','update_plans','principal_references','retention_states'] LOOP
    EXECUTE format('ALTER TABLE app.%I ADD COLUMN inserted_at timestamptz', t);
    EXECUTE format('ALTER TABLE app.%I ALTER COLUMN inserted_at SET DEFAULT clock_timestamp()', t);
  END LOOP;
END $$;

CREATE FUNCTION app.immutable_list_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)->TG_ARGV[0]) IS DISTINCT FROM (to_jsonb(OLD)->TG_ARGV[0]) THEN
    RAISE EXCEPTION 'list insertion timestamp is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' AND (to_jsonb(NEW)->>TG_ARGV[0]) IS NULL THEN
    RAISE EXCEPTION 'new list insertion timestamp is required' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE spec text; t text; stamp text;
BEGIN
  FOREACH spec IN ARRAY ARRAY[
    'purpose_versions:inserted_at','notice_versions:inserted_at','policy_versions:inserted_at','systems:inserted_at',
    'target_mappings:inserted_at','obligations:inserted_at','update_plans:inserted_at','principal_references:inserted_at',
    'retention_states:inserted_at','downstream_actions:created_at','workflow_runs:created_at','connector_bindings:recorded_at',
    'consent_records:recorded_at','consent_managers:recorded_at','intake_clients:created_at','registry_notices:recorded_at',
    'notice_delivery_evidence:recorded_at','data_principal_categories:recorded_at','personal_data_categories:recorded_at',
    'data_principals:recorded_at','data_principal_representatives:recorded_at','registry_purposes:recorded_at',
    'processing_conditions:recorded_at','security_safeguards:recorded_at','registry_activities:recorded_at',
    'processor_engagements:recorded_at','data_sharing_links:recorded_at','retention_rules:recorded_at',
    'retention_holds:recorded_at','erasure_intimations:recorded_at'
  ] LOOP
    t=split_part(spec,':',1); stamp=split_part(spec,':',2);
    EXECUTE format('CREATE TRIGGER immutable_list_timestamp BEFORE INSERT OR UPDATE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.immutable_list_timestamp(%L)', t, stamp);
    IF t='retention_states' THEN
      EXECUTE format('CREATE INDEX %I ON app.%I (tenant_id,legal_entity_id,environment_id,(COALESCE(inserted_at,''-infinity''::timestamptz)) DESC,subject_id DESC,rule_id DESC)', t||'_staff_chronology',t);
    ELSIF stamp='inserted_at' THEN
      EXECUTE format('CREATE INDEX %I ON app.%I (tenant_id,legal_entity_id,environment_id,(COALESCE(inserted_at,''-infinity''::timestamptz)) DESC,id DESC)', t||'_staff_chronology',t);
    ELSE
      EXECUTE format('CREATE INDEX %I ON app.%I (tenant_id,legal_entity_id,environment_id,%I DESC,id DESC)', t||'_staff_chronology',t,stamp);
    END IF;
  END LOOP;
END $$;
