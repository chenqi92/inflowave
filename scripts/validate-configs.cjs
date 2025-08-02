#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates all Tauri configuration files for consistency
 */

const fs = require('fs');
const path = require('path');

const configs = [
  'src-tauri/tauri.conf.json',
  'src-tauri/tauri.linux.conf.json',
  'src-tauri/tauri.macos.conf.json',
  'src-tauri/tauri.windows.conf.json',
  'src-tauri/tauri.windows-nsis.conf.json',
  'src-tauri/tauri.windows-nsis-only.conf.json',
  'src-tauri/tauri.windows-cargo-wix.conf.json',
  'src-tauri/tauri.arm64.conf.json'
];

function validateConfig(configPath) {
  console.log(`\n🔍 Validating ${configPath}...`);
  
  if (!fs.existsSync(configPath)) {
    console.log(`❌ File not found: ${configPath}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    
    // Check required fields
    const requiredFields = ['$schema'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    // Check version consistency
    if (config.version) {
      console.log(`📋 Version: ${config.version}`);
    }
    
    // Check product name
    if (config.productName) {
      console.log(`📋 Product: ${config.productName}`);
    }
    
    // Check bundle configuration
    if (config.bundle) {
      console.log(`📦 Bundle active: ${config.bundle.active}`);
      if (config.bundle.targets) {
        console.log(`📦 Targets: ${config.bundle.targets.join(', ')}`);
      }
    }
    
    // Platform-specific checks
    if (configPath.includes('macos')) {
      if (!config.bundle || !config.bundle.targets || 
          (!config.bundle.targets.includes('dmg') && !config.bundle.targets.includes('app'))) {
        console.log(`⚠️ macOS config should include DMG or APP targets`);
      }
      if (!config.bundle || !config.bundle.icon || !config.bundle.icon.includes('icon.icns')) {
        console.log(`⚠️ macOS config should include .icns icon`);
      }
    }
    
    if (configPath.includes('linux')) {
      if (!config.bundle || !config.bundle.targets || 
          (!config.bundle.targets.includes('deb') && !config.bundle.targets.includes('rpm') && !config.bundle.targets.includes('appimage'))) {
        console.log(`⚠️ Linux config should include DEB, RPM, or AppImage targets`);
      }
    }
    
    if (configPath.includes('windows')) {
      if (configPath.includes('nsis')) {
        if (!config.bundle || !config.bundle.targets || !config.bundle.targets.includes('nsis')) {
          console.log(`⚠️ Windows NSIS config should include NSIS target`);
        }
      }
      if (configPath.includes('wix')) {
        if (!config.bundle || !config.bundle.targets || !config.bundle.targets.includes('msi')) {
          console.log(`⚠️ Windows WiX config should include MSI target`);
        }
      }
    }
    
    console.log(`✅ ${configPath} is valid`);
    return true;
    
  } catch (error) {
    console.log(`❌ JSON parse error in ${configPath}: ${error.message}`);
    return false;
  }
}

function checkVersionConsistency() {
  console.log(`\n🔍 Checking version consistency...`);
  
  const versions = new Set();
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
  
  // Extract version from Cargo.toml
  const cargoVersionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
  const cargoVersion = cargoVersionMatch ? cargoVersionMatch[1] : null;
  
  console.log(`📋 package.json version: ${packageJson.version}`);
  console.log(`📋 Cargo.toml version: ${cargoVersion}`);
  
  versions.add(packageJson.version);
  if (cargoVersion) versions.add(cargoVersion);
  
  // Check config file versions
  configs.forEach(configPath => {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.version) {
          console.log(`📋 ${path.basename(configPath)} version: ${config.version}`);
          versions.add(config.version);
        }
      } catch (error) {
        console.log(`❌ Error reading ${configPath}: ${error.message}`);
      }
    }
  });
  
  if (versions.size === 1) {
    console.log(`✅ All versions are consistent: ${Array.from(versions)[0]}`);
    return true;
  } else {
    console.log(`❌ Version inconsistency found: ${Array.from(versions).join(', ')}`);
    return false;
  }
}

function main() {
  console.log('🚀 Starting configuration validation...');
  
  let allValid = true;
  
  // Validate each config file
  configs.forEach(configPath => {
    if (!validateConfig(configPath)) {
      allValid = false;
    }
  });
  
  // Check version consistency
  if (!checkVersionConsistency()) {
    allValid = false;
  }
  
  console.log('\n📊 Validation Summary:');
  if (allValid) {
    console.log('✅ All configurations are valid and consistent');
    process.exit(0);
  } else {
    console.log('❌ Some configurations have issues');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateConfig, checkVersionConsistency };
