const fs = require('fs');
const path = require('path');

// 图标目录
const ICONS_DIR = path.join(__dirname, '../src/assets/icons');
const DATABASE_ICONS_LIGHT = path.join(ICONS_DIR, 'database/light');
const DATABASE_ICONS_DARK = path.join(ICONS_DIR, 'database/dark');
const DATABASE_ICONS_BRANDS = path.join(ICONS_DIR, 'database/brands');
const COMPLETION_ICONS = path.join(ICONS_DIR, 'completion');

// 源代码目录
const SRC_DIR = path.join(__dirname, '../src');

/**
 * 读取目录中的所有SVG文件
 */
function getSvgFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.svg'))
    .map(file => file);
}

/**
 * 递归获取所有TypeScript/TSX文件
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过node_modules等目录
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 从所有源代码文件中提取引用的图标文件名
 */
function extractReferencedIcons() {
  const referencedIcons = new Set();
  const tsFiles = getAllTsFiles(SRC_DIR);

  console.log(`📂 扫描 ${tsFiles.length} 个源代码文件...\n`);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf-8');

    // 提取所有.svg文件引用
    // 匹配模式: 'icon-name.svg' 或 "icon-name.svg"
    const iconMatches = content.matchAll(/['"]([a-z0-9-_]+\.svg)['"]/gi);

    for (const match of iconMatches) {
      referencedIcons.add(match[1]);
    }

    // 提取品牌图标路径中的文件名
    // 匹配: /brands/influxdb-1x.svg 或 /brands/influxdb-1x${suffix}.svg
    const brandMatches = content.matchAll(/\/brands\/([a-z0-9-]+)(?:\$\{[^}]+\})?\.svg/gi);
    for (const match of brandMatches) {
      const baseName = match[1];
      referencedIcons.add(`${baseName}.svg`);
      referencedIcons.add(`${baseName}-dark.svg`);
    }

    // 提取database/light或database/dark路径中的文件名
    // 匹配: /database/light/icon.svg 或 /database/dark/icon.svg
    const dbIconMatches = content.matchAll(/\/database\/(?:light|dark)\/([a-z0-9-_]+\.svg)/gi);
    for (const match of dbIconMatches) {
      referencedIcons.add(match[1]);
    }
  }

  return referencedIcons;
}

/**
 * 分析未使用的图标
 */
function analyzeUnusedIcons() {
  console.log('🔍 分析未使用的图标文件...\n');

  // 获取所有图标文件
  const lightIcons = getSvgFiles(DATABASE_ICONS_LIGHT);
  const darkIcons = getSvgFiles(DATABASE_ICONS_DARK);
  const brandIcons = getSvgFiles(DATABASE_ICONS_BRANDS);
  const completionIcons = getSvgFiles(COMPLETION_ICONS);

  console.log(`📊 图标统计:`);
  console.log(`  - Light主题图标: ${lightIcons.length} 个`);
  console.log(`  - Dark主题图标: ${darkIcons.length} 个`);
  console.log(`  - 品牌图标: ${brandIcons.length} 个`);
  console.log(`  - 补全图标: ${completionIcons.length} 个`);
  console.log(`  - 总计: ${lightIcons.length + darkIcons.length + brandIcons.length + completionIcons.length} 个\n`);

  // 提取引用的图标
  const referencedIcons = extractReferencedIcons();
  console.log(`✅ 代码中引用的图标: ${referencedIcons.size} 个\n`);

  // 分析未使用的图标
  const unusedIcons = {
    light: [],
    dark: [],
    brands: [],
    completion: []
  };

  // 检查light主题图标
  for (const icon of lightIcons) {
    if (!referencedIcons.has(icon)) {
      unusedIcons.light.push(icon);
    }
  }

  // 检查dark主题图标
  for (const icon of darkIcons) {
    if (!referencedIcons.has(icon)) {
      unusedIcons.dark.push(icon);
    }
  }

  // 检查品牌图标
  for (const icon of brandIcons) {
    if (!referencedIcons.has(icon)) {
      unusedIcons.brands.push(icon);
    }
  }

  // 补全图标暂时保留（用于代码编辑器）
  // for (const icon of completionIcons) {
  //   if (!referencedIcons.has(icon)) {
  //     unusedIcons.completion.push(icon);
  //   }
  // }

  // 输出结果
  const totalUnused = unusedIcons.light.length + unusedIcons.dark.length + 
                      unusedIcons.brands.length + unusedIcons.completion.length;

  if (totalUnused === 0) {
    console.log('✅ 没有发现未使用的图标！');
    return { unusedIcons, totalUnused: 0 };
  }

  console.log(`❌ 发现 ${totalUnused} 个未使用的图标:\n`);

  if (unusedIcons.light.length > 0) {
    console.log(`📁 Light主题 (${unusedIcons.light.length} 个):`);
    unusedIcons.light.forEach(icon => {
      console.log(`  - ${icon}`);
    });
    console.log();
  }

  if (unusedIcons.dark.length > 0) {
    console.log(`📁 Dark主题 (${unusedIcons.dark.length} 个):`);
    unusedIcons.dark.forEach(icon => {
      console.log(`  - ${icon}`);
    });
    console.log();
  }

  if (unusedIcons.brands.length > 0) {
    console.log(`📁 品牌图标 (${unusedIcons.brands.length} 个):`);
    unusedIcons.brands.forEach(icon => {
      console.log(`  - ${icon}`);
    });
    console.log();
  }

  if (unusedIcons.completion.length > 0) {
    console.log(`📁 补全图标 (${unusedIcons.completion.length} 个):`);
    unusedIcons.completion.forEach(icon => {
      console.log(`  - ${icon}`);
    });
    console.log();
  }

  return { unusedIcons, totalUnused };
}

/**
 * 生成删除命令
 */
function generateDeleteCommands(unusedIcons) {
  const commands = [];

  for (const icon of unusedIcons.light) {
    commands.push(path.join(DATABASE_ICONS_LIGHT, icon));
  }

  for (const icon of unusedIcons.dark) {
    commands.push(path.join(DATABASE_ICONS_DARK, icon));
  }

  for (const icon of unusedIcons.brands) {
    commands.push(path.join(DATABASE_ICONS_BRANDS, icon));
  }

  for (const icon of unusedIcons.completion) {
    commands.push(path.join(COMPLETION_ICONS, icon));
  }

  return commands;
}

// 主函数
function main() {
  const { unusedIcons, totalUnused } = analyzeUnusedIcons();

  if (totalUnused > 0) {
    const filesToDelete = generateDeleteCommands(unusedIcons);
    
    console.log('\n📝 生成删除文件列表...');
    const outputFile = path.join(__dirname, 'unused-icons.json');
    fs.writeFileSync(outputFile, JSON.stringify(filesToDelete, null, 2));
    console.log(`✅ 已保存到: ${outputFile}\n`);
    
    console.log('💡 提示: 运行以下命令删除这些文件:');
    console.log(`   node scripts/delete-unused-icons.js\n`);
  }
}

main();

