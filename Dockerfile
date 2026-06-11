# --- Stage 1: Build Workspace Modules ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build tools required for node-gyp and native C++ compilers
RUN apk add --no-cache python3 make g++ gcc libc-dev

# Copy package dependency manifests
COPY package*.json ./

# Explicitly configure npm to utilize Python 3 for node-gyp compilation
RUN npm config set python /usr/bin/python3

# Install workspace dependencies (including devDependencies needed for compiling)
RUN npm ci

# Copy full-source codebase
COPY . .

# Compile application frontend (Vite) and backend (Express server bundled with esbuild)
RUN npm run build

# --- Stage 2: Production Container ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install runtime utilities and minimal python setup for native production builds if triggered
RUN apk add --no-cache python3 make g++ gcc libc-dev

# Copy compiled bundles and assets from builder container
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Configure npm to use python3 also in production runner stage
RUN npm config set python /usr/bin/python3

# Install only production-level node modules
RUN npm ci --only=production

# Open internal routing interfaces
EXPOSE 3000

# Fire up standalone server
CMD ["node", "dist/server.cjs"]
