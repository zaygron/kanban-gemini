FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm and openssl
RUN apk add --no-cache openssl
RUN npm install -g pnpm

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy app directory
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Install dependencies (frozen-lockfile for consistency)
RUN pnpm install --frozen-lockfile

# Generate Prisma
RUN pnpm --filter api run prisma:generate

# Build shared package
RUN pnpm --filter "@kanban/shared" build

# Build the API
RUN pnpm --filter api build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g pnpm

# Copy built artifacts and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts
COPY --from=builder /app/packages/shared ./packages/shared
# Copy necessary node_modules for individual app if pnpm structured differently, 
# but usually root node_modules is sufficient for monorepo if hoisted.
# Safer to copy local node_modules if they exist, but with pnpm workspaces they are often symlinked.
# For simplicity in this specific monorepo without complex hoisting issues:
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "start"]
