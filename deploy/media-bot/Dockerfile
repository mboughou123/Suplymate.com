# Grok media bot worker (scripts/media-bot.ts). Build from the repo root:
#   docker build -f deploy/media-bot/Dockerfile -t suplymate/media-bot .
# Only the worker's three runtime packages are installed; the Next.js app is
# not part of this image.
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    MEDIA_BOT_INBOX=/data/media/inbox \
    MEDIA_BOT_NEEDS_DIR=/data/media/needs

WORKDIR /app

COPY deploy/media-bot/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund \
 && npm cache clean --force

COPY tsconfig.json ./tsconfig.json
COPY scripts/media-bot.ts ./scripts/media-bot.ts
COPY src ./src

RUN mkdir -p /data/media/inbox /data/media/needs && chown -R 1000:1000 /data
USER 1000:1000

ENTRYPOINT ["/app/node_modules/.bin/tsx", "scripts/media-bot.ts"]
CMD ["run"]
