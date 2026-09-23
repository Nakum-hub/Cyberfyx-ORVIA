CREATE POLICY assigned_only ON app.system_checks AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER' OR EXISTS(SELECT 1 FROM app.obligations o WHERE o.system_id=system_checks.system_id));
CREATE POLICY member_denied ON app.consent_interactions AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER');
CREATE POLICY member_denied ON app.outbox_events AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER');
