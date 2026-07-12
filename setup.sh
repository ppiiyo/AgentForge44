#!/usr/bin/env bash

# =================================================================------------
#  🌌 KostromAi44 - Automated Local Setup & Initialization Script
# =================================================================------------

set -euo pipefail

# Output colors pairing
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "    🌌 KostromAi44: Visual LLM Workflow Orchestrator Setup 🌌"
echo "============================================================================"
echo -e "${NC}"

# 1. Verification of System Prerequisites
echo -e "🔎 Checking prerequisites..."
if ! command -v node >/dev/null 2>&1; then
    echo -e "❌ ${RED}Error: Node.js is not installed.${NC} Please download Node.js v18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "⚠️  ${YELLOW}Warning: Node.js version is older than recommended. Found: $(node -v). Minimum requested: v18+${NC}"
else
    echo -e "✅ Found Node.js version $(node -v)"
fi

# 2. Bootstrap Local Environment Configuration File (.env)
if [ ! -f .env ]; then
    echo -e "📋 Creating environment config file '.env' from templates..."
    cp .env.example .env
    echo -e "✅ Successfully copied '.env.example' to '.env'"
else
    echo -e "ℹ️  '.env' already exists. Skipping baseline copy."
fi

# 3. Secure Cryptographic Keys Generation
echo -e "🔑 Checking and generating mandatory security keys..."

# Use inline node executable to check/fill keys securely (guarantees cross-platform security)
node << 'EOF'
const fs = require('fs');
const crypto = require('crypto');

let envContent = '';
try {
    envContent = fs.readFileSync('.env', 'utf8');
} catch (e) {
    console.error('Failed to read .env file');
    process.exit(1);
}

let modified = false;

// Generate JWT_SECRET if missing or placeholder empty
if (!envContent.match(/^JWT_SECRET=\s*\w+/m)) {
    const randomSecret = crypto.randomBytes(48).toString('base64');
    envContent = envContent.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${randomSecret}`);
    modified = true;
    console.log('\x1b[32m✔ Automatically generated a secure high-entropy JWT_SECRET\x1b[0m');
}

// Generate ENCRYPTION_MASTER_KEY if missing or placeholder empty
if (!envContent.match(/^ENCRYPTION_MASTER_KEY=\s*\w+/m)) {
    const randomMasterKey = crypto.randomBytes(48).toString('base64');
    envContent = envContent.replace(/^ENCRYPTION_MASTER_KEY=.*/m, `ENCRYPTION_MASTER_KEY=${randomMasterKey}`);
    modified = true;
    console.log('\x1b[32m✔ Automatically generated a secure ENCRYPTION_MASTER_KEY\x1b[0m');
}

if (modified) {
    fs.writeFileSync('.env', envContent, 'utf8');
} else {
    console.log('\x1b[36mℹ Active cryptographic secrets are already present inside your .env file.\x1b[0m');
}
EOF

# 4. Dependency Installation Check
echo -e "\n📦 Resolving package dependencies..."
if [ -d node_modules ]; then
    echo -e "ℹ 'node_modules' already exists. To run fresh installation, remove 'node_modules' directory."
else
    echo -e "⚡ Installing project dependencies using npm (including development packages)..."
    npm install
    echo -e "✅ Dependency resolution complete."
fi

# 5. Database Initial Schema Setup
echo -e "\n🗄️ Bootstrapping database schema structure (SQLite Local Dev)..."
npm run db:generate || echo -e "⚠️  Failed to generate SQLite migrations automatically. Ensure drizzle is available."
npm run db:push || echo -e "⚠️  Failed to push schemas automatically. Setup will run auto-healing during server startup."
echo -e "🌱 Seeding initial database tables..."
npm run db:seed || echo -e "⚠️  Failed to seed database automatically. You can run it manually with 'npm run db:seed'"

echo -e "\n============================================================================"
echo -e "🎉 ${GREEN}Initialization complete! KostromAi44 is ready for launch.${NC}"
echo -e "============================================================================"
echo -e "\n🚀 ${BLUE}To start the local developer workspace:${NC}"
echo -e "   ${GREEN}npm run dev${NC}"
echo -e "\n🧪 ${BLUE}To execute automated verification suites:${NC}"
echo -e "   ${GREEN}npm run test${NC}"
echo -e "\n🐳 ${BLUE}To boot inside multi-container production environments:${NC}"
echo -e "   ${GREEN}docker-compose up --build${NC}"
echo -e "============================================================================"
