#!/usr/bin/env node

/**
 * 生成数据库图标占位符脚本
 * 为所有节点类型创建简单的 SVG 占位符图标
 */

const fs = require('fs');
const path = require('path');

// 图标基础目录
const ICON_BASE_DIR = path.join(__dirname, '../src/assets/icons/database');

// 确保目录存在
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 生成基础 SVG 模板
const generateSVG = (content, color = '#374151', bgColor = 'transparent') => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" rx="2" fill="${bgColor}"/>
  ${content}
</svg>`;

// 图标内容模板
const iconTemplates = {
  // 连接状态图标
  'connection-active': (color) => `<circle cx="8" cy="8" r="6" fill="${color}" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="3" fill="white"/>`,
  'connection-inactive': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,2"/>`,
  'connection-error': (color) => `<circle cx="8" cy="8" r="6" fill="${color}"/>
    <path d="M5 8h6M8 5v6" stroke="white" stroke-width="1"/>`,
  'connection-loading': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="8,4">
    <animateTransform attributeName="transform" type="rotate" values="0 8 8;360 8 8" dur="1s" repeatCount="indefinite"/>
    </circle>`,

  // 数据库图标
  'database': (color) => `<ellipse cx="8" cy="4" rx="6" ry="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 4v8c0 1.1 2.7 2 6 2s6-.9 6-2V4" fill="none" stroke="${color}" stroke-width="1"/>
    <ellipse cx="8" cy="8" rx="6" ry="2" fill="none" stroke="${color}" stroke-width="1"/>`,
  'database-system': (color) => `<ellipse cx="8" cy="4" rx="5" ry="1.5" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M3 4v6c0 .8 2.2 1.5 5 1.5s5-.7 5-1.5V4" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="12" cy="12" r="2" fill="${color}"/>
    <path d="M11 12h2M12 11v2" stroke="white" stroke-width="0.5"/>`,
  'database3x': (color) => `<rect x="2" y="3" width="12" height="10" rx="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M5 6h6M5 8h4M5 10h7" stroke="${color}" stroke-width="1"/>`,

  // 存储相关
  'bucket': (color) => `<path d="M3 6l1-3h8l1 3-1 7H4l-1-7z" fill="none" stroke="${color}" stroke-width="1"/>
    <ellipse cx="8" cy="6" rx="5" ry="1" fill="none" stroke="${color}" stroke-width="1"/>`,
  'system-bucket': (color) => `<path d="M3 6l1-3h8l1 3-1 7H4l-1-7z" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="12" cy="4" r="2" fill="${color}"/>
    <path d="M11 4h2M12 3v2" stroke="white" stroke-width="0.5"/>`,
  'storage-group': (color) => `<path d="M2 3h10l2 2v8H2V3z" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 5h12" stroke="${color}" stroke-width="1"/>
    <circle cx="5" cy="8" r="1" fill="${color}"/>
    <circle cx="8" cy="8" r="1" fill="${color}"/>
    <circle cx="11" cy="8" r="1" fill="${color}"/>`,

  // 组织结构
  'organization': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="4" y="6" width="2" height="2" fill="${color}"/>
    <rect x="7" y="6" width="2" height="2" fill="${color}"/>
    <rect x="10" y="6" width="2" height="2" fill="${color}"/>
    <path d="M2 4l6-2 6 2" stroke="${color}" stroke-width="1"/>`,
  'namespace': (color) => `<path d="M2 2v12l3-2h7c1 0 2-1 2-2V4c0-1-1-2-2-2H2z" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M5 6h6M5 8h4" stroke="${color}" stroke-width="1"/>`,

  // 数据结构
  'table': (color) => `<rect x="2" y="3" width="12" height="10" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 6h12M2 9h12M6 3v10M10 3v10" stroke="${color}" stroke-width="1"/>`,
  'schema': (color) => `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 5h12M5 2v12" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="2" fill="none" stroke="${color}" stroke-width="1"/>`,
  'column': (color) => `<rect x="6" y="2" width="4" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M6 5h4M6 8h4M6 11h4" stroke="${color}" stroke-width="1"/>`,
  'view': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="3" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="1" fill="${color}"/>`,

  // 测量和字段
  'measurement': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 7h12M2 10h12M6 4v8" stroke="${color}" stroke-width="1"/>
    <circle cx="4" cy="5.5" r="0.5" fill="${color}"/>
    <circle cx="8" cy="5.5" r="0.5" fill="${color}"/>`,
  'field': (color) => `<rect x="3" y="6" width="10" height="4" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M5 6v4M8 6v4M11 6v4" stroke="${color}" stroke-width="1"/>`,
  'field-group': (color) => `<rect x="2" y="4" width="12" height="8" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,1"/>
    <rect x="4" y="6" width="2" height="4" fill="${color}"/>
    <rect x="7" y="6" width="2" height="4" fill="${color}"/>
    <rect x="10" y="6" width="2" height="4" fill="${color}"/>`,
  'tag': (color) => `<path d="M2 8l6-6h6v6l-6 6-6-6z" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="11" cy="5" r="1" fill="${color}"/>`,
  'tag-group': (color) => `<path d="M2 8l4-4h4v4l-4 4-4-4z" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M6 12l4-4h4v4l-4 4-4-4z" fill="none" stroke="${color}" stroke-width="1"/>`,

  // IoT 设备
  'device': (color) => `<rect x="3" y="4" width="10" height="8" rx="2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="8" r="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M6 8h4M8 6v4" stroke="${color}" stroke-width="1"/>`,
  'timeseries': (color) => `<path d="M2 12L4 8L6 10L8 6L10 9L12 4L14 7" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="4" cy="8" r="1" fill="${color}"/>
    <circle cx="8" cy="6" r="1" fill="${color}"/>
    <circle cx="12" cy="4" r="1" fill="${color}"/>`,

  // 功能和任务
  'task': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M6 8l2 2 4-4" fill="none" stroke="${color}" stroke-width="1.5"/>`,
  'function': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="8" fill="${color}">f</text>`,
  'trigger': (color) => `<path d="M8 2l3 5H5l3-5z" fill="${color}"/>
    <rect x="7" y="7" width="2" height="7" fill="${color}"/>`,

  // 用户和权限
  'user1x': (color) => `<circle cx="8" cy="6" r="3" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="${color}" stroke-width="1"/>`,
  'user2x': (color) => `<circle cx="8" cy="5" r="3" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="12" y="2" width="2" height="2" fill="${color}"/>`,
  'privilege': (color) => `<rect x="5" y="7" width="6" height="6" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M8 7V5c0-1.7-1.3-3-3-3S2 3.3 2 5v2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="8" cy="10" r="1" fill="${color}"/>`,

  // 监控和通知  
  'dashboard': (color) => `<rect x="2" y="2" width="12" height="12" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="4" y="4" width="3" height="3" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="9" y="4" width="3" height="3" fill="none" stroke="${color}" stroke-width="1"/>
    <rect x="4" y="9" width="8" height="3" fill="none" stroke="${color}" stroke-width="1"/>`,
  'check': (color) => `<circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M5 8l2 2 4-4" fill="none" stroke="${color}" stroke-width="1.5"/>`,

  // 默认图标
  'default': (color) => `<rect x="4" y="3" width="8" height="10" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M4 6h8M4 9h6" stroke="${color}" stroke-width="1"/>`,
};

