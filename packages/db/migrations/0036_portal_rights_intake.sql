-- WP07 / M14 Rights Management — portal self-service intake.
--
-- The Act gives the right to the data principal and expects the fiduciary to
-- provide a readily available means of exercising it. Until now app.rights_requests
-- admitted only STAFF holding rights.write, so a request could be recorded *about*
-- a person but never *by* them. Recording somebody else's request on their behalf
-- is a fallback, not the mechanism.
--
-- The policies below are deliberately narrower than the staff ones in every
-- direction that matters:
--
--   - INSERT and SELECT only, and only for a PRINCIPAL. A principal never gains
--     UPDATE or DELETE on a rights request: once raised, how the request moves
--     is the organisation's act and its record, and a requester able to edit the
--     record would be able to rewrite what they had asked for after the fact.
--   - Bound to the person. `app.own_principal(principal_id)` compares the row
--     against the principal identifier in the session, so the database refuses a
--     row about anybody else even if the application layer were wrong.
--   - Portal rows only. A request recorded through another channel stays
--     invisible here: the principal did not raise it in this portal, and the
--     organisation's intake records are not theirs to browse.
--
-- The events table takes the same treatment because a request with no visible
-- history is a status page a reader has to take on trust.

CREATE POLICY portal_rights_insert ON app.rights_requests FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
   AND app.has_capability('rights.own.write')
   AND app.own_principal(principal_id)
   -- The channel is not the caller's to choose. A row inserted from the portal
   -- says PORTAL, so the field that later tells an auditor how the request
   -- actually arrived cannot be set to anything else from here.
   AND document->>'submitted_channel'='PORTAL'
   -- A principal raises a request for themselves. Acting under a mandate is a
   -- represented case the organisation records, not a portal self-service one.
   AND mandate_id IS NULL
   AND state='RECEIVED');

CREATE POLICY portal_rights_read ON app.rights_requests FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
   AND (app.has_capability('rights.own.read') OR app.has_capability('rights.own.write'))
   AND app.own_principal(principal_id)
   AND document->>'submitted_channel'='PORTAL');

CREATE POLICY portal_rights_event_insert ON app.rights_request_events FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
   AND app.has_capability('rights.own.write')
   -- Only against a request that is already the principal's own, so an event
   -- cannot be appended to somebody else's history.
   AND EXISTS (SELECT 1 FROM app.rights_requests r
                WHERE r.tenant_id=rights_request_events.tenant_id
                  AND r.legal_entity_id=rights_request_events.legal_entity_id
                  AND r.environment_id=rights_request_events.environment_id
                  AND r.id=rights_request_events.request_id
                  AND app.own_principal(r.principal_id)));

CREATE POLICY portal_rights_event_read ON app.rights_request_events FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
   AND (app.has_capability('rights.own.read') OR app.has_capability('rights.own.write'))
   AND EXISTS (SELECT 1 FROM app.rights_requests r
                WHERE r.tenant_id=rights_request_events.tenant_id
                  AND r.legal_entity_id=rights_request_events.legal_entity_id
                  AND r.environment_id=rights_request_events.environment_id
                  AND r.id=rights_request_events.request_id
                  AND app.own_principal(r.principal_id)));

-- The principal reference has to be readable to confirm the session still names
-- a live reference before a request is raised against it.
CREATE POLICY portal_principal_reference_read ON app.principal_references FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
   AND (app.has_capability('rights.own.read') OR app.has_capability('rights.own.write'))
   AND app.own_principal(id));
