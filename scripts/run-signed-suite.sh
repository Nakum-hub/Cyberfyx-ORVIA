#!/usr/bin/env bash
# Runs one integration suite that plays the vendor to sign synthetic fixtures.
# The release signing pair is exported into this test process only (see
# docs/engineering/credentials-layout.md); the application the suite starts
# still receives no private key, because its launcher strips it.
set -euo pipefail
cd "$(dirname "$0")/.."
suite="${1:?usage: scripts/run-signed-suite.sh <suite.test.ts>}"
key=.local/vendor/signing/release.json
ORVIA_RELEASE_KEY_ID="$(node -p "require('./$key').key_id")"
ORVIA_RELEASE_PUBLIC_KEY="$(node -p "require('./$key').public")"
ORVIA_RELEASE_PRIVATE_KEY="$(node -p "require('./$key').private")"
export ORVIA_RELEASE_KEY_ID ORVIA_RELEASE_PUBLIC_KEY ORVIA_RELEASE_PRIVATE_KEY
export ORVIA_TASK_ID="${ORVIA_TASK_ID:-DPDP}"
exec ./node_modules/.bin/tsx "$suite"
