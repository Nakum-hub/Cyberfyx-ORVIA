# Workflow bundle build and distribution proposal

Source-only review; implementation and execution NOT_RUN by this reviewer. Root's new startup diagnostic still failed after nine PASS controls: measured startup 60.54 seconds, including 36.955 seconds in Worker.create workflow webpack compilation. That supports moving compilation into the explicit build phase; it does not by itself prove that compilation is the entire failure cause. Keep the existing durable-state deadline unchanged and retain the failed evidence.

Current package.json `build` runs only scripts/web.ts build. infrastructure/runtime.Dockerfile runs that command after pinned dependency installation. scripts/start-orvia.ts:155–165 conditionally builds the web application, while scripts/app-run.ts:49 and workflow.test.ts:51 both start the canonical worker main.ts. createWithdrawalWorker currently supplies workflowsPath, so every fresh worker process compiles workflow code. scripts/package-candidate.ts verifies source/image/web identity but has no workflow-bundle identity check.

Minimal coordinated paths:

| Path | Required change |
|---|---|
| services/worker/src/workflow-bundle.ts (new) | Shared content identity and strict bundle verifier; resolve artifact location from import.meta.url/workspace root, not arbitrary environment input. |
| scripts/build-workflow-bundle.ts (new) | Explicitly call installed @temporalio/worker bundleWorkflowCode against services/worker/src/withdrawal-workflows.ts; emit bundle and metadata only after successful compilation. |
| services/worker/src/withdrawal-worker.ts | Verify artifact and identity before NativeConnection/Worker.create; pass workflowBundle instead of workflowsPath. Missing, corrupt or stale bundle must fail with a bounded error, with no hidden runtime compile fallback. |
| package.json | Add explicit worker:build and worker:bundle:check scripts; coordinate normal build to build web and worker sequentially. |
| scripts/start-orvia.ts | Independently check worker bundle even when web build is current, and invoke explicit worker build if stale before supervisor startup. Record completion only after success. |
| infrastructure/runtime.Dockerfile | Ensure its normal build produces and retains the bundle/metadata; verify bundle inside image build. No source checkout/Git availability dependency inside the container. |
| scripts/package-candidate.ts | Verify bundle and metadata in host and runtime image and include their digests and input identity in release manifest. |
| qualification runner/inventory | Require worker bundle verification before frozen integrations; record exact input and output digests alongside source/build. Include meaningful missing/corrupt/stale/dependency-change unit controls and updated inventory. |

Use an ignored generated path such as services/worker/.build/withdrawal-workflows.js plus metadata, explicitly excluded from input hashing. Runtime image generation copies enumerated source only and must regenerate the artifact in-image; it must never trust an ignored host artifact. Docker build currently includes installed dependencies and source, so this is practical. Do not put the generated artifact in private profile storage where packaging cannot reproduce it.

Metadata should cover workflow entry and all actually bundled source dependencies, pinned lockfile, worker package manifest, bundle-builder/verifier source, bundle options, resolved installed Temporal worker version, and SHA-256 of bundle bytes. Installed API documentation at services/worker/node_modules/@temporalio/worker/lib/worker-options.d.ts:118–119 explicitly requires the exact same worker version for bundling and Worker.create. Avoid whole-repository source hashes requiring Git in the deployed image; use a deterministic explicit or webpack-derived dependency inventory, and reject unknown external workflow dependencies. Type-only activity imports may not be emitted, so distinguish workflow runtime inputs from broader release source identity.

Write bundle and metadata through temporary files and publish metadata last. On verification recompute input identity and bundle digest; stale outputs must not be accepted because a timestamp or previous web BUILD_ID exists. Shared queue name, workflow type, activity names/options, stable workflow IDs, namespace, concurrency, retry policy and workflows source remain unchanged. A prebuilt bundle must preserve behavior, not replace the canonical workflow with a reduced test path.

Qualification needs an actual prebuilt startup measurement plus the unchanged full workflow controls. A focused pass alone does not repair the failed frozen 44-suite ledger; retain its 43 PASS / 1 FAIL result and run required qualification against the newly committed source and fresh identified build. Distribution/package verification remains a separate gate; the existing prototype package command is not a production-release approval.
