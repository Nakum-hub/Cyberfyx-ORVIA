// Generated from canonical routes. Do not edit.
export interface EndpointMap {
  health: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Health> };
  session: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Session> };
  overview: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Overview> };
  list_purposes: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.PurposeList> };
  create_purposes: { request: import('zod').infer<typeof import('../src/index.ts').schemas.PurposeCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Purpose> };
  list_notices: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.NoticeList> };
  create_notices: { request: import('zod').infer<typeof import('../src/index.ts').schemas.NoticeCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Notice> };
  list_policies: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.PolicyList> };
  create_policies: { request: import('zod').infer<typeof import('../src/index.ts').schemas.PolicyCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Policy> };
  list_systems: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.SystemList> };
  create_systems: { request: import('zod').infer<typeof import('../src/index.ts').schemas.SystemCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.System> };
  list_principals: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.PrincipalList> };
  create_principals: { request: import('zod').infer<typeof import('../src/index.ts').schemas.PrincipalCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Principal> };
  publish_policy: { request: import('zod').infer<typeof import('../src/index.ts').schemas.PolicyPublish>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Policy> };
  control_map: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.ControlMap> };
  check_system: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.System> };
  own_consents: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.ConsentList> };
  grant: { request: import('zod').infer<typeof import('../src/index.ts').schemas.Grant>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Receipt> };
  withdraw: { request: import('zod').infer<typeof import('../src/index.ts').schemas.Withdraw>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Receipt> };
  own_receipt: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.ReceiptView> };
  workflows: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.WorkflowList> };
  workflow: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Workflow> };
  reconcile: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.AcceptedOperation> };
  attest: { request: import('zod').infer<typeof import('../src/index.ts').schemas.ManualAttestation>; response: import('zod').infer<typeof import('../src/index.ts').schemas.AcceptedOperation> };
  failures: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.FailureList> };
  evidence: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Evidence> };
  export: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.Evidence> };
  evaluate: { request: import('zod').infer<typeof import('../src/index.ts').schemas.Evaluate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.Decision> };
  start_test: { request: import('zod').infer<typeof import('../src/index.ts').schemas.TestRunCreate>; response: import('zod').infer<typeof import('../src/index.ts').schemas.TestRun> };
  test_run: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.TestRun> };
  capabilities: { request: undefined; response: import('zod').infer<typeof import('../src/index.ts').schemas.CapabilityList> };
}
