#!/usr/bin/env node

/**
 * 生成缺失的数据库图标占位符
 * 补充所有 TreeNodeType 对应的图标
 */

const fs = require('fs');
const path = require('path');

const ICON_BASE_DIR = path.join(__dirname, '../src/assets/icons/database');

const generateSVG = (content, color = '#374151') => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${content}
</svg>`;

// 补充缺失的图标模板
const additionalIconTemplates = {
  // InfluxDB 1.x 节点
  'retention-policy': (color) => `<rect x="2" y="3" width="12" height="2" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="2" y="6" width="9" height="2" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="2" y="9" width="6" height="2" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="2" y="12" width="3" height="2" fill="none" stroke="${color}" stroke-width="1"/>`,
  'series': (color) => `<path d="M2 10L4 8L6 12L8 4L10 9L12 6L14 11" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="4" cy="8" r="1" fill="${color}"/>
    <circle cx="8" cy="4" r="1" fill="${color}"/>
    <circle cx="12" cy="6" r="1" fill="${color}"/>`,
  'continuous-query': (color) => `<circle cx="8" cy="8" r="5" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 8L12 6" stroke="${color}" stroke-width="1" marker-end="url(#arrow)"/>
    <path d="M8 8L12 10" stroke="${color}" stroke-width="1" marker-end="url(#arrow)"/>
    <circle cx="8" cy="8" r="1" fill="${color}"/>
    <defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2"><path d="M0,0 L4,2 L0,4 Z" fill="${color}"/></marker></defs>`,
  'shard': (color) => `<polygon points="8,2 12,6 8,10 4,6" fill="none" stroke="${color}" stroke-width="1"/>
    <polygon points="8,5 10,7 8,9 6,7" fill="${color}"/>`,
  'shard-group': (color) => `<polygon points="6,2 10,6 6,10 2,6" fill="none" stroke="${color}" stroke-width="1"/>
    <polygon points="10,4 14,8 10,12 6,8" fill="none" stroke="${color}" stroke-width="1"/>
    <polygon points="8,6 10,8 8,10 6,8" fill="${color}"/>`,

  // InfluxDB 2.x 节点
  'cell': (color) => `<rect x="3" y="4" width="10" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M4 10L6 8L8 11L10 7L12 9" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="6" cy="8" r="0.5" fill="${color}"/>
    <circle cx="10" cy="7" r="0.5" fill="${color}"/>`,
  'variable': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="7" fill="${color}">X</text>`,
  'notification-rule': (color) => `<path d="M8 2L6 6H10L8 2Z" fill="${color}"/>
    <rect x="6" y="6" width="4" height="6" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="14" r="1" fill="${color}"/>`,
  'notification-endpoint': (color) => `<circle cx="8" cy="7" r="4" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 7L12 11" stroke="${color}" stroke-width="1" marker-end="url(#arrow)"/>
    <rect x="11" y="10" width="3" height="2" fill="${color}"/>
    <defs><marker id="arrow" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5"><path d="M0,0 L3,1.5 L0,3 Z" fill="${color}"/></marker></defs>`,
  'scraper': (color) => `<circle cx="8" cy="8" r="2" fill="${color}"/>
    <path d="M8 6L6 2M8 6L10 2M8 10L6 14M8 10L10 14M6 8L2 6M6 8L2 10M10 8L14 6M10 8L14 10" stroke="${color}" stroke-width="1"/>`,
  'telegraf': (color) => `<rect x="6" y="2" width="4" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="5" r="1" fill="${color}"/>
    <path d="M5 8L11 8M5 10L11 10M5 12L11 12" stroke="${color}" stroke-width="1"/>`,
  'authorization': (color) => `<rect x="4" y="8" width="8" height="6" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 8V6C8 4.3 6.7 3 5 3S2 4.3 2 6V8" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="12" text-anchor="middle" font-family="Arial" font-size="5" fill="${color}">API</text>`,
  'label': (color) => `<path d="M2 8L8 2H14V8L8 14L2 8Z" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="11" cy="5" r="1" fill="${color}"/>
    <text x="8" y="10" text-anchor="middle" font-family="Arial" font-size="4" fill="${color}">TAG</text>`,

  // InfluxDB 3.x 节点
  'index': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M4 6H12M4 8H10M4 10H8" stroke="${color}" stroke-width="1"/>
    <circle cx="13" cy="3" r="2" fill="${color}"/>
    <text x="13" y="5" text-anchor="middle" font-family="Arial" font-size="3" fill="white">i</text>`,
  'partition': (color) => `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 6H14M2 10H14M7 2V14" stroke="${color}" stroke-width="1"/>
    <rect x="3" y="3" width="3" height="2" fill="${color}" opacity="0.3"/>
    <rect x="8" y="7" width="5" height="2" fill="${color}" opacity="0.3"/>`,
  'materialized-view': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="3" fill="none" stroke="${color}" stroke-width="1"/>
    <polygon points="8,6 10,8 8,10 6,8" fill="${color}"/>`,
  'function3x': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="10" text-anchor="middle" font-family="Arial" font-size="6" fill="${color}">fx</text>`,
  'procedure': (color) => `<rect x="2" y="3" width="12" height="10" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="6" cy="7" r="1" fill="${color}"/>
    <circle cx="10" cy="7" r="1" fill="${color}"/>
    <path d="M6 8L10 8M8 6V10" stroke="${color}" stroke-width="1"/>`,
  'trigger3x': (color) => `<path d="M8 2L6 6H10L8 2Z" fill="${color}"/>
    <rect x="6" y="6" width="4" height="6" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M4 10L12 10" stroke="${color}" stroke-width="2"/>`,

  // IoTDB 详细节点
  'aligned-timeseries': (color) => `<path d="M2 8L4 6L6 10L8 4L10 8L12 6L14 9" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 10L4 8L6 12L8 6L10 10L12 8L14 11" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="1" y="3" width="14" height="1" fill="${color}" opacity="0.3"/>`,
  'template': (color) => `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,1"/>
    <rect x="4" y="4" width="8" height="2" fill="${color}" opacity="0.3"/>
    <rect x="4" y="7" width="6" height="2" fill="${color}" opacity="0.3"/>
    <rect x="4" y="10" width="4" height="2" fill="${color}" opacity="0.3"/>`,
  'system-info': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="5" r="1" fill="${color}"/>
    <rect x="7" y="7" width="2" height="5" fill="${color}"/>`,
  'version-info': (color) => `<rect x="2" y="3" width="12" height="10" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="9" text-anchor="middle" font-family="Arial" font-size="4" fill="${color}">v2.0</text>`,
  'storage-engine-info': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="6" cy="8" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="10" cy="8" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 8H8" stroke="${color}" stroke-width="2"/>`,
  'cluster-info': (color) => `<circle cx="4" cy="4" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="12" cy="4" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="12" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M6 4L10 4M6 6L8 10M10 6L8 10" stroke="${color}" stroke-width="1"/>`,
  'schema-template': (color) => `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 5H14M5 2V14" stroke="${color}" stroke-width="1"/>
    <rect x="6" y="6" width="7" height="7" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="1,1"/>`,
  'data-type': (color) => `<rect x="3" y="5" width="10" height="6" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="9" text-anchor="middle" font-family="Arial" font-size="4" fill="${color}">INT</text>`,
  'encoding': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M4 6L6 8L4 10M12 6L10 8L12 10" stroke="${color}" stroke-width="1"/>
    <text x="8" y="9" text-anchor="middle" font-family="Arial" font-size="3" fill="${color}">ENC</text>`,
  'compression': (color) => `<rect x="2" y="6" width="12" height="4" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="4" y="4" width="8" height="2" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="6" y="2" width="4" height="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 12L8 14" stroke="${color}" stroke-width="1" marker-end="url(#arrow)"/>`,
  'attribute-group': (color) => `<rect x="2" y="3" width="12" height="10" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,1"/>
    <circle cx="5" cy="6" r="1" fill="${color}"/>
    <circle cx="8" cy="6" r="1" fill="${color}"/>
    <circle cx="11" cy="6" r="1" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="3" fill="${color}">ATTR</text>`,
};

// 生成缺失的图标
const generateMissingIcons = () => {
  console.log('🔧 生成缺失的图标...');
  
  let generated = 0;
  const colors = { light: '#374151', dark: '#D1D5DB' };
  
  Object.keys(additionalIconTemplates).forEach(iconName => {
    const template = additionalIconTemplates[iconName];
    
    ['light', 'dark'].forEach(theme => {
      const svg = generateSVG(template(colors[theme]), colors[theme]);
      const filePath = path.join(ICON_BASE_DIR, theme, `${iconName}.svg`);
      
      fs.writeFileSync(filePath, svg);
      generated++;
      console.log(`✅ ${iconName}.svg (${theme})`);
    });
  });
  
  console.log(`🎉 生成了 ${generated} 个额外的图标文件`);
};

if (require.main === module) {
  generateMissingIcons();
}

module.exports = { generateMissingIcons };