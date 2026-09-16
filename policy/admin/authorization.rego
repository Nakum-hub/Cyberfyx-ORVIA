package orvia.admin

import rego.v1

default authorize := false

read_caps := {"overview.read", "configuration.read", "principals.read", "workflow.read", "evidence.read", "evidence.export", "tests.read", "capabilities.read", "health.read"}
admin_caps := {"configuration.write", "systems.check", "principals.create", "action.reconcile", "manual.attest", "policy.preview"}

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
  input.capability in {"policy.publish", "tests.run"}
}
# MEMBER is intentionally denied here until A03 supplies an exact assignment.
