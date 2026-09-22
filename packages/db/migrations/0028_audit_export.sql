-- WP24 / M33 Audit Administration, FR-M33-03.
--
-- Export is a separate permission from read, which leaves one way for the
-- export to lie. Row-level security decides what an actor can see, and it was
-- keyed on audit.read alone; a role granted audit.export without it would have
-- selected nothing and been handed a file stating that it carried everything
-- the filter matched, which would have been true and useless and read as a
-- complete record of a quiet period.
--
-- Nothing is widened here. The two capabilities are held together today, and
-- this is what makes that a property of the schema rather than of the current
-- role table: whoever may export may read the rows they are exporting.
CREATE POLICY scoped_audit_export_read ON app.audit_events FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.export'));
