# Whole-product verification inventory

`tracking/qualification-inventory.json` inventories every nonignored file under `tests/`, including uncommitted tests. Generate it with `node --import tsx scripts/qualification-inventory.ts`; check it with the same command and `--check`. Use the repository-pinned Node version. CI checks that test hashes and membership still match.

The inventory separates unit, integration, security, Playwright, standalone browser/transport tests and explicit support files. Unknown naming fails closed and requires review. Adding a file to this inventory does not execute it, establish requirement coverage, or qualify a release.

The older `verify:suites` command runs only its listed base suites. Do not report it as the whole-product battery. The operations runner and expansion/browser scripts also have separate prerequisites. Before running a runtime suite, read its profile and fixture setup, reserve that database/ports/result location, and execute serially. Do not start multiple suites against one profile. Do not reset a profile to make a test pass.

Each qualification run needs a unique identifier, actual command/exit status, evidence bearing that identifier, and the exact candidate source/dependency digests. A previous or merely newest artifact cannot supply a missing current result. Dirty-tree engineering tests remain useful but are not frozen-candidate acceptance. The test-file digest in this inventory alone does not identify the application source.

For a complete release, map the applicable numbered-master requirements and E1 families to positive/adverse tests and reviewed evidence. Preserve requirements without tests as open work. Add provider conformance, installation/upgrade/restore, accessibility, capacity, supply-chain and independent assessment evidence, then obtain the required human release decision. No percentage threshold waives a blocking safety defect.

The source-section generator now preserves existing review and requirement-mapping fields while checking immutable section provenance. It refuses changed section hashes, changed authority metadata, missing sections and malformed review containers. It never assigns review or acceptance based on source presence.
