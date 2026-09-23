FROM node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
ENV NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
RUN npm install --prefix /opt/orvia-tools --ignore-scripts --no-audit --no-fund pnpm@12.4.2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/package.json frontend/package.json
COPY services/worker/package.json services/worker/package.json
COPY backend/auth/package.json backend/auth/package.json
COPY backend/api/package.json backend/api/package.json
COPY shared/contracts/package.json shared/contracts/package.json
COPY database/customer/package.json database/customer/package.json
COPY backend/domain/package.json backend/domain/package.json
COPY backend/policy-sdk/package.json backend/policy-sdk/package.json
COPY backend/privacy-control/package.json backend/privacy-control/package.json
COPY shared/testing/package.json shared/testing/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store node /opt/orvia-tools/node_modules/pnpm/bin/pnpm.mjs install --frozen-lockfile
COPY . .
RUN node /opt/orvia-tools/node_modules/pnpm/bin/pnpm.mjs build
ENV ORVIA_WORKSPACE_ROOT=/app
ENTRYPOINT ["node", "infrastructure/runtime-entry.mjs"]
