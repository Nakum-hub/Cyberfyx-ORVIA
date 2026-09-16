package orvia.bootstrap
import rego.v1

# Service smoke only. This policy does not authorize processing or administration.
default ready := false
ready if {
  input.profile == "CUSTOMER_LOCAL_SYNTHETIC"
  input.operation == "BOOTSTRAP_READINESS"
}
