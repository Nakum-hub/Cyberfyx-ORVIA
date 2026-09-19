FROM node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
ENV NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
RUN npm install --prefix /opt/orvia-tools --ignore-scripts --no-audit --no-fund pnpm@12.4.2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/policy-sdk/package.json packages/policy-sdk/package.json
COPY packages/privacy-control/package.json packages/privacy-control/package.json
COPY packages/testing/package.json packages/testing/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store node /opt/orvia-tools/node_modules/pnpm/bin/pnpm.mjs install --frozen-lockfile
COPY . .
RUN node /opt/orvia-tools/node_modules/pnpm/bin/pnpm.mjs build
ENV ORVIA_WORKSPACE_ROOT=/app
ENTRYPOINT ["node", "infrastructure/runtime-entry.mjs"]
