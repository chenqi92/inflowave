#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('📦 开始在 CI 环境中下载字体...\n');

// 字体配置
const fonts = [
  { family: 'Inter', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Roboto', weights: ['300', '400', '500', '700'] },
  { family: 'Open Sans', weights: ['300', '400', '600', '700'] },
  { family: 'Lato', weights: ['300', '400', '700'] },
  { family: 'Source Sans Pro', weights: ['300', '400', '600', '700'] },
  { family: 'Nunito', weights: ['300', '400', '600', '700'] },
  { family: 'Poppins', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Montserrat', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Fira Sans', weights: ['300', '400', '500', '600'] },
  { family: 'Noto Sans', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Ubuntu', weights: ['300', '400', '500', '700'] },
  { family: 'Work Sans', weights: ['300', '400', '500', '600'] },
  { family: 'DM Sans', weights: ['400', '500', '700'] },
  { family: 'Plus Jakarta Sans', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Manrope', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Space Grotesk', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Outfit', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Lexend', weights: ['300', '400', '500', '600'] },
  { family: 'Be Vietnam Pro', weights: ['300', '400', '500', '600', '700'] },
  // 等宽字体
  { family: 'Fira Code', weights: ['300', '400', '500', '600', '700'] },
  { family: 'JetBrains Mono', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Source Code Pro', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Inconsolata', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Roboto Mono', weights: ['300', '400', '500', '700'] },
  { family: 'Ubuntu Mono', weights: ['400', '700'] }
];

// 创建目录
const fontsDir = path.join(__dirname, '../public/fonts');
const stylesDir = path.join(__dirname, '../src/styles');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
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
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }
    }).on('error', reject);
  });
}

// 获取字体CSS和文件
async function fetchGoogleFonts() {
  let cssContent = '/* 本地字体配置 - 自动生成于 CI 构建 */\n\n';
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
      console.log('\n🎉 字体下载完成！应用现在支持完全离线字体加载。');
      process.exit(0);
    } else {
      console.error('\n❌ 没有成功下载任何字体文件');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ 字体下载失败:', error.message);
    process.exit(1);
  });