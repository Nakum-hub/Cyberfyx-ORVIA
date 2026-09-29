package orvia.vendor

import rego.v1

# Vendor area of the vendor's own VENDOR_SERVICE installation (revision 1.5
# addendum). Only vendor staff sessions (VENDOR_STAFF) and client vendor-account
# sessions (CLIENT_ACCOUNT) are ever evaluated here, and every decision needs a
# completed authenticator ceremony. A customer staff, principal or supplier
# actor is never authorised: none of these rules match its domain.

default authorize := false

team_caps := {"vendor.team.read", "vendor.team.manage"}
admin_caps := {"organisations.read", "organisations.manage", "licences.read", "licences.issue", "engagements.read", "engagements.manage", "support.read", "support.manage", "vendor.audit.read", "payments.read", "vendor.overview.read"}
fieldwork_caps := {"engagements.read", "organisations.read", "audit.fieldwork", "support.read"}

authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role in {"VENDOR_SUPER_ADMIN", "VENDOR_ADMIN"}
  input.capability in team_caps | admin_caps
}
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role in {"LEAD_AUDITOR", "AUDITOR", "AUDIT_REVIEWER"}
  input.capability in fieldwork_caps
}
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role == "LEAD_AUDITOR"
  input.capability == "audit.report.draft"
}
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role == "AUDIT_REVIEWER"
  input.capability == "audit.report.approve"
}
# Audit practice (task AUDIT-PRACTICE-01).
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role in {"VENDOR_SUPER_ADMIN", "VENDOR_ADMIN", "LEAD_AUDITOR"}
  input.capability == "practice.manage"
}
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role == "VENDOR_SUPER_ADMIN"
  input.capability == "practice.activate"
}
authorize if {
  input.actor_domain == "VENDOR_STAFF"
  input.mfa_verified == true
  input.role == "AUDIT_REVIEWER"
  input.capability in {"practice.approve", "engagement.accept"}
}
authorize if {
  input.actor_domain == "CLIENT_ACCOUNT"
  input.mfa_verified == true
  input.capability == "packages.upload"
}
