# Privacy regression gate (CI): the processing decision ORVIA's send admission asks before any marketing or service message.
# Each test names the DPDP situation it protects. scripts/policy-gate.sh also runs these against deliberately broken copies of
# the policy and requires them to FAIL, so a gate that would pass a broken withdrawal rule is itself caught.
package orvia.processing_test

import data.orvia.processing
import rego.v1

current_marketing := {
	"message_class": "MARKETING", "purpose_code": "promotional_marketing", "condition": "AFFIRMATIVE_MARKETING_CONSENT",
	"published": true, "notice_matches": true, "consent_state": "GRANTED", "target_current": true, "target_restricted": false,
	"quarantined": false, "unresolved_suppression": false,
}

current_order := {
	"message_class": "ORDER_SERVICE", "purpose_code": "order_service_demo", "condition": "APPROVED_SYNTHETIC_ORDER_SERVICE",
	"published": true, "service_condition_current": true, "target_current": true, "quarantined": false,
}

allowed(i) if processing.decision.decision == "ALLOW" with input as i

blocked(i) if processing.decision.decision == "BLOCK" with input as i

test_marketing_allowed_only_with_current_affirmative_consent if allowed(current_marketing)

test_withdrawn_consent_blocks_marketing if blocked(object.union(current_marketing, {"consent_state": "WITHDRAWN"}))

test_never_granted_consent_blocks_marketing if blocked(object.union(current_marketing, {"consent_state": "UNKNOWN"}))

test_expired_consent_blocks_marketing if blocked(object.union(current_marketing, {"consent_state": "EXPIRED"}))

test_unresolved_suppression_blocks_even_with_a_grant if blocked(object.union(current_marketing, {"unresolved_suppression": true}))

test_restricted_target_blocks if blocked(object.union(current_marketing, {"target_restricted": true}))

test_quarantined_after_restore_blocks if blocked(object.union(current_marketing, {"quarantined": true}))

test_notice_mismatch_blocks if blocked(object.union(current_marketing, {"notice_matches": false}))

test_unpublished_policy_blocks if blocked(object.union(current_marketing, {"published": false}))

test_stale_target_generation_blocks if blocked(object.union(current_marketing, {"target_current": false}))

test_a_browser_supplied_preview_is_not_consent if blocked(object.union(current_marketing, {"condition": "PREVIEW"}))

test_marketing_purpose_cannot_ride_a_service_class if blocked(object.union(current_marketing, {"message_class": "ORDER_SERVICE"}))

test_service_condition_cannot_send_marketing if blocked(object.union(current_order, {"message_class": "MARKETING"}))

test_order_service_allowed_with_its_own_condition if allowed(current_order)

test_expired_service_condition_blocks if blocked(object.union(current_order, {"service_condition_current": false}))

test_quarantine_blocks_service_messages_too if blocked(object.union(current_order, {"quarantined": true}))

test_missing_input_is_blocked_never_allowed if blocked({})

test_a_missing_field_is_blocked if blocked(object.remove(current_marketing, ["consent_state"]))

test_string_true_is_not_true if blocked(object.union(current_marketing, {"published": "true"}))
