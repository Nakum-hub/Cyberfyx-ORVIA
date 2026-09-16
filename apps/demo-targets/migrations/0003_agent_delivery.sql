CREATE TABLE agent_deliveries(command_id uuid PRIMARY KEY,resource_id uuid NOT NULL REFERENCES marketing_memberships(resource_id),command_digest text NOT NULL,receipt jsonb NOT NULL);
ALTER TABLE agent_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_delivery ON agent_deliveries FOR ALL USING(EXISTS(SELECT 1 FROM marketing_memberships m WHERE m.resource_id=agent_deliveries.resource_id)) WITH CHECK(EXISTS(SELECT 1 FROM marketing_memberships m WHERE m.resource_id=agent_deliveries.resource_id));
REVOKE ALL ON agent_deliveries FROM PUBLIC;
GRANT SELECT,INSERT ON agent_deliveries TO orvia_target_agent;
