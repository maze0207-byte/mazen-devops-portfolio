# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm run build
RUN pnpm install --no-frozen-lockfile --prod

# Stage 2: Run
FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "start"]