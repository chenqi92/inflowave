import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源目录和目标目录
const sourceDir = path.join(__dirname, '..', 'user-docs');
const targetDir = path.join(__dirname, '..', 'public', 'user-docs');
const englishSourceDir = path.join(__dirname, '..', 'docs', 'user-guide', 'en-US');
const cacheFile = path.join(targetDir, '.copy-cache.json');

// 确保目标目录存在
if (!fs.existsSync(path.join(__dirname, '..', 'public'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'public'));
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 计算文件哈希
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

// 加载缓存
function loadCache() {
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  } catch {
    // 忽略缓存加载错误
  }
  return {};
}

// 保存缓存
function saveCache(cache) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('⚠️  缓存保存失败:', error.message);
  }
}

// 复制文件的函数（带缓存检查）
function copyFile(src, dest, cache, fileName) {
  try {
    const srcHash = getFileHash(src);
    const destHash = getFileHash(dest);

    // 如果文件内容相同且缓存匹配，跳过复制
    if (srcHash && destHash && srcHash === destHash && cache[fileName] === srcHash) {
      return false; // 未复制
    }

    fs.copyFileSync(src, dest);
    cache[fileName] = srcHash;
    return true; // 已复制
  } catch (error) {
    console.error(`❌ 复制失败: ${fileName}`, error.message);
    return false;
  }
}

// 复制所有 .md 文件
function copyUserDocs() {
  const startTime = Date.now();
  console.log('📚 开始复制用户文档...');

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ 源目录不存在: ${sourceDir}`);
    return;
  }

  const files = fs.readdirSync(sourceDir);
  const mdFiles = files.filter(file => file.endsWith('.md'));

  if (mdFiles.length === 0) {
    console.warn('⚠️  未找到 .md 文件');
    return;
  }

  const cache = loadCache();
  let copiedCount = 0;
  let skippedCount = 0;

  mdFiles.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);

    if (copyFile(srcPath, destPath, cache, file)) {
      console.log(`✅ 复制: ${file}`);
      copiedCount++;
    } else {
      skippedCount++;
    }
  });

  const englishTargetDir = path.join(targetDir, 'en-US');
  fs.mkdirSync(englishTargetDir, {recursive: true});
  const englishFiles = fs.readdirSync(englishSourceDir).filter(file => file.endsWith('.md'));
  englishFiles.forEach(file => {
    if (copyFile(path.join(englishSourceDir, file), path.join(englishTargetDir, file), cache, `en-US/${file}`)) {
      copiedCount++;
    } else {
      skippedCount++;
    }
  });

  saveCache(cache);

  const duration = Date.now() - startTime;
  console.log(`✨ 完成！共 ${mdFiles.length + englishFiles.length} 个文档文件 (复制: ${copiedCount}, 跳过: ${skippedCount}, 耗时: ${duration}ms)`);
}

// 执行复制
copyUserDocs();
