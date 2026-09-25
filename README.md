# ORVIA Version 1

ORVIA is a customer-local privacy control platform under active production development. It connects a person's privacy decision to durable workflow, restricted downstream actions, independent observation, and local evidence. The approved product baseline is [master revision 1.4](ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md). Earlier prototype documents are historical implementation evidence; they do not define the final Version 1 scope.

**Release status: BUILD_IN_PROGRESS — NOT_RELEASE_QUALIFIED.** The application runs with synthetic targets, but production provider integrations, capacity and recovery exercises, security review, and formal candidate acceptance remain open. See [production readiness](docs/engineering/PRODUCTION_READINESS.md) and [current state](CURRENT_STATE.md).

## Run locally

The supported development host is Windows x64 with Docker Desktop (Linux containers), Git, and free local ports `4330`, `55433`, `58183`, and `57235`. Setup provisions the repository-pinned Node 24.21.0 and pnpm 12.4.2 into `.local/tools`.

```powershell
npm start
```

The command sets up the local profile, services, schema, and application, then holds the foreground. Stop it with Ctrl+C. For explicit setup and status:

```powershell
npm run setup
npm run status
npm stop
```

The staff workspace is at `https://127.0.0.1:4330/workspace`; the Privacy Centre is at `https://127.0.0.1:4330/privacy`. Local credentials, TLS material, and machine tokens are generated into the ignored `.local/profiles/rehearsal` directory. Read the [operator instructions](docs/engineering/local-packaging-and-operation.md) before using the local certificate or handling evidence. Do not share secrets or real customer data in development fixtures.

## Implementation and scope

The repository contains a staff and principal UI, authenticated API, durable customer database, consent and policy logic, workflow worker, restricted connector agent, synthetic CRM/REST targets, evidence exports, and local tests. The target simulator is a test fixture, not a connector to an actual customer CRM. The [capability register](tracking/capabilities.json) records implemented subsets, partial modules, unimplemented Version 1 work, and Version 2 model deferrals. The [Agent Build Pack](ORVIA_V1_Agent_Build_Pack/) is the work inventory, subject to the approved master.

A withdrawal receipt records acceptance after a durable commit. It does not claim downstream success. Workflow acknowledgement, independent readback, unknown effects, manual obligations, and coverage gaps remain distinct. Evidence stays customer-local. Version 1 has no hosted model runtime, training, learned embeddings, or GPU dependency.

## Develop and verify

```powershell
npm run contracts:check
npm run tracking:check
npm run typecheck
npm run lint
npm test
```

Integration and browser suites require their documented isolated runtime profile; see [engineering docs](docs/engineering/README.md). A passing unit suite does not turn an unexecuted application scenario into a pass. The 34 scenarios in [acceptance tracking](tracking/acceptance.json) remain `NOT_RUN` until each complete scenario is executed and reviewed against an identified release candidate. The [historical acceptance checklist](docs/prototype/RELEASE_CHECKLIST.md) preserves earlier sprint evidence.

## Code map

| Area | Path |
|---|---|
| UI | [frontend/src/app](frontend/src/app), [frontend/src/components](frontend/src/components) |
| API and domain | [backend/api/src](backend/api/src), [backend/domain/src](backend/domain/src) |
| Privacy control | [backend/privacy-control/src](backend/privacy-control/src) |
| Database migrations | [database/customer/migrations](database/customer/migrations) |
| Worker and agent | [services/worker/src](services/worker/src), [services/agent/src](services/agent/src) |
| Connectors and test targets | [connectors/src](connectors/src), [services/synthetic-target](services/synthetic-target) |
| Contract | [shared/contracts](shared/contracts) |
| Tests and operations | [tests](tests), [scripts](scripts), [docs/engineering](docs/engineering) |

The [DPDP operational extension pack](ORVIA_V1_DPDP_Operational_Extension_Pack/) is being implemented in a separate work lane in this checkout. Coordinate shared files and runtime resources as described in [AGENTS.md](AGENTS.md).
