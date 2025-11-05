#!/usr/bin/env node

/**
 * 本地开发环境字体下载脚本
 * 只下载核心字体，用于本地开发
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('📦 开始下载核心字体到本地...\n');

// 核心字体配置 - 只包含最常用的 8 个字体
// 用户可以通过设置中的"导入自定义字体"功能添加更多字体
const fonts = [
  // 现代无衬线字体 - 适合界面显示（4个）
  { family: 'Inter', weights: ['300', '400', '500', '600', '700'], description: '现代、清晰，最流行的界面字体' },
  { family: 'Roboto', weights: ['300', '400', '500', '700'], description: 'Google Material Design 标准字体' },
  { family: 'Open Sans', weights: ['300', '400', '600', '700'], description: '经典、易读的无衬线字体' },
  { family: 'Poppins', weights: ['300', '400', '500', '600', '700'], description: '现代、圆润的几何字体' },

  // 等宽字体 - 适合代码编辑（4个）
  { family: 'JetBrains Mono', weights: ['300', '400', '500', '600', '700'], description: '专为开发设计，支持连字' },
  { family: 'Fira Code', weights: ['300', '400', '500', '600', '700'], description: '流行的编程字体，支持连字' },
  { family: 'Source Code Pro', weights: ['300', '400', '500', '600', '700'], description: 'Adobe 出品，专业等宽字体' },
  { family: 'Cascadia Code', weights: ['300', '400', '600', '700'], description: '微软出品，现代编程字体' },
];

// 创建目录
const fontsDir = path.join(__dirname, '../public/fonts');
const stylesDir = path.join(__dirname, '../src/styles');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log('✅ 创建字体目录:', fontsDir);
}

if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// 下载函数
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

// 获取字体CSS和文件
async function fetchGoogleFonts() {
  let cssContent = '/* 本地字体配置 - 核心字体 */\n\n';
  let downloadedFiles = 0;
  let totalSize = 0;

  for (const font of fonts) {
    console.log(`📥 处理字体: ${font.family}`);
    
    // 构建Google Fonts URL
    const familyParam = font.family.replace(/ /g, '+');
    const weightsParam = font.weights.join(';');
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightsParam}&display=swap`;
    
    try {
      // 获取CSS
      const cssResponse = await new Promise((resolve, reject) => {
        https.get(googleFontsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, resolve).on('error', reject);
      });

      let cssData = '';
      cssResponse.on('data', chunk => cssData += chunk);
      await new Promise(resolve => cssResponse.on('end', resolve));

      // 解析CSS中的字体文件URL
      const fontUrls = cssData.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g);
      
      if (fontUrls) {
        // 处理每个字体文件
        for (const urlMatch of fontUrls) {
          const fontUrl = urlMatch.match(/url\((https:\/\/[^)]+)\)/)[1];
          const fileName = path.basename(new URL(fontUrl).pathname);
          const filePath = path.join(fontsDir, fileName);
          
          try {
            await downloadFile(fontUrl, filePath);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            downloadedFiles++;
            
            // 更新CSS中的URL为本地路径
            cssData = cssData.replace(fontUrl, `/fonts/${fileName}`);
          } catch (error) {
            console.warn(`⚠️  下载字体文件失败: ${fileName} - ${error.message}`);
          }
        }
        
        // 添加到总CSS
        cssContent += `/* ${font.family} */\n${cssData}\n\n`;
        console.log(`✅ ${font.family}: ${font.weights.length} 个字重`);
      }
    } catch (error) {
      console.warn(`⚠️  处理字体失败: ${font.family} - ${error.message}`);
    }
  }

  // 写入CSS文件
  const cssFilePath = path.join(stylesDir, 'fonts-local.css');
  fs.writeFileSync(cssFilePath, cssContent);

  // 输出统计信息
  console.log(`\n📊 下载完成:`);
  console.log(`   字体系列: ${fonts.length} 个`);
  console.log(`   字体文件: ${downloadedFiles} 个`);
  console.log(`   总大小: ${Math.round(totalSize / 1024 / 1024 * 100) / 100} MB`);
  console.log(`   CSS文件: ${cssFilePath}`);
  console.log(`   字体目录: ${fontsDir}`);

  return { downloadedFiles, totalSize };
}

// 执行下载
fetchGoogleFonts()
  .then(({ downloadedFiles, totalSize }) => {
    if (downloadedFiles > 0) {
      console.log('\n🎉 核心字体下载完成！');
      console.log('\n💡 提示：');
      console.log('   - 已下载 8 个核心字体（4 个界面字体 + 4 个等宽字体）');
      console.log('   - 字体文件已保存到 public/fonts/ 目录');
      console.log('   - CSS 配置已保存到 src/styles/fonts-local.css');
      console.log('   - 应用会自动使用本地字体，如果本地字体不存在则使用 Google Fonts CDN');
      console.log('\n📚 需要更多字体？');
      console.log('   - 在应用设置中使用"导入自定义字体"功能');
      console.log('   - 支持 .ttf, .otf, .woff, .woff2 格式');
      process.exit(0);
    } else {
      console.error('\n❌ 没有成功下载任何字体文件');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ 字体下载失败:', error.message);
    console.error('\n💡 提示：');
    console.error('   - 请检查网络连接');
    console.error('   - 如果无法下载，应用会自动使用 Google Fonts CDN');
    process.exit(1);
  });

