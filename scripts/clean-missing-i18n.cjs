#!/usr/bin/env node

/**
 * 清理 missing-i18n.txt 文件中的重复键
 * 
 * 功能：
 * 1. 读取 missing-i18n.txt 文件
 * 2. 去除重复的键（保留带 namespace 的版本）
 * 3. 验证键是否真的缺失（检查翻译文件）
 * 4. 生成清理后的文件
 */

const fs = require('fs');
const path = require('path');

const MISSING_I18N_FILE = path.join(__dirname, '..', 'src-tauri', 'logs', 'missing-i18n.txt');
const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');

/**
 * 读取翻译文件
 */
function loadTranslationFile(language, namespace) {
  const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 检查键是否存在于翻译文件中
 */
function keyExists(language, namespace, key) {
  const data = loadTranslationFile(language, namespace);
  
  if (!data) {
    return false;
  }
  
  // 支持嵌套键（如 "template.title"）
  const keys = key.split('.');
  let value = data;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }
  
  return typeof value === 'string';
}

/**
 * 解析缺失键
 */
function parseMissingKey(line) {
  // 格式: language:namespace:key 或 language:key
  const parts = line.split(':');
  
  if (parts.length < 2) {
    return null;
  }
  
  const language = parts[0];
  
  if (parts.length === 2) {
    // language:key 格式（没有 namespace）
    return { language, namespace: null, key: parts[1], original: line };
  } else {
    // language:namespace:key 格式
    const namespace = parts[1];
    const key = parts.slice(2).join(':');
    return { language, namespace, key, original: line };
  }
}

/**
 * 清理缺失键列表
 */
function cleanMissingKeys(lines) {
  const keyMap = new Map(); // 用于去重
  const trulyMissing = []; // 真正缺失的键
  
  for (const line of lines) {
    const parsed = parseMissingKey(line);
    
    if (!parsed) {
      continue;
    }
    
    const { language, namespace, key, original } = parsed;
    
    // 如果没有 namespace，跳过（因为我们优先保留带 namespace 的版本）
    if (!namespace) {
      continue;
    }
    
    // 生成唯一键
    const uniqueKey = `${language}:${namespace}:${key}`;
    
    // 检查是否已存在
    if (keyMap.has(uniqueKey)) {
      continue;
    }
    
    // 检查键是否真的缺失
    if (!keyExists(language, namespace, key)) {
      keyMap.set(uniqueKey, original);
      trulyMissing.push({ language, namespace, key, original });
    }
  }
  
  return trulyMissing;
}

/**
 * 主函数
 */
function main() {
  console.log('🧹 清理 missing-i18n.txt 文件...\n');
  
  // 检查文件是否存在
  if (!fs.existsSync(MISSING_I18N_FILE)) {
    console.log('✅ missing-i18n.txt 文件不存在，无需清理');
    return;
  }
  
  // 读取文件
  const content = fs.readFileSync(MISSING_I18N_FILE, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  console.log(`📊 原始缺失键数量: ${lines.length}`);
  
  // 清理重复和已存在的键
  const cleaned = cleanMissingKeys(lines);
  
  console.log(`📊 清理后缺失键数量: ${cleaned.length}`);
  console.log(`✨ 移除了 ${lines.length - cleaned.length} 个重复或已存在的键\n`);
  
  if (cleaned.length === 0) {
    console.log('🎉 所有翻译键都已存在！');
    
    // 清空文件
    const emptyContent = `# 缺失的 i18n 翻译键
# Missing i18n Translation Keys
#
# 生成时间 / Generated at: ${new Date().toISOString()}
# 总数 / Total: 0
#
# 格式 / Format: language:namespace:key
# 例如 / Example: zh-CN:iotdb:template.title
#
# 所有翻译键都已存在！
# All translation keys exist!
`;
    
    fs.writeFileSync(MISSING_I18N_FILE, emptyContent, 'utf-8');
    console.log('✅ 已清空 missing-i18n.txt 文件');
  } else {
    console.log('⚠️  以下翻译键仍然缺失：\n');
    
    // 按 namespace 分组显示
    const byNamespace = {};
    cleaned.forEach(({ language, namespace, key }) => {
      const ns = namespace || 'unknown';
      if (!byNamespace[ns]) {
        byNamespace[ns] = [];
      }
      byNamespace[ns].push(`${language}:${key}`);
    });
    
    for (const [ns, keys] of Object.entries(byNamespace)) {
      console.log(`  📦 ${ns}:`);
      keys.forEach(key => console.log(`     - ${key}`));
      console.log('');
    }
    
    // 生成新文件
    const newContent = `# 缺失的 i18n 翻译键
# Missing i18n Translation Keys
#
# 生成时间 / Generated at: ${new Date().toISOString()}
# 总数 / Total: ${cleaned.length}
#
# 格式 / Format: language:namespace:key
# 例如 / Example: zh-CN:iotdb:template.title
#

${cleaned.map(item => item.original).sort().join('\n')}
`;
    
    fs.writeFileSync(MISSING_I18N_FILE, newContent, 'utf-8');
    console.log('✅ 已更新 missing-i18n.txt 文件');
  }
}

main();

