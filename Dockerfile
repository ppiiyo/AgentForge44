# --- Stage 1: Build Workspace Modules ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency mappings
COPY package*.json ./
RUN npm ci

# Copy full-stack workspaces code bases
COPY . .

# Compile optimized static bundle and bundle Express backend to dist/server.cjs
RUN npm run build

# --- Stage 2: Production Container ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy built bundles and static dist output from build container
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production-level node modules to minimize space footprint
RUN npm ci --only=production

# Open internal routing interfaces
EXPOSE 3000

# Fire up standalone server
CMD ["node", "dist/server.cjs"]
