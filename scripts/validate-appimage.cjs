#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function appDirFile(appDir, name) {
  const file = path.join(appDir, name);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() && path.isAbsolute(fs.readlinkSync(file))) {
    throw new Error(`${name} uses an absolute symlink and will break outside the build machine`);
  }
  const resolved = fs.realpathSync(file);
  if (!resolved.startsWith(`${appDir}${path.sep}`) || !fs.statSync(resolved).isFile()) {
    throw new Error(`${name} must resolve to a file inside the AppDir`);
  }
  return resolved;
}

function validateAppDir(directory) {
  const appDir = fs.realpathSync(directory);
  const appRun = appDirFile(appDir, 'AppRun');
  fs.accessSync(appRun, fs.constants.X_OK);

  const dirIcon = appDirFile(appDir, '.DirIcon');
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!fs.readFileSync(dirIcon).subarray(0, 8).equals(pngSignature)) {
    throw new Error('.DirIcon must contain a PNG icon');
  }

  const desktops = fs.readdirSync(appDir).filter(name => name.endsWith('.desktop'));
  if (desktops.length !== 1) {
    throw new Error('AppDir must contain exactly one root .desktop file');
  }
  const desktop = fs.readFileSync(appDirFile(appDir, desktops[0]), 'utf8');
  const entry = desktop.split(/^\[Desktop Entry\]\r?$/m)[1]?.split(/^\[/m)[0];
  const icon = entry?.match(/^Icon=(.+)$/m)?.[1].trim();
  if (!icon || /[/\\]/.test(icon) || icon === '.' || icon === '..') {
    throw new Error('Desktop Entry must have an Icon name without a path');
  }
  const iconFile = ['png', 'svg'].map(ext => `${icon}.${ext}`)
    .find(name => fs.existsSync(path.join(appDir, name)));
  if (!iconFile) {
    throw new Error(`Desktop icon ${icon} is missing from the AppDir root`);
  }
  appDirFile(appDir, iconFile);
}

function validateAppImage(filename, { startup = false } = {}) {
  if (process.platform !== 'linux') {
    throw new Error('AppImage extraction requires Linux; validate an extracted AppDir on this platform');
  }
  const image = path.resolve(filename);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'inflowave-appimage-'));
  try {
    // Extract the finished package away from the build tree so build-local links cannot pass.
    execFileSync(image, ['--appimage-extract'], {
      cwd: temp,
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 120000,
    });
    const appDir = path.join(temp, 'squashfs-root');
    validateAppDir(appDir);
    if (startup) {
      execFileSync('xvfb-run', ['-a', 'dbus-run-session', '--', 'bash',
        path.join(__dirname, 'test-appimage-startup.sh'), appDir], {
        stdio: 'inherit',
        timeout: 90000,
      });
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const startup = args.includes('--startup');
    const files = args.filter(arg => arg !== '--startup');
    if (files.length === 0) throw new Error('Usage: node scripts/validate-appimage.cjs [--startup] <AppImage|AppDir> [...]');
    for (const file of files) {
      if (fs.statSync(file).isDirectory()) {
        if (startup) throw new Error('--startup requires a finished AppImage');
        validateAppDir(file);
      } else validateAppImage(file, { startup });
      console.log(`AppImage metadata validated: ${file}`);
    }
  } catch (error) {
    console.error(`AppImage validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validateAppDir, validateAppImage };
