# Privacy regression gate (CI): staff authority. Separation of duties, MFA and read-only roles are what keep a single login
# from approving its own disclosure, release or erasure.
package orvia.admin_test

import data.orvia.admin
import rego.v1

may(role, cap, mfa) if admin.authorize with input as {"actor_domain": "STAFF", "role": role, "capability": cap, "mfa_verified": mfa}

test_auditor_reads_but_never_writes if {
	may("AUDITOR", "registry.read", false)
	not may("AUDITOR", "registry.write", true)
	not may("AUDITOR", "rights.release", true)
}

test_auditor_may_export_the_audit_trail_but_not_administer_it if {
	may("AUDITOR", "audit.export", false)
	not may("AUDITOR", "audit.administer", true)
}

test_admin_without_mfa_has_nothing if {
	not may("ORG_ADMIN", "registry.read", false)
	not may("ORG_SUPER_ADMIN", "rights.release", false)
}

test_admin_cannot_approve_or_release if {
	may("ORG_ADMIN", "registry.write", true)
	not may("ORG_ADMIN", "rights.release", true)
	not may("ORG_ADMIN", "operations.approve", true)
	not may("ORG_ADMIN", "retention.approve", true)
	not may("ORG_ADMIN", "registry.sensitive.read", true)
	not may("ORG_ADMIN", "connection.enable", true)
}

test_owner_approves_with_mfa if {
	may("ORG_SUPER_ADMIN", "rights.release", true)
	may("ORG_SUPER_ADMIN", "operations.approve", true)
	may("ORG_SUPER_ADMIN", "registry.sensitive.read", true)
}

test_member_has_only_assigned_operational_work if {
	may("MEMBER", "workflow.read", true)
	not may("MEMBER", "registry.read", true)
	not may("MEMBER", "operations.execute", true)
}

test_the_owner_cannot_delete_their_own_login if {
	not may("ORG_SUPER_ADMIN", "account.own.delete", true)
	may("ORG_ADMIN", "account.own.delete", true)
}

test_principals_and_machines_get_no_staff_authority if {
	not admin.authorize with input as {"actor_domain": "PRINCIPAL", "role": "ORG_SUPER_ADMIN", "capability": "registry.read", "mfa_verified": true}
	not admin.authorize with input as {"actor_domain": "MACHINE", "role": "ORG_SUPER_ADMIN", "capability": "registry.read", "mfa_verified": true}
}

test_an_unknown_capability_is_refused if not may("ORG_SUPER_ADMIN", "everything", true)
