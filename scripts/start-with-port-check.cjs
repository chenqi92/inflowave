#!/usr/bin/env node

const { execSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

/**
 * 检查端口是否可用
 */
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false);
        });
    });
}

/**
 * 查找可用端口
 */
async function findAvailablePort(startPort = 1422, endPort = 1500) {
    for (let port = startPort; port <= endPort; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    
    // 如果范围内没有可用端口，让系统分配一个
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

/**
 * 更新 tauri.conf.json 中的 devUrl
 */
function updateTauriConfig(port) {
    const configPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const newDevUrl = `http://localhost:${port}`;
    config.build.devUrl = newDevUrl;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ 已更新 tauri.conf.json 中的 devUrl 为: ${newDevUrl}`);
}

/**
 * 更新 Vite 配置
 */
function updateViteConfig(port) {
    const configPath = path.join(__dirname, '..', 'vite.config.ts');
    
    try {
        let config = fs.readFileSync(configPath, 'utf8');
        
        // 使用正则表达式替换端口配置
        const portRegex = /port:\s*\d+/;
        if (portRegex.test(config)) {
            config = config.replace(portRegex, `port: ${port}`);
            fs.writeFileSync(configPath, config);
            console.log(`✅ 已更新 vite.config.ts 中的端口为: ${port}`);
        }
    } catch (error) {
        console.warn('⚠️  无法更新 vite.config.ts:', error.message);
    }
}

/**
 * 启动应用
 */
async function startApp() {
    try {
        console.log('🔍 检查端口可用性...');
        
        const defaultPort = 1422;
        let port = defaultPort;
        
        if (!(await isPortAvailable(defaultPort))) {
            console.log(`⚠️  默认端口 ${defaultPort} 被占用，正在查找可用端口...`);
            port = await findAvailablePort();
            console.log(`✅ 找到可用端口: ${port}`);
            
            // 更新 Tauri 配置
            updateTauriConfig(port);
            // 更新 Vite 配置
            updateViteConfig(port);
        } else {
            console.log(`✅ 默认端口 ${defaultPort} 可用`);
        }
        
        console.log(`🚀 启动应用，使用端口: ${port}`);
        
        // 根据传入的参数决定启动模式
        const args = process.argv.slice(2);
        let command;
        
        if (args.includes('--dev') || args.includes('dev')) {
            command = `npm run tauri:dev`;
        } else if (args.includes('--build') || args.includes('build')) {
            command = `npm run tauri:build`;
        } else {
            // 默认开发模式
            command = `npm run tauri:dev`;
        }
        
        // 启动应用，传递端口信息给 Vite
        execSync(command, { 
            stdio: 'inherit',
            env: { 
                ...process.env, 
                PORT: port.toString(),
                VITE_PORT: port.toString(),
                VITE_DEV_SERVER_PORT: port.toString()
            }
        });
        
    } catch (error) {
        console.error('❌ 启动失败:', error.message);
        process.exit(1);
    }
}

// 程序入口
if (require.main === module) {
    startApp();
}

module.exports = { isPortAvailable, findAvailablePort, updateTauriConfig };