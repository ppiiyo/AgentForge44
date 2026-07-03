# --- Stage 1: Build Workspace Modules ---
FROM node:20-alpine AS builder

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
RUN npm ci

# Copy full-source codebase
COPY . .

# Compile application assets and backend server
RUN npm run build

# Stage 2: Runner Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ARG NODE_ENV=production
ARG PORT=3000
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Copy compiled bundles and static assets from builder container
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./
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

