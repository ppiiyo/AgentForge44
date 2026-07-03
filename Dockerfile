# --- Stage 1: Build Workspace Modules ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build tools required for node-gyp and native compiler bindings
RUN apk add --no-cache python3 make g++ gcc libc-dev

# Copy packagers manifests
COPY package*.json ./

# Configure npm to utilize Python 3 for node-gyp compilation
ENV PYTHON=/usr/bin/python3

# Install all workspace dependencies
RUN npm ci

# Copy full-source codebase
COPY . .

# Compile application frontend (Vite) and backend (Express server bundled with esbuild)
RUN npm run build

# --- Stage 2: Production Container ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled bundles and static assets from builder container
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/drizzle ./drizzle

# Install only production-level node modules, skipping heavy compilers
RUN npm ci --omit=dev

# Create a storage volume directory for projects saved on server filesystems
RUN mkdir -p projects && chown -R node:node /usr/src/app

# Relinquish superuser privileges to the default node user for maximum sandbox security
USER node

# Open internal routing interface
EXPOSE 3000

# Fire up standalone server
CMD ["node", "dist/server.cjs"]

