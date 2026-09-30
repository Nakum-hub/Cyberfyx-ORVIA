FROM docker@sha256:2a232a42256f70d78e3cc5d2b5d6b3276710a0de0596c145f627ecfae90282ac AS docker
FROM node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
COPY --from=docker /usr/local/bin/ /usr/local/bin/
COPY --from=docker /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
RUN apt-get update && apt-get install -y --no-install-recommends bash ca-certificates curl git iptables iproute2 openssl procps xz-utils \
    && npm install --global pnpm@12.4.2 \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
WORKDIR /qualification
ENTRYPOINT ["dockerd", "--host=unix:///var/run/docker.sock", "--storage-driver=vfs"]
