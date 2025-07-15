#!/usr/bin/env node

/**
 * Icon conversion script for Tauri application
 * Converts the root icon.png to all required formats for different platforms
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const ICON_SOURCE = path.join(ROOT_DIR, 'icon.png');
const ICONS_DIR = path.join(ROOT_DIR, 'src-tauri', 'icons');

// Required icon sizes and formats for different platforms
const ICON_CONFIGS = {
  // Basic PNG icons for Tauri
  'icon.png': { size: 512, format: 'png' },
  '32x32.png': { size: 32, format: 'png' },
  '64x64.png': { size: 64, format: 'png' },
  '128x128.png': { size: 128, format: 'png' },
  '128x128@2x.png': { size: 256, format: 'png' },
  
  // Windows ICO format
  'icon.ico': { sizes: [16, 32, 48, 64, 128, 256], format: 'ico' },
  
  // macOS ICNS format  
  'icon.icns': { sizes: [16, 32, 64, 128, 256, 512, 1024], format: 'icns' },
  
  // Windows Store logos
  'Square30x30Logo.png': { size: 30, format: 'png' },
  'Square44x44Logo.png': { size: 44, format: 'png' },
  'Square71x71Logo.png': { size: 71, format: 'png' },
  'Square89x89Logo.png': { size: 89, format: 'png' },
  'Square107x107Logo.png': { size: 107, format: 'png' },
  'Square142x142Logo.png': { size: 142, format: 'png' },
  'Square150x150Logo.png': { size: 150, format: 'png' },
  'Square284x284Logo.png': { size: 284, format: 'png' },
  'Square310x310Logo.png': { size: 310, format: 'png' },
  'StoreLogo.png': { size: 50, format: 'png' },
};

// Android icon sizes
const ANDROID_CONFIGS = {
  'mipmap-mdpi': { size: 48 },
  'mipmap-hdpi': { size: 72 },
  'mipmap-xhdpi': { size: 96 },
  'mipmap-xxhdpi': { size: 144 },
  'mipmap-xxxhdpi': { size: 192 },
};

// iOS icon sizes
const IOS_CONFIGS = {
  'AppIcon-20x20@1x.png': { size: 20 },
  'AppIcon-20x20@2x.png': { size: 40 },
  'AppIcon-20x20@2x-1.png': { size: 40 },
  'AppIcon-20x20@3x.png': { size: 60 },
  'AppIcon-29x29@1x.png': { size: 29 },
  'AppIcon-29x29@2x.png': { size: 58 },
  'AppIcon-29x29@2x-1.png': { size: 58 },
  'AppIcon-29x29@3x.png': { size: 87 },
  'AppIcon-40x40@1x.png': { size: 40 },
  'AppIcon-40x40@2x.png': { size: 80 },
  'AppIcon-40x40@2x-1.png': { size: 80 },
  'AppIcon-40x40@3x.png': { size: 120 },
  'AppIcon-60x60@2x.png': { size: 120 },
  'AppIcon-60x60@3x.png': { size: 180 },
  'AppIcon-76x76@1x.png': { size: 76 },
  'AppIcon-76x76@2x.png': { size: 152 },
  'AppIcon-83.5x83.5@2x.png': { size: 167 },
  'AppIcon-512@2x.png': { size: 1024 },
};

function checkSourceIcon() {
  if (!fs.existsSync(ICON_SOURCE)) {
    console.error('❌ Source icon not found at:', ICON_SOURCE);
    console.log('Please place your icon.png file in the root directory');
    process.exit(1);
  }
  
  const stats = fs.statSync(ICON_SOURCE);
  console.log(`✅ Found source icon: ${ICON_SOURCE} (${Math.round(stats.size / 1024)}KB)`);
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function copySourceIcon() {
  const destPath = path.join(ICONS_DIR, 'icon.png');
  fs.copyFileSync(ICON_SOURCE, destPath);
  console.log(`📋 Copied source icon to: ${destPath}`);
}

function convertIcons() {
  console.log('🔄 Converting PNG icons...');

  // Convert PNG files
  Object.entries(ICON_CONFIGS).forEach(([filename, config]) => {
    if (config.format === 'png' && config.size) {
      const outputPath = path.join(ICONS_DIR, filename);
      try {
        execSync(`magick "${ICON_SOURCE}" -resize ${config.size}x${config.size} "${outputPath}"`, { stdio: 'inherit' });
        console.log(`✅ Created: ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to create ${filename}:`, error.message);
      }
    }
  });

  // Convert ICO file
  console.log('🔄 Converting ICO file...');
  const icoPath = path.join(ICONS_DIR, 'icon.ico');
  try {
    execSync(`magick "${ICON_SOURCE}" -resize 256x256 -define icon:auto-resize=16,32,48,64,128,256 "${icoPath}"`, { stdio: 'inherit' });
    console.log('✅ Created: icon.ico');
  } catch (error) {
    console.error('❌ Failed to create icon.ico:', error.message);
  }

  // Convert ICNS file
  console.log('🔄 Converting ICNS file...');
  const icnsPath = path.join(ICONS_DIR, 'icon.icns');
  try {
    execSync(`magick "${ICON_SOURCE}" -resize 1024x1024 "${icnsPath}"`, { stdio: 'inherit' });
    console.log('✅ Created: icon.icns');
  } catch (error) {
    console.error('❌ Failed to create icon.icns:', error.message);
  }

  // Convert Windows Store logos
  console.log('🔄 Converting Windows Store logos...');
  const windowsDir = path.join(ICONS_DIR, 'windows');
  ensureDirectoryExists(windowsDir);

  const windowsIcoPath = path.join(windowsDir, '64x64.ico');
  try {
    execSync(`magick "${ICON_SOURCE}" -resize 64x64 "${windowsIcoPath}"`, { stdio: 'inherit' });
    console.log('✅ Created: windows/64x64.ico');
  } catch (error) {
    console.error('❌ Failed to create windows/64x64.ico:', error.message);
  }

  // Convert Android icons
  console.log('🔄 Converting Android icons...');
  Object.entries(ANDROID_CONFIGS).forEach(([folder, config]) => {
    const androidDir = path.join(ICONS_DIR, 'android', folder);
    ensureDirectoryExists(androidDir);
    const outputPath = path.join(androidDir, 'ic_launcher.png');
    try {
      execSync(`magick "${ICON_SOURCE}" -resize ${config.size}x${config.size} "${outputPath}"`, { stdio: 'inherit' });
      console.log(`✅ Created: android/${folder}/ic_launcher.png`);
    } catch (error) {
      console.error(`❌ Failed to create android/${folder}/ic_launcher.png:`, error.message);
    }
  });

  // Convert iOS icons
  console.log('🔄 Converting iOS icons...');
  const iosDir = path.join(ICONS_DIR, 'ios');
  ensureDirectoryExists(iosDir);
  Object.entries(IOS_CONFIGS).forEach(([filename, config]) => {
    const outputPath = path.join(iosDir, filename);
    try {
      execSync(`magick "${ICON_SOURCE}" -resize ${config.size}x${config.size} "${outputPath}"`, { stdio: 'inherit' });
      console.log(`✅ Created: ios/${filename}`);
    } catch (error) {
      console.error(`❌ Failed to create ios/${filename}:`, error.message);
    }
  });
}

function convertIconsLegacy() {
  console.log('🔄 Converting PNG icons (legacy)...');

  // Convert PNG files using legacy convert command
  Object.entries(ICON_CONFIGS).forEach(([filename, config]) => {
    if (config.format === 'png' && config.size) {
      const outputPath = path.join(ICONS_DIR, filename);
      try {
        execSync(`convert "${ICON_SOURCE}" -resize ${config.size}x${config.size} "${outputPath}"`, { stdio: 'inherit' });
        console.log(`✅ Created: ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to create ${filename}:`, error.message);
      }
    }
  });

  // Similar logic for ICO, ICNS, etc. using convert instead of magick
  console.log('🔄 Converting ICO file (legacy)...');
  const icoPath = path.join(ICONS_DIR, 'icon.ico');
  try {
    execSync(`convert "${ICON_SOURCE}" -resize 256x256 -define icon:auto-resize=16,32,48,64,128,256 "${icoPath}"`, { stdio: 'inherit' });
    console.log('✅ Created: icon.ico');
  } catch (error) {
    console.error('❌ Failed to create icon.ico:', error.message);
  }
}

function showInstructions() {
  console.log('\n🔧 MANUAL CONVERSION REQUIRED');
  console.log('=====================================');
  console.log('Since no image processing library is available, please manually convert the icons:');
  console.log('');
  console.log('1. Online Tools (Recommended):');
  console.log('   - https://www.icoconverter.com/ (for ICO files)');
  console.log('   - https://iconverticons.com/online/ (for ICNS files)');
  console.log('   - https://www.iloveimg.com/resize-image (for PNG resizing)');
  console.log('');
  console.log('2. Required conversions:');
  console.log('');
  
  // Show required PNG sizes
  console.log('   PNG Files (resize icon.png to these sizes):');
  Object.entries(ICON_CONFIGS).forEach(([filename, config]) => {
    if (config.format === 'png' && config.size) {
      console.log(`   - ${filename}: ${config.size}x${config.size}px`);
    }
  });
  
  console.log('');
  console.log('   ICO File (Windows):');
  console.log('   - icon.ico: Multi-size ICO containing 16, 32, 48, 64, 128, 256px');
  console.log('');
  console.log('   ICNS File (macOS):');
  console.log('   - icon.icns: Multi-size ICNS containing 16, 32, 64, 128, 256, 512, 1024px');
  console.log('');
  console.log('3. Place all converted files in: src-tauri/icons/');
  console.log('');
  console.log('4. Alternative: Install ImageMagick and run this script again');
  console.log('   - Windows: scoop install imagemagick');
  console.log('   - macOS: brew install imagemagick');
  console.log('   - Linux: sudo apt install imagemagick');
}

function main() {
  console.log('🎨 Tauri Icon Conversion Tool');
  console.log('==============================');
  
  checkSourceIcon();
  ensureDirectoryExists(ICONS_DIR);
  copySourceIcon();
  
  // Check if ImageMagick is available
  try {
    execSync('magick -version', { stdio: 'ignore' });
    console.log('✅ ImageMagick found - starting automatic conversion...');
    convertIcons();
  } catch (error) {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      console.log('✅ ImageMagick (legacy) found - starting automatic conversion...');
      convertIconsLegacy();
    } catch (error2) {
      showInstructions();
      return;
    }
  }
  
  console.log('\n✅ Icon conversion setup complete!');
  console.log('📍 All icons should be placed in: src-tauri/icons/');
}

// Run the main function
main();

export { ICON_CONFIGS, ANDROID_CONFIGS, IOS_CONFIGS };
