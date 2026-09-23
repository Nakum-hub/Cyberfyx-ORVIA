# A00 dependency selection and verification

Final Windows repeatability correction: warm offline installation exposed pnpm's build-cache staging-directory rename failure. `sideEffectsCache: false` avoids that cache path while retaining version pins, release-age/peer/engine checks and the exact build-script allowlist. Recovery install and an immediate repeat `install --frozen-lockfile --offline` both exited 0. A partially moved generated dependency backup remains ignored under `.local/install-recovery-20260916-0930`; a subsequent attempted atomic rename failed and was not counted as a successful operation. No source files were moved, deleted or rewritten by those recovery attempts. These local limitations and failed command records remain part of the evidence.

Resolution occurred against public official metadata on 2026-09-16. `infrastructure/toolchain.lock.json` contains observed registry versions, engine/peer constraints, integrity values and OCI image digests. `pnpm-lock.yaml` fixes the installed dependency graph. `scripts/resolve-toolchain.mjs` is an explicit setup-time research utility; it is never imported by runtime code and does not automatically change the pins.

| Component | Selected pin |
|---|---|
| Node / pnpm | 24.21.0 / 12.4.2 |
| TypeScript | 5.9.3 |
| Next / React / React DOM | 16.3.5 / 19.3.0 / 19.3.0 |
| Tailwind / PostCSS integration | 4.3.3 / 4.3.3 |
| Drizzle ORM / Kit / pg | 0.45.2 / 0.31.10 / 8.23.0 |
| Better Auth | 1.7.5 |
| Zod / openapi-typescript | 4.6.5 / 7.13.0 |
| Temporal TypeScript packages | 1.24.0 |
| Playwright | 1.63.0 (browser suite belongs to UI lane; not executed in A00) |
| ESLint / typescript-eslint / tsx | 10.10.0 / 8.70.0 / 4.23.13 |
| PostgreSQL / OPA / Temporal server | 17.11 / 1.20.2 / 1.32.0, pinned OCI digests in Compose |

TypeScript 5.9.3 is the compatible initial selection: openapi-typescript requires the 5.x line and typescript-eslint's observed range is below 6.1.0. The newer registry major was not substituted into an incompatible graph. Node type declarations use 24.13.4 because the newer patch had not cleared the configured 1440-minute release-age rule. Exact dependency declarations, strict engine checks, strict peers and the release-age gate remain enabled.

The first install rejected the too-recent Node types. A later install installed packages but rejected unapproved build scripts. pnpm 12 moved non-auth configuration to `pnpm-workspace.yaml` and removed `onlyBuiltDependencies`; the reviewed build allowlist now names exact @swc/core, esbuild and protobufjs versions. The retry of `install --frozen-lockfile` completed with exit 0. Build scripts verify native binaries / package compatibility. No broad allow-all or approval bypass was added. The initially attempted nested pnpm build invoked the unrelated global shim and failed trying to resolve @pnpm/exe; the build wrapper now invokes the installed Next CLI with the selected Node directly.

Node's downloaded Windows archive SHA-256 is `158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541`, checked against the official release checksums. Install, typecheck, lint, unit tests, generation, actual service probes and Next build provide compatibility evidence. They do not establish absence of vulnerabilities. The public dependency audit was blocked by automatic approval review before execution because it would transmit private dependency metadata. Its state is NOT_RUN; no advisory-clean claim is made. Local credential/pattern scanning is separately recorded and does not replace that audit.

Official references used: [Node release metadata](https://nodejs.org/dist/index.json), [pnpm configuration changes](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md), [pnpm build allowlist](https://pnpm.io/settings#allowbuilds), [Zod JSON Schema](https://zod.dev/json-schema), [Temporal development server](https://docs.temporal.io/cli/server), [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/). Better Auth mount/route choices were also checked against the installed 1.7.5 implementation. Container flags were checked against the actual pinned images, not inferred from an older kit.
