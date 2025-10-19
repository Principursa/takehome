# Use Bun base image for building
FROM oven/bun:1.2.21 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/web/package.json /temp/dev/apps/web/
COPY packages/api/package.json /temp/dev/packages/api/
COPY packages/auth/package.json /temp/dev/packages/auth/
COPY packages/db/package.json /temp/dev/packages/db/
RUN cd /temp/dev && bun install

# Copy source and build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
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
