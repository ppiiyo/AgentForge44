const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const platform = os.platform();
const arch = os.arch();
let target = '';

if (platform === 'linux') {
  const isAlpine = fs.existsSync('/etc/alpine-release');
  target = `linux-${arch}-${isAlpine ? 'musl' : 'gnu'}`;
} else if (platform === 'darwin') {
  target = `darwin-${arch}`;
} else if (platform === 'win32') {
  target = `win32-${arch}-msvc`;
}

if (target) {
  const pkg = `@tailwindcss/oxide-${target}`;
  console.log(`[Oxide Optimizer] Checking native compiler binding: ${pkg}`);
  try {
    const pathToCheck = `node_modules/${pkg}`;
    if (!fs.existsSync(pathToCheck)) {
      console.log(`[Oxide Optimizer] Missing native binding. Installing ${pkg}...`);
      execSync(`npm install ${pkg} --no-save --legacy-peer-deps`, { stdio: 'inherit' });
    } else {
      console.log(`[Oxide Optimizer] Native binding ${pkg} is already present.`);
    }
  } catch (err) {
    console.error(`[Oxide Optimizer] Warning: Failed to pre-install native oxide binding:`, err.message);
  }
} else {
  console.log(`[Oxide Optimizer] Platform ${platform}-${arch} does not require an oxide binding override.`);
}
