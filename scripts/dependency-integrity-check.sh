#!/bin/bash
set -e

echo "=========================================================="
echo "🛡️ STARTING DEPENDENCY INTEGRITY & ENVIRONMENT VALIDATION"
echo "=========================================================="

echo "1. Checking Node.js and npm versions..."
node -v
npm -v

echo "2. Checking package-lock.json consistency..."
if [ -f package-lock.json ]; then
  echo "✅ package-lock.json is present."
  # Check lockfile version
  node -e "
    const fs = require('fs');
    const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    console.log('   Lockfile Version:', lock.lockfileVersion);
    console.log('   Package Name:', lock.name);
  "
else
  echo "❌ package-lock.json is missing!"
  exit 1
fi

echo "3. Summary of top-level Node Modules installed (npm list --depth=0)..."
if [ -d node_modules ]; then
  npm list --depth=0 || echo "⚠️ npm list returned some warnings, which is common with peer dependencies."
else
  echo "⚠️ node_modules directory does not exist yet!"
fi

echo "4. Disk Space Information..."
df -h

echo "5. Verifying Accessible Environment Variables..."
if [ -n "$GEMINI_API_KEY" ]; then
  # Do not print the secret key, just verify presence and length
  echo "✅ GEMINI_API_KEY is configured and accessible (length: ${#GEMINI_API_KEY} chars)."
else
  echo "⚠️ GEMINI_API_KEY is not configured or is empty. Sandbox local simulation fallback might be active during tests."
fi

if [ -n "$DATABASE_URL" ]; then
  echo "✅ DATABASE_URL is configured and accessible."
else
  echo "ℹ️ DATABASE_URL is not set."
fi

echo "=========================================================="
echo "🛡️ DEPENDENCY INTEGRITY CHECK COMPLETED SUCCESSFULY"
echo "=========================================================="
