# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

RUN corepack enable pnpm

COPY --from=builder /app ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "start"]