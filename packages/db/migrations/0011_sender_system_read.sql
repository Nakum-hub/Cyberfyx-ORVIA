CREATE POLICY sender_read ON app.systems FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('send.admit'));
