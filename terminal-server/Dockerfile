# ──────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ──────────────────────────────────────────────
# Runtime (in-cluster; uses ServiceAccount + loadFromCluster)
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache tini curl \
    && adduser -D -u 1001 -s /sbin/nologin terminal

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=30001

EXPOSE 30001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:30500/health || exit 1

USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
