#!/usr/bin/env node

/**
 * 生成图标预览 HTML 文件
 */

const fs = require('fs');
const path = require('path');

const ICON_BASE_DIR = path.join(__dirname, '../src/assets/icons/database');
const OUTPUT_FILE = path.join(__dirname, '../icon-preview.html');

const generatePreviewHTML = () => {
  console.log('📋 生成图标预览页面...');
  
  // 读取所有图标文件
  const lightIcons = fs.readdirSync(path.join(ICON_BASE_DIR, 'light')).filter(f => f.endsWith('.svg'));
  const darkIcons = fs.readdirSync(path.join(ICON_BASE_DIR, 'dark')).filter(f => f.endsWith('.svg'));
  const brandIcons = fs.readdirSync(path.join(ICON_BASE_DIR, 'brands')).filter(f => f.endsWith('.svg'));
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InfloWave 数据库图标预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header h1 { color: #1f2937; margin-bottom: 10px; }
    .header p { color: #6b7280; }
    .section {
      margin-bottom: 40px;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #374151;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 15px;
    }
    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: all 0.2s;
      background: #fafafa;
    }
    .icon-item:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      transform: translateY(-2px);
    }
    .icon-display {
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-display img {
      width: 24px;
      height: 24px;
    }
    .icon-name {
      font-size: 11px;
      color: #4b5563;
      text-align: center;
      word-break: break-all;
      line-height: 1.3;
    }
    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
    .theme-toggle:hover {
      background: #2563eb;
    }
    .dark-theme {
      background: #111827;
      color: #f9fafb;
    }
    .dark-theme .section,
    .dark-theme .header {
      background: #1f2937;
      color: #f9fafb;
    }
    .dark-theme .icon-item {
      background: #374151;
      border-color: #4b5563;
    }
    .dark-theme .icon-item:hover {
      border-color: #60a5fa;
      box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
    }
    .dark-theme .section h2 {
      color: #f3f4f6;
      border-bottom-color: #4b5563;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 20px 0;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .comparison-item {
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .comparison-item h4 {
      margin-bottom: 10px;
      text-align: center;
    }
    .comparison .light-theme { background: #f8fafc; }
    .comparison .dark-theme-demo { background: #1f2937; color: #f9fafb; border-color: #4b5563; }
  </style>
</head>
<body>
  <button class="theme-toggle" onclick="toggleTheme()">🌙 切换主题</button>
  
  <div class="container">
    <div class="header">
      <h1>🎨 InfloWave 数据库图标预览</h1>
      <p>共 ${lightIcons.length + darkIcons.length + brandIcons.length} 个 SVG 图标占位符</p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${lightIcons.length}</div>
          <div class="stat-label">亮色主题</div>
        </div>
        <div class="stat">
          <div class="stat-number">${darkIcons.length}</div>
          <div class="stat-label">暗色主题</div>
        </div>
        <div class="stat">
          <div class="stat-number">${brandIcons.length}</div>
          <div class="stat-label">品牌图标</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🏢 数据库品牌图标</h2>
      <div class="icon-grid">
        ${brandIcons.map(icon => {
          const name = icon.replace('.svg', '');
          return `
            <div class="icon-item">
              <div class="icon-display">
                <img src="src/assets/icons/database/brands/${icon}" alt="${name}">
              </div>
              <div class="icon-name">${name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section">
      <h2>🔌 连接状态图标对比</h2>
      <div class="comparison">
        <div class="comparison-item light-theme">
          <h4>亮色主题</h4>
          <div class="icon-grid">
            ${['connection-active', 'connection-inactive', 'connection-error', 'connection-loading'].map(icon => `
              <div class="icon-item">
                <div class="icon-display">
                  <img src="src/assets/icons/database/light/${icon}.svg" alt="${icon}">
                </div>
                <div class="icon-name">${icon}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="comparison-item dark-theme-demo">
          <h4>暗色主题</h4>
          <div class="icon-grid">
            ${['connection-active', 'connection-inactive', 'connection-error', 'connection-loading'].map(icon => `
              <div class="icon-item">
                <div class="icon-display">
                  <img src="src/assets/icons/database/dark/${icon}.svg" alt="${icon}">
                </div>
                <div class="icon-name">${icon}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="section" id="light-icons">
      <h2>☀️ 亮色主题图标 (${lightIcons.length} 个)</h2>
      <div class="icon-grid">
        ${lightIcons.sort().map(icon => {
          const name = icon.replace('.svg', '');
          return `
            <div class="icon-item">
              <div class="icon-display">
                <img src="src/assets/icons/database/light/${icon}" alt="${name}">
              </div>
              <div class="icon-name">${name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section" id="dark-icons" style="display: none;">
      <h2>🌙 暗色主题图标 (${darkIcons.length} 个)</h2>
      <div class="icon-grid">
        ${darkIcons.sort().map(icon => {
          const name = icon.replace('.svg', '');
          return `
            <div class="icon-item">
              <div class="icon-display">
                <img src="src/assets/icons/database/dark/${icon}" alt="${name}">
              </div>
              <div class="icon-name">${name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </div>

  <script>
    let isDark = false;
    
    function toggleTheme() {
      isDark = !isDark;
      const body = document.body;
      const button = document.querySelector('.theme-toggle');
      const lightSection = document.getElementById('light-icons');
      const darkSection = document.getElementById('dark-icons');
      
      if (isDark) {
        body.classList.add('dark-theme');
        button.textContent = '☀️ 切换主题';
        lightSection.style.display = 'none';
        darkSection.style.display = 'block';
      } else {
        body.classList.remove('dark-theme');
        button.textContent = '🌙 切换主题';
        lightSection.style.display = 'block';
        darkSection.style.display = 'none';
      }
    }
    
    // 图标点击复制功能
    document.addEventListener('click', (e) => {
      const iconItem = e.target.closest('.icon-item');
      if (iconItem) {
        const iconName = iconItem.querySelector('.icon-name').textContent;
        navigator.clipboard.writeText(iconName).then(() => {
          const originalBg = iconItem.style.backgroundColor;
          iconItem.style.backgroundColor = '#10b981';
          iconItem.style.color = 'white';
          setTimeout(() => {
            iconItem.style.backgroundColor = originalBg;
            iconItem.style.color = '';
          }, 500);
        });
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`✅ 图标预览页面已生成: ${OUTPUT_FILE}`);
  console.log('🌐 在浏览器中打开该文件即可查看所有图标');
  console.log('💡 点击图标可复制图标名称');
};

if (require.main === module) {
  generatePreviewHTML();
}

module.exports = { generatePreviewHTML };