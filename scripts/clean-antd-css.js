#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// CSS 类名映射
const cssClassMappings = {
  // Modal/Dialog
  '.ant-modal': '[data-dialog]',
  '.ant-modal-content': '[data-dialog-content]',
  '.ant-modal-header': '[data-dialog-header]',
  '.ant-modal-title': '[data-dialog-title]',
  '.ant-modal-body': '[data-dialog-body]',
  '.ant-modal-close': '[data-dialog-close]',
  '.ant-modal-mask': '[data-dialog-overlay]',
  '.ant-modal-wrap': '[data-dialog-wrapper]',
  
  // Tabs
  '.ant-tabs': '[data-tabs]',
  '.ant-tabs-nav': '[data-tabs-nav]',
  '.ant-tabs-tab': '[data-tabs-tab]',
  '.ant-tabs-tab-active': '[data-tabs-tab][data-state="active"]',
  '.ant-tabs-content': '[data-tabs-content]',
  '.ant-tabs-content-holder': '[data-tabs-content-holder]',
  '.ant-tabs-tabpane': '[data-tabs-tabpane]',
  
  // Form
  '.ant-form-item': '.form-item',
  '.ant-form-item-label': '.form-label',
  
  // Input
  '.ant-input': 'input',
  '.ant-input:focus': 'input:focus',
  '.ant-input-number': 'input[type="number"]',
  '.ant-input-number:focus': 'input[type="number"]:focus',
  
  // Select
  '.ant-select-selector': '[data-select-trigger]',
  '.ant-select-focused .ant-select-selector': '[data-select-trigger]:focus',
  '.ant-select-dropdown': '[data-select-content]',
  
  // Button
  '.ant-btn': 'button',
  '.ant-btn:hover': 'button:hover',
  '.ant-btn:focus': 'button:focus',
  '.ant-btn:active': 'button:active',
  '.ant-btn:disabled': 'button:disabled',
  '.ant-btn-primary': '.btn-primary',
  '.ant-btn-danger': '.btn-danger',
  '.ant-btn-dashed': '.btn-dashed',
  '.ant-btn-loading': '.btn-loading',
  '.ant-btn-sm': '.btn-sm',
  
  // Table
  '.ant-table': 'table',
  '.ant-table-thead': 'thead',
  '.ant-table-tbody': 'tbody',
  '.ant-table-thead > tr > th': 'thead tr th',
  '.ant-table-tbody > tr > td': 'tbody tr td',
  '.ant-table-tbody > tr:hover > td': 'tbody tr:hover td',
  
  // Alert
  '.ant-alert': '.alert',
  '.ant-alert-warning': '.alert-warning',
  '.ant-alert-info': '.alert-info',
  '.ant-alert-success': '.alert-success',
  '.ant-alert-message': '.alert-title',
  '.ant-alert-description': '.alert-description',
  
  // Typography
  '.ant-typography': '.typography',
  '.ant-typography h4': '.typography h4',
  '.ant-typography h5': '.typography h5',
  '.ant-typography-paragraph': '.typography p',
  
  // Switch
  '.ant-switch': '[data-switch]',
  '.ant-switch-checked': '[data-switch][data-state="checked"]',
  
  // Space
  '.ant-space': '.space',
  '.ant-space-item': '.space > *',
  '.ant-space-compact': '.space-compact',
  
  // Steps
  '.ant-steps': '.steps',
  '.ant-steps-item': '.step',
  '.ant-steps-item-title': '.step-title',
  '.ant-steps-item-description': '.step-description',
  
  // Tag
  '.ant-tag': '.tag',
  
  // Badge
  '.ant-badge': '.badge',
  '.ant-badge-dot': '.badge-dot',
  
  // Divider
  '.ant-divider': '.divider',
  
  // Spin
  '.ant-spin': '.spinner',
  
  // List
  '.ant-list-item': '.list-item',
  '.ant-list-item-meta-avatar': '.list-item-avatar',
  '.ant-list-item-action': '.list-item-action',
  
  // Card
  '.ant-card': '.card',
  '.ant-card-head': '.card-header',
  '.ant-card-body': '.card-body',
  
  // Tooltip
  '.ant-tooltip': '.tooltip',
  '.ant-tooltip-inner': '.tooltip-content',
  
  // Icon
  '.anticon': '.icon'
};

function cleanCssFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 替换 CSS 类名
    for (const [oldClass, newClass] of Object.entries(cssClassMappings)) {
      const regex = new RegExp(oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldClass)) {
        content = content.replace(regex, newClass);
        modified = true;
      }
    }
    
    // 移除包含 :contains() 的复杂选择器（这些在现代 CSS 中不常用）
    const containsRegex = /:has\([^)]*:contains\([^)]*\)[^)]*\)/g;
    if (containsRegex.test(content)) {
      content = content.replace(containsRegex, '');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已清理: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 清理失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始清理 CSS 文件中的 Ant Design 类名...\n');
  
  // 查找所有 CSS 文件
  const patterns = [
    'src/**/*.css',
    '!node_modules/**'
  ];
  
  let totalFiles = 0;
  let cleanedFiles = 0;
  
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) return;
    
    const files = glob.sync(pattern);
    files.forEach(file => {
      // 检查是否被排除
      const isExcluded = patterns.some(p =>
        p.startsWith('!') && file.match(p.substring(1).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      );
      
      if (!isExcluded) {
        totalFiles++;
        if (cleanCssFile(file)) {
          cleanedFiles++;
        }
      }
    });
  });
  
  console.log(`\n📊 清理完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已清理: ${cleanedFiles}`);
  console.log(`   跳过: ${totalFiles - cleanedFiles}`);
}

// 检查是否为主模块
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanCssFile, cssClassMappings };
