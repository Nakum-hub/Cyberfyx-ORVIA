GRANT SELECT ON app.system_checks TO orvia_worker;
CREATE POLICY worker_read ON app.system_checks FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY capability_invalidation ON app.workflows FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('systems.check')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
