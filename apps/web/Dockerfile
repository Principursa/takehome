# Use Bun base image for building
FROM oven/bun:1.2.21 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
RUN bun install

# Copy source and build
FROM base AS build
COPY --from=install /app/node_modules node_modules
COPY . .

# Build the web app
ENV NODE_ENV=production
RUN bun run --filter=web build

# Production image with bunx serve
FROM base AS release
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/package.json .

# Install serve globally
RUN bun install -g serve

# Expose port
EXPOSE 3001

# Serve the static files
CMD ["bunx", "serve", "dist", "-l", "3001"]
