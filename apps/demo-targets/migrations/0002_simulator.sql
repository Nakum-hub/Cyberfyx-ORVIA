CREATE TABLE simulator_controls (
 resource_id uuid PRIMARY KEY REFERENCES marketing_memberships(resource_id),
 mode text NOT NULL CHECK(mode IN ('HEALTHY','UNAVAILABLE','APPLY_THEN_TIMEOUT','ACK_WITHOUT_EFFECT')),
 read_allowed boolean NOT NULL DEFAULT true);
ALTER TABLE simulator_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulator_controls FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_controls ON simulator_controls FOR SELECT USING(EXISTS(SELECT 1 FROM marketing_memberships m WHERE m.resource_id=simulator_controls.resource_id));
REVOKE ALL ON simulator_controls FROM PUBLIC;
GRANT SELECT ON simulator_controls TO orvia_target_agent,orvia_target_observer;
