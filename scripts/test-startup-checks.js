#!/usr/bin/env node

console.log('🧪 测试InfloWave启动检查功能...\n');

const os = require('os');
const fs = require('fs');
const path = require('path');

// 模拟启动检查
function testStartupChecks() {
    const results = [];
    
    // 1. 系统信息检查
    console.log('1. 检查系统信息...');
    const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100
    };
    
    console.log(`   平台: ${systemInfo.platform} ${systemInfo.arch}`);
    console.log(`   版本: ${systemInfo.release}`);
    console.log(`   内存: ${systemInfo.freeMemory}GB / ${systemInfo.totalMemory}GB`);
    
    if (systemInfo.freeMemory > 1) {
        console.log('   ✅ 内存充足');
        results.push({ check: 'memory', status: 'pass' });
    } else {
        console.log('   ⚠️  可用内存较少');
        results.push({ check: 'memory', status: 'warning' });
    }
    
    // 2. 字体文件检查
    console.log('\n2. 检查字体文件...');
    const fontPaths = [
        path.join(__dirname, '../src/styles/fonts-local.css'),
        path.join(__dirname, '../public/fonts')
    ];
    
    let fontFilesExist = false;
    fontPaths.forEach(fontPath => {
        if (fs.existsSync(fontPath)) {
            console.log(`   ✅ 找到: ${path.basename(fontPath)}`);
            fontFilesExist = true;
        } else {
            console.log(`   ❌ 缺失: ${path.basename(fontPath)}`);
        }
    });
    
    if (fontFilesExist) {
        results.push({ check: 'fonts', status: 'pass' });
    } else {
        console.log('   ⚠️  将使用在线字体');
        results.push({ check: 'fonts', status: 'warning' });
    }
    
    // 3. 应用程序文件检查
    console.log('\n3. 检查应用程序文件...');
    const appFiles = [
        path.join(__dirname, '../src-tauri/target'),
        path.join(__dirname, '../src-tauri/Cargo.toml'),
        path.join(__dirname, '../package.json'),
        path.join(__dirname, '../src-tauri/tauri.conf.json')
    ];
    
    let criticalFilesMissing = 0;
    appFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            console.log(`   ✅ ${path.basename(filePath)}`);
        } else {
            console.log(`   ❌ ${path.basename(filePath)}`);
            criticalFilesMissing++;
        }
    });
    
    if (criticalFilesMissing === 0) {
        console.log('   ✅ 所有关键文件都存在');
        results.push({ check: 'files', status: 'pass' });
    } else {
        console.log(`   ❌ ${criticalFilesMissing} 个关键文件缺失`);
        results.push({ check: 'files', status: 'fail' });
    }
    
    // 4. 端口可用性检查
    console.log('\n4. 检查端口可用性...');
    const net = require('net');
    const testPort = 1422;
    
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(testPort, '127.0.0.1', () => {
            console.log(`   ✅ 端口 ${testPort} 可用`);
            server.close();
            results.push({ check: 'port', status: 'pass' });
            resolve(results);
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`   ⚠️  端口 ${testPort} 被占用，应用程序将自动寻找其他端口`);
                results.push({ check: 'port', status: 'warning' });
            } else {
                console.log(`   ❌ 端口检查失败: ${err.message}`);
                results.push({ check: 'port', status: 'fail' });
            }
            resolve(results);
        });
    });
}

// 生成测试报告
function generateReport(results) {
    console.log('\n📊 启动检查报告:');
    console.log('========================');
    
    const passed = results.filter(r => r.status === 'pass').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    console.log(`✅ 通过: ${passed}`);
    console.log(`⚠️  警告: ${warnings}`);
    console.log(`❌ 失败: ${failed}`);
    
    console.log('\n详细结果:');
    results.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : 
                    result.status === 'warning' ? '⚠️ ' : '❌';
        console.log(`${icon} ${result.check}: ${result.status}`);
    });
    
    if (failed === 0) {
        console.log('\n🎉 所有关键检查都通过了！InfloWave应该能够正常启动。');
        return true;
    } else {
        console.log('\n⚠️  发现了一些问题，可能会影响应用程序启动。');
        console.log('\n建议操作:');
        console.log('1. 确保所有依赖项已正确安装');
        console.log('2. 运行 npm install 安装前端依赖');
        console.log('3. 运行 cargo build 构建后端');
        console.log('4. 检查防火墙和杀毒软件设置');
        return false;
    }
}

// 执行测试
async function runTests() {
    try {
        const results = await testStartupChecks();
        const success = generateReport(results);
        
        console.log('\n💡 提示:');
        console.log('- 这是一个模拟测试，实际的启动检查在应用程序启动时进行');
        console.log('- 如果遇到启动问题，请查看崩溃日志文件');
        console.log('- 使用 scripts/InfloWave-Safe-Start.bat (Windows) 进行安全启动');
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n❌ 测试执行失败:', error.message);
        process.exit(1);
    }
}

runTests();