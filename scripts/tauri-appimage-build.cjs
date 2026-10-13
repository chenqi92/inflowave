#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { validateAppImage } = require('./validate-appimage.cjs');

const args = process.argv.slice(2);
const cli = path.join(path.dirname(require.resolve('@tauri-apps/cli/package.json')), 'tauri.js');
const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
if (result.error || result.status !== 0) {
  if (result.error) console.error(result.error.message);
  process.exit(result.status || 1);
}

// tauri-action also calls --version; only validate after a successful build.
if (args[0] === 'build') {
  try {
    if (!process.env.APPIMAGE_PATH) throw new Error('APPIMAGE_PATH is required');
    validateAppImage(process.env.APPIMAGE_PATH, { startup: true });
    console.log(`AppImage metadata and startup validated: ${process.env.APPIMAGE_PATH}`);
  } catch (error) {
    console.error(`AppImage validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
