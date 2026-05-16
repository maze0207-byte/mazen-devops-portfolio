# ──────────────────────────────────────────────
# Stage 1: Build node-pty (requires native compilation)
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Runtime — sandbox shell environment
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install sandbox tools (bash, curl, jq, kubectl)
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    coreutils \
    procps \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/kubectl

# Create non-root visitor user
RUN adduser -D -u 1001 -s /bin/bash visitor \
    && mkdir -p /scripts /home/visitor /tmp \
    && chown -R visitor:visitor /home/visitor

# Copy application
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy sandbox scripts (these are copied into terminal-server/scripts/ at build time)
COPY scripts/restricted-shell.sh /scripts/restricted-shell.sh
COPY scripts/motd.sh /scripts/motd.sh
COPY files/about.txt /etc/about.txt

# Make scripts executable
RUN chmod +x /scripts/restricted-shell.sh /scripts/motd.sh \
    && chown visitor:visitor /etc/about.txt

# Environment
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
ENV SHELL_PATH=/scripts/restricted-shell.sh
ENV HOME=/home/visitor

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://127.0.0.1:4000/health || exit 1

# Run as non-root
USER 1001

CMD ["node", "dist/server.js"]
