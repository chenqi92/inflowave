@echo off
REM 批处理脚本：清理缓存并重新构建项目
REM 用于解决构建超时和依赖问题

echo 🧹 开始清理项目缓存...

REM 清理 npm 缓存
echo 清理 npm 缓存...
where npm >nul 2>nul
if %errorlevel% == 0 (
    npm cache clean --force
    echo ✅ npm 缓存已清理
) else (
    echo ⚠️  npm 未找到，跳过 npm 缓存清理
)

REM 清理 node_modules
echo 删除 node_modules...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo ✅ node_modules 已删除
) else (
    echo ℹ️  node_modules 不存在
)

REM 清理 package-lock.json
echo 删除 package-lock.json...
if exist "package-lock.json" (
    del /f "package-lock.json"
    echo ✅ package-lock.json 已删除
)

REM 清理 Cargo 缓存
echo 清理 Cargo 缓存...
where cargo >nul 2>nul
if %errorlevel% == 0 (
    cd src-tauri
    cargo clean
    cd ..
    echo ✅ Cargo 缓存已清理
) else (
    echo ⚠️  cargo 未找到，跳过 Cargo 缓存清理
)

REM 清理 dist 目录
echo 删除 dist 目录...
if exist "dist" (
    rmdir /s /q "dist"
    echo ✅ dist 目录已删除
)

REM 重新安装依赖
echo 🔄 重新安装 npm 依赖...
npm install

if %errorlevel% == 0 (
    echo ✅ npm 依赖安装成功
) else (
    echo ❌ npm 依赖安装失败
    pause
    exit /b 1
)

REM 检查 Rust 工具链
echo 🦀 检查 Rust 工具链...
where cargo >nul 2>nul
if %errorlevel% == 0 (
    cargo --version
    rustc --version
    echo ✅ Rust 工具链正常
) else (
    echo ❌ Rust 工具链未找到，请先安装 Rust
    pause
    exit /b 1
)

echo 🎉 清理完成！现在可以尝试重新构建项目。
echo 建议的构建命令：
echo   开发模式: npm run tauri:dev
echo   构建模式: npm run tauri:build
pause
