#!/usr/bin/env node

/**
 * Prepare script that conditionally installs husky
 * Skips husky installation in CI environments
 */

import { execSync } from 'child_process';

// Check if we're in a CI environment
const isCI =
  process.env.CI ||
  process.env.GITHUB_ACTIONS ||
  process.env.HUSKY === '0' ||
  process.env.NODE_ENV === 'production';

if (isCI) {
  console.log('Skipping husky installation in CI environment');
  process.exit(0);
}

try {
  console.log('Installing husky...');
  execSync('husky install', { stdio: 'inherit' });
  console.log('Husky installed successfully');
} catch (error) {
  console.warn('Failed to install husky:', error.message);
  console.warn('This is not critical for CI builds');
  process.exit(0);
}
