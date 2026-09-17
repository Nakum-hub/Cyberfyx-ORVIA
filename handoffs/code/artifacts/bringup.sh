set -x
W=/c/Cyberfyx-projects/orvia-ui-b00
N="/c/Cyberfyx-projects/Cyberfyx_ORVIA/.local/tools/node-v24.21.0-win-x64/node.exe"
P="/c/Cyberfyx-projects/Cyberfyx_ORVIA/.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs"
export ORVIA_PROFILE=ui-b00
run(){ echo "### $*"; "$N" "$P" --dir "$W" "$@"; echo "### exit=$?"; }
run profile:init ui-b00
run services up
run db:migrate
run preflight
run auth:init confirm:ui-b00
run auth:bootstrap confirm:ui-b00
run seed:auth confirm:ui-b00
