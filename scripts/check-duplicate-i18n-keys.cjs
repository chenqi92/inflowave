/**
 * 检查 i18n 资源文件中的重复键
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const LANGUAGES = ['zh-CN', 'en-US'];

function checkDuplicateKeys(obj, prefix = '', duplicates = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      checkDuplicateKeys(value, fullKey, duplicates);
    } else {
      if (duplicates.has(fullKey)) {
        duplicates.get(fullKey).push(value);
      } else {
        duplicates.set(fullKey, [value]);
      }
    }
  }
  
  return duplicates;
}

function findDuplicatesInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    const allKeys = new Map();
    checkDuplicateKeys(json, '', allKeys);
    
    // 检查是否有重复的键（这里检查的是同一个文件内的重复）
    const duplicates = [];
    
    // 检查 JSON 字符串中是否有重复的键定义
    const lines = content.split('\n');
    const keyPattern = /"([^"]+)":/g;
    const keyCounts = new Map();
    
    for (const line of lines) {
      let match;
      while ((match = keyPattern.exec(line)) !== null) {
        const key = match[1];
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      }
    }
    
    for (const [key, count] of keyCounts.entries()) {
      if (count > 1) {
        duplicates.push(key);
      }
    }
    
    return duplicates;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function checkAllLanguages() {
  console.log('🔍 检查 i18n 资源文件中的重复键...\n');
  
  let hasErrors = false;
  
  for (const lang of LANGUAGES) {
    console.log(`\n📦 检查语言: ${lang}`);
    
    const langDir = path.join(LOCALES_DIR, lang);
    
    if (!fs.existsSync(langDir)) {
      console.log(`  ⚠️  语言目录不存在: ${lang}`);
      continue;
    }
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(langDir, file);
      const duplicates = findDuplicatesInFile(filePath);
      
      if (duplicates.length > 0) {
        console.log(`  ❌ ${file} 发现重复键:`);
        duplicates.forEach(key => {
          console.log(`     - "${key}"`);
        });
        hasErrors = true;
      } else {
        console.log(`  ✅ ${file}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (hasErrors) {
    console.log('❌ 发现重复的键！请修复后再继续。');
    process.exit(1);
  } else {
    console.log('✅ 没有发现重复的键。');
    process.exit(0);
  }
}

checkAllLanguages();
