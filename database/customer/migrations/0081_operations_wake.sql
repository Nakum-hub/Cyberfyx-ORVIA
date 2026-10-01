-- Operations wake-up (real-time consent enforcement). The operations runner loops every 30 seconds; a withdrawal recorded
-- just after a pass therefore waited up to 30 seconds before propagation started. Now a run that becomes executable, a consent
-- withdrawal above all, sends a NOTIFY on channel orvia_operations and the runner starts a pass at once. The payload is only
-- the run kind: no identifier, scope or personal data travels on the channel. A missed notification costs nothing but the
-- delay it was meant to remove; the 30-second loop still runs.
CREATE FUNCTION app.operations_wake() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF NEW.status = 'APPROVED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'APPROVED') THEN PERFORM pg_notify('orvia_operations', NEW.kind); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER operations_wake AFTER INSERT OR UPDATE OF status ON app.workflow_runs FOR EACH ROW EXECUTE FUNCTION app.operations_wake();
REVOKE ALL ON FUNCTION app.operations_wake() FROM PUBLIC;
