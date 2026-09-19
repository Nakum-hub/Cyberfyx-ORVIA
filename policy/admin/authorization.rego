package orvia.admin

import rego.v1

default authorize := false

read_caps := {"overview.read", "configuration.read", "principals.read", "workflow.read", "evidence.read", "evidence.export", "tests.read", "capabilities.read", "graph.read", "rights.read", "retention.read", "coverage.read", "processor.read", "incident.read", "notification.read", "licence.read", "health.read"}
admin_caps := {"configuration.write", "systems.check", "principals.create", "action.reconcile", "manual.attest", "policy.preview", "graph.write", "rights.write", "retention.write", "coverage.manage", "processor.write", "incident.write", "notification.manage"}

authorize if {
  input.actor_domain == "STAFF"
  input.role == "AUDITOR"
  input.capability in read_caps
}
authorize if {
  input.actor_domain == "STAFF"
  input.role in {"ORG_SUPER_ADMIN", "ORG_ADMIN"}
  input.mfa_verified == true
  input.capability in read_caps | admin_caps
}
authorize if {
  input.actor_domain == "STAFF"
  input.role == "ORG_SUPER_ADMIN"
  input.mfa_verified == true
  input.capability in {"policy.publish", "tests.run", "rights.release", "retention.approve", "incident.approve", "licence.manage"}
}
# Database restrictive policies and resource checks require an exact assignment.
authorize if {
 input.actor_domain == "STAFF"
 input.role == "MEMBER"
 input.mfa_verified == true
 input.capability in {"workflow.read", "action.reconcile", "manual.attest"}
}
