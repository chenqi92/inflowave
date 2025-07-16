import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源目录和目标目录
const sourceDir = path.join(__dirname, '..', 'user-docs');
const targetDir = path.join(__dirname, '..', 'public', 'user-docs');

// 确保目标目录存在
if (!fs.existsSync(path.join(__dirname, '..', 'public'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'public'));
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 复制文件的函数
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制: ${path.basename(src)}`);
  } catch (error) {
    console.error(`❌ 复制失败: ${path.basename(src)}`, error.message);
  }
}

// 复制所有 .md 文件
function copyUserDocs() {
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

  mdFiles.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);
    copyFile(srcPath, destPath);
  });

  console.log(`✨ 完成！共复制 ${mdFiles.length} 个文档文件`);
}

// 执行复制
copyUserDocs();
