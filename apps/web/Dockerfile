FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy app directory
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
# Copy API types/interfaces if shared? Assuming no shared lib folder for now based on file list.

# Install dependencies
RUN pnpm install

# Build the Web App
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm --filter web build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm install -g pnpm

# Copy necessary files for Next.js standalone mode (if configured) or standard start
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