// 品牌图标内容
const brandIconTemplates = {
  'influxdb-1x': (color) => `<circle cx="8" cy="8" r="6" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="6" fill="white">1x</text>`,
  'influxdb-2x': (color) => `<circle cx="8" cy="8" r="6" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="6" fill="white">2x</text>`,
  'influxdb-3x': (color) => `<circle cx="8" cy="8" r="6" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="6" fill="white">3x</text>`,
  'iotdb': (color) => `<rect x="2" y="2" width="12" height="12" rx="2" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="5" fill="white">IoT</text>`,
  'database-generic': (color) => `<ellipse cx="8" cy="5" rx="5" ry="2" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M3 5v6c0 1.1 2.2 2 5 2s5-.9 5-2V5" fill="none" stroke="${color}" stroke-width="1"/>
    <ellipse cx="8" cy="8" rx="5" ry="2" fill="none" stroke="${color}" stroke-width="1"/>`,
};

// 创建单个图标文件
const createIcon = (name, template, theme = 'light') => {
  const colors = {
    light: '#374151',
    dark: '#D1D5DB'
  };
  
  const color = colors[theme];
  const content = typeof template === 'function' ? template(color) : template;
  const svg = generateSVG(content, color);
  
  return svg;
};

// 主要的图标列表 (基于 TreeNodeType)
const mainIcons = [
  'connection-active', 'connection-inactive', 'connection-error', 'connection-loading',
  'database', 'database-system', 'database3x', 'storage-group',
  'bucket', 'system-bucket', 'organization', 'namespace',
  'table', 'schema', 'column', 'view', 'measurement',
  'field', 'field-group', 'tag', 'tag-group',
  'device', 'timeseries', 'task', 'function', 'trigger',
  'user1x', 'user2x', 'privilege', 'dashboard', 'check',
  'default'
];

// 生成所有图标
const generateAllIcons = () => {
  console.log('🎨 开始生成占位符图标...');
  
  // 确保目录存在
  ensureDir(path.join(ICON_BASE_DIR, 'light'));
  ensureDir(path.join(ICON_BASE_DIR, 'dark'));
  ensureDir(path.join(ICON_BASE_DIR, 'brands'));
  
  let generated = 0;
  
  // 生成主要图标 (light & dark)
  mainIcons.forEach(iconName => {
    const template = iconTemplates[iconName] || iconTemplates['default'];
    
    ['light', 'dark'].forEach(theme => {
      const svg = createIcon(iconName, template, theme);
      const filePath = path.join(ICON_BASE_DIR, theme, `${iconName}.svg`);
      
      fs.writeFileSync(filePath, svg);
      generated++;
    });
  });
  
  // 生成品牌图标
  Object.keys(brandIconTemplates).forEach(brandName => {
    const template = brandIconTemplates[brandName];
    const svg = createIcon(brandName, template, 'light');
    const filePath = path.join(ICON_BASE_DIR, 'brands', `${brandName}.svg`);
    
    fs.writeFileSync(filePath, svg);
    generated++;
  });
  
  console.log(`✅ 成功生成 ${generated} 个占位符图标文件`);
  console.log(`📁 图标位置: ${ICON_BASE_DIR}`);
  
  // 显示目录结构
  console.log('\n📋 图标目录结构:');
  const showDir = (dir, prefix = '') => {
    const items = fs.readdirSync(dir).sort();
    items.forEach((item, index) => {
      const itemPath = path.join(dir, item);
      const isLast = index === items.length - 1;
      const symbol = isLast ? '└── ' : '├── ';
      
      if (fs.statSync(itemPath).isDirectory()) {
        console.log(`${prefix}${symbol}${item}/`);
        showDir(itemPath, prefix + (isLast ? '    ' : '│   '));
      } else {
        console.log(`${prefix}${symbol}${item}`);
      }
    });
  };
  
  showDir(ICON_BASE_DIR);
};

// 运行生成器
if (require.main === module) {
  generateAllIcons();
}

module.exports = { generateAllIcons };