# Use Bun base image
FROM oven/bun:1.2.21 AS base
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/server/package.json /temp/dev/apps/server/
COPY packages/api/package.json /temp/dev/packages/api/
COPY packages/auth/package.json /temp/dev/packages/auth/
COPY packages/db/package.json /temp/dev/packages/db/
RUN cd /temp/dev && bun install

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY apps/server/package.json /temp/prod/apps/server/
COPY packages/api/package.json /temp/prod/packages/api/
COPY packages/auth/package.json /temp/prod/packages/auth/
COPY packages/db/package.json /temp/prod/packages/db/
RUN cd /temp/prod && bun install

# Copy node_modules from temp directory
# Then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build packages
ENV NODE_ENV=production
RUN bun run build

# Copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/apps/server ./apps/server
COPY --from=prerelease /app/packages ./packages
COPY --from=prerelease /app/package.json .
COPY --from=prerelease /app/bun.lock .

# Run the app
USER bun
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "apps/server/src/index.ts"]
