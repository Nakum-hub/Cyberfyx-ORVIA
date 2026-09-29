package orvia.admin

import rego.v1

default authorize := false

read_caps := {"grc.read", "ai_governance.read", "overview.read", "configuration.read", "principals.read", "workflow.read", "evidence.read", "evidence.export", "tests.read", "capabilities.read", "graph.read", "rights.read", "retention.read", "coverage.read", "processor.read", "incident.read", "notification.read", "licence.read", "support.read", "update.read", "audit.read", "health.read", "registry.read"}
# FR-M33-03 names export as a permission of its own, beside read and filter.
# Taking the trail out of the installation is the act that leaves the building,
# so it is not something every reader of the trail acquires with the read.
export_audit_caps := {"audit.export"}
admin_caps := {"staff.manage", "grc.write", "ai_governance.write", "configuration.write", "systems.check", "principals.create", "action.reconcile", "manual.attest", "policy.preview", "graph.write", "rights.write", "retention.write", "coverage.manage", "processor.write", "incident.write", "notification.manage", "support.manage", "registry.write", "operations.execute"}

authorize if {
  input.actor_domain == "STAFF"
  input.role == "AUDITOR"
  input.capability in read_caps | export_audit_caps
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
  input.capability in {"grc.approve", "ai_governance.approve", "policy.publish", "tests.run", "rights.release", "retention.approve", "incident.approve", "licence.manage", "support.approve", "update.approve", "audit.administer", "connection.enable", "restore.release", "registry.sensitive.read", "registry.sensitive.write", "operations.approve", "regulatory.manage", "sdf.manage"} | export_audit_caps
}
# Deleting one's own login. Never the owner: an organisation is not left without its owner.
authorize if {
  input.actor_domain == "STAFF"
  input.role in {"ORG_ADMIN", "MEMBER"}
  input.mfa_verified == true
  input.capability == "account.own.delete"
}
authorize if {
  input.actor_domain == "STAFF"
  input.role == "AUDITOR"
  input.capability == "account.own.delete"
}
# DPDPA external audit exchange (revision 1.5 addendum). Preparing and approving a
# package that leaves the installation needs an owner or administrator with MFA;
# the database separately requires the approver to differ from the preparer.
authorize if {
  input.actor_domain == "STAFF"
  input.role in {"ORG_SUPER_ADMIN", "ORG_ADMIN"}
  input.mfa_verified == true
  input.capability in {"audit_exchange.read", "audit_exchange.prepare", "audit_exchange.approve"}
}
authorize if {
  input.actor_domain == "STAFF"
  input.role == "AUDITOR"
  input.capability == "audit_exchange.read"
}
# Database restrictive policies and resource checks require an exact assignment.
authorize if {
 input.actor_domain == "STAFF"
 input.role == "MEMBER"
 input.mfa_verified == true
 input.capability in {"workflow.read", "action.reconcile", "manual.attest"}
}
