-- Restrictive MEMBER policies reference these relations even for another role.
-- Grant query-planning access; existing RLS still exposes no workflow/action rows
-- to target.execute-only agents. Agent mutation authority is unchanged.
GRANT SELECT ON app.workflows,app.action_plans TO orvia_agent_control;
