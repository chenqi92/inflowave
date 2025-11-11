import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
/// <reference types="vitest" />

// 使用联合类型来支持Vitest配置
interface ViteConfigWithTest {
  test?: {
    globals?: boolean;
    environment?: string;
    setupFiles?: string[];
  };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // 静态资源配置
    publicDir: 'public',
    
    // 确保语言资源文件被正确处理
    assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/locales/**/*.json'],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, but allow fallback if port is occupied
    server: {
        host: '127.0.0.1', // 使用 127.0.0.1
        port: 14222,
        strictPort: false,
        // 增加服务器超时配置
        hmr: {
            timeout: 60000, // 1 minute for HMR
        },
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**'],
            // 优化文件监听
            usePolling: false,
            interval: 100,
        },
    },

    // 路径别名配置
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@components': resolve(__dirname, 'src/components'),
            '@pages': resolve(__dirname, 'src/pages'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@services': resolve(__dirname, 'src/services'),
            '@store': resolve(__dirname, 'src/store'),
            '@types': resolve(__dirname, 'src/types'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@assets': resolve(__dirname, 'src/assets'),
            '@i18n': resolve(__dirname, 'src/i18n'),
        },
    },

    // 构建配置
    build: {
        // Tauri supports es2021
        target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
        // don't minify for debug builds
        minify: process.env.TAURI_DEBUG === 'true' ? false : 'esbuild',
        // produce sourcemaps for debug builds
        sourcemap: process.env.TAURI_DEBUG === 'true',
        // 优化构建性能
        chunkSizeWarningLimit: 1000,
        // 分包策略
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['echarts', 'echarts-for-react'],
                    editor: ['@codemirror/state', '@codemirror/view', '@codemirror/commands'],
                    utils: ['lodash-es', 'dayjs', 'classnames'],
                    tauri: ['@tauri-apps/api', '@tauri-apps/plugin-shell'],
                    i18n: ['react-i18next', 'i18next', 'i18next-browser-languagedetector', 'date-fns'],
                },
                // 优化输出文件名
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo: any) => {
                    // 特殊处理语言资源文件，保持目录结构
                    if (assetInfo.name && assetInfo.name.includes('locales/')) {
                        return 'locales/[name].[ext]';
                    }
                    return 'assets/[ext]/[name]-[hash].[ext]';
                },
            },
        },
    },

    // CSS 配置
    css: {
        postcss: './postcss.config.js',
    },

    // 环境变量配置
    envPrefix: ['VITE_', 'TAURI_'],

    // 优化配置
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'echarts',
            'echarts-for-react',
            'zustand',
            'dayjs',
            'lodash-es',
            '@tauri-apps/api',
            '@tauri-apps/plugin-shell',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/lang-sql',
            'react-i18next',
            'i18next',
            'i18next-browser-languagedetector',
            'date-fns',
        ],
        // 移除 force: true，使用缓存加速启动
        // 只在依赖变更或出现问题时才需要手动清理缓存: npm run clean:cache
    },

    // Worker配置
    worker: {
        format: 'es',
        plugins: () => [react()],
    },

    // 定义全局变量
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.TAURI_DEBUG': JSON.stringify(process.env.TAURI_DEBUG || 'false'),
        'process.env.DISABLE_CONSOLE_LOGS': JSON.stringify(process.env.DISABLE_CONSOLE_LOGS || 'false'),
    },



    // Vitest 配置
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData',
                'dist/',
            ],
        },
    },
} as any); // 使用类型断言来支持Vitest配置
