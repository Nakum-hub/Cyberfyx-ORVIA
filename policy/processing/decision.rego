package orvia.processing
import rego.v1

# Inputs are resolved by the customer-local admission transaction, never accepted
# as browser/client assertions. A preview cannot supply this authority.
default decision := {"decision":"BLOCK","reason_codes":["CONDITIONS_NOT_SATISFIED"]}

decision := {"decision":"ALLOW","reason_codes":["CURRENT_MARKETING_AUTHORITY"]} if {
 input.message_class == "MARKETING"
 input.purpose_code == "promotional_marketing"
 input.condition == "AFFIRMATIVE_MARKETING_CONSENT"
 input.published == true
 input.notice_matches == true
 input.consent_state == "GRANTED"
 input.target_current == true
 input.target_restricted == false
 input.quarantined == false
 input.unresolved_suppression == false
}

decision := {"decision":"ALLOW","reason_codes":["EXPLICIT_SYNTHETIC_ORDER_CONDITION"]} if {
 input.message_class == "ORDER_SERVICE"
 input.purpose_code == "order_service_demo"
 input.condition == "APPROVED_SYNTHETIC_ORDER_SERVICE"
 input.published == true
 input.service_condition_current == true
 input.target_current == true
 input.quarantined == false
}
