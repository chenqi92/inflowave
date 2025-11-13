const fs = require('fs');
const path = require('path');

const UNUSED_ICONS_FILE = path.join(__dirname, 'unused-icons.json');

/**
 * 删除未使用的图标文件
 */
function deleteUnusedIcons() {
  if (!fs.existsSync(UNUSED_ICONS_FILE)) {
    console.log('❌ 未找到 unused-icons.json 文件');
    console.log('💡 请先运行: node scripts/check-unused-icons.cjs');
    return;
  }

  const filesToDelete = JSON.parse(fs.readFileSync(UNUSED_ICONS_FILE, 'utf-8'));

  if (filesToDelete.length === 0) {
    console.log('✅ 没有需要删除的图标文件');
    return;
  }

  console.log(`🗑️  准备删除 ${filesToDelete.length} 个未使用的图标文件...\n`);

  let deletedCount = 0;
  let failedCount = 0;
  const failedFiles = [];

  for (const filePath of filesToDelete) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ 已删除: ${path.basename(filePath)}`);
        deletedCount++;
      } else {
        console.log(`⚠️  文件不存在: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.log(`❌ 删除失败: ${path.basename(filePath)} - ${error.message}`);
      failedCount++;
      failedFiles.push(filePath);
    }
  }

  console.log(`\n📊 删除统计:`);
  console.log(`  - 成功删除: ${deletedCount} 个`);
  console.log(`  - 删除失败: ${failedCount} 个`);

  if (failedFiles.length > 0) {
    console.log(`\n❌ 以下文件删除失败:`);
    failedFiles.forEach(file => console.log(`  - ${file}`));
  }

  // 删除临时文件
  try {
    fs.unlinkSync(UNUSED_ICONS_FILE);
    console.log(`\n🧹 已清理临时文件: unused-icons.json`);
  } catch (error) {
    console.log(`\n⚠️  清理临时文件失败: ${error.message}`);
  }

  console.log('\n✅ 完成！');
}

// 主函数
deleteUnusedIcons();

