# --- Stage 1: Build Workspace Modules ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Define build-time environment variables for the builder stage (default to development to ensure devDependencies are installed)
ARG NODE_ENV=development
ARG VITE_API_URL
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}

# Install build tools required for node-gyp and native compiler bindings
RUN apk add --no-cache python3 make g++ gcc libc-dev

# Copy packagers manifests explicitly
COPY package.json package-lock.json ./

# Configure npm to utilize Python 3 for node-gyp compilation
ENV PYTHON=/usr/bin/python3

# Install all workspace dependencies
RUN npm ci --include=dev --legacy-peer-deps

# Copy full-source codebase
COPY . .

# Compile application assets and backend server
RUN npm run build

# Stage 2: Runner Stage
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ARG NODE_ENV=production
ARG PORT=3000
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Copy compiled bundles, static assets and required package manifests
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/drizzle ./drizzle
COPY --from=builder /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /usr/src/app/drizzle-postgres.config.ts ./drizzle-postgres.config.ts
COPY --from=builder /usr/src/app/drizzle.config.json ./drizzle.config.json
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json

# Install production-only dependencies
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps

# Create a storage volume directory for projects saved on server filesystems
RUN mkdir -p projects && chown -R node:node /usr/src/app

# Relinquish superuser privileges to the default node user for maximum sandbox security
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Open internal routing interface
EXPOSE 3000

# Fire up standalone server
CMD ["node", "dist/server.cjs"]

