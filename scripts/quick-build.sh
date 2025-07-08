#!/bin/bash
# InfluxDB GUI Manager - 快速编译脚本 (Linux/macOS)

set -e

# 默认参数
MODE="check"
CLEAN=false
OFFLINE=false
VERBOSE=false
FIX_NETWORK=false

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_step() { echo -e "${BLUE}🔧 $1${NC}"; }

show_help() {
    cat << EOF
InfluxDB GUI Manager - 快速编译脚本

用法:
    ./scripts/quick-build.sh [选项]

模式:
    check    - 仅检查代码 (默认)
    build    - 构建 debug 版本
    dev      - 启动开发模式
    full     - 完整构建 (包括前端)

选项:
    -c, --clean       清理构建文件
    -o, --offline     离线模式 (不更新依赖)
    -v, --verbose     显示详细输出
    -n, --fix-network 修复网络问题
    -h, --help        显示帮助信息

示例:
    ./scripts/quick-build.sh                    # 快速检查
    ./scripts/quick-build.sh build              # 构建项目
    ./scripts/quick-build.sh dev                # 开发模式
    ./scripts/quick-build.sh -c -n              # 清理并修复网络问题

EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            check|build|dev|full)
                MODE="$1"
                shift
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            -o|--offline)
                OFFLINE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -n|--fix-network)
                FIX_NETWORK=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

test_prerequisites() {
    log_step "检查构建环境..."
    
    local tools=("rustc:Rust编译器" "cargo:Cargo包管理器" "node:Node.js" "npm:npm包管理器")
    local all_good=true
    
    for tool_info in "${tools[@]}"; do
        IFS=':' read -r tool desc <<< "$tool_info"
        if command -v "$tool" &> /dev/null; then
            local version=$($tool --version 2>/dev/null | head -n1)
            log_success "$desc: $version"
        else
            log_error "$desc 未安装"
            all_good=false
        fi
    done
    
    if [[ "$all_good" != true ]]; then
        log_error "请先安装必要的工具，或运行 ./scripts/setup-dev.sh"
        exit 1
    fi
}

fix_network_issues() {
    log_step "修复网络问题..."
    
    # 创建 Cargo 配置目录
    local cargo_dir="$HOME/.cargo"
    mkdir -p "$cargo_dir"
    
    # 设置 Cargo 配置
    cat > "$cargo_dir/config.toml" << EOF
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[net]
git-fetch-with-cli = true
retry = 3

[http]
check-revoke = false
timeout = 60
low-speed-limit = 10
low-speed-timeout = 60

[build]
jobs = 2
EOF
    
    log_success "Cargo 网络配置已优化"
    
    # 设置环境变量
    export CARGO_NET_RETRY=3
    export CARGO_NET_GIT_FETCH_WITH_CLI=true
    export CARGO_HTTP_TIMEOUT=60
    
    log_success "网络问题修复完成"
}

clear_build_files() {
    log_step "清理构建文件..."
    
    local clean_paths=("src-tauri/target/debug" "src-tauri/target/release" "node_modules" "dist")
    
    for path in "${clean_paths[@]}"; do
        if [[ -e "$path" ]]; then
            log_info "清理 $path"
            rm -rf "$path"
        fi
    done
    
    # 清理 Cargo 缓存
    log_info "清理 Cargo 缓存..."
    pushd "src-tauri" > /dev/null
    cargo clean 2>/dev/null || log_warning "Cargo clean 失败，继续执行..."
    popd > /dev/null
    
    log_success "构建文件清理完成"
}

install_dependencies() {
    log_step "安装/更新依赖..."
    
    # 前端依赖
    if [[ "$OFFLINE" != true ]] && [[ -f "package.json" ]]; then
        log_info "安装前端依赖..."
        if [[ -d "node_modules" ]]; then
            log_info "前端依赖已存在，跳过安装"
        else
            npm install --prefer-offline --no-audit || {
                log_warning "前端依赖安装失败，尝试使用缓存..."
                npm install --offline --no-audit
            }
        fi
    fi
    
    # 后端依赖检查
    log_info "检查后端依赖..."
    pushd "src-tauri" > /dev/null
    if [[ "$OFFLINE" != true ]]; then
        log_info "更新 Cargo 索引..."
        cargo update --dry-run 2>/dev/null || log_warning "Cargo 索引更新失败，继续执行..."
    fi
    log_success "后端依赖检查完成"
    popd > /dev/null
}

build_backend() {
    local build_mode="$1"
    log_step "构建后端 ($build_mode)..."
    
    pushd "src-tauri" > /dev/null
    
    # 设置构建环境
    export RUST_LOG=info
    if [[ "$VERBOSE" == true ]]; then
        export RUST_BACKTRACE=1
    fi
    
    case "$build_mode" in
        "check")
            log_info "检查代码语法和类型..."
            if cargo check --color always; then
                log_success "代码检查通过"
            else
                log_error "代码检查失败"
                exit 1
            fi
            ;;
        "build")
            log_info "构建 debug 版本..."
            if cargo build --color always; then
                log_success "后端构建完成"
            else
                log_error "后端构建失败"
                exit 1
            fi
            ;;
        "release")
            log_info "构建 release 版本..."
            if cargo build --release --color always; then
                log_success "后端发布版本构建完成"
            else
                log_error "后端发布版本构建失败"
                exit 1
            fi
            ;;
    esac
    
    popd > /dev/null
}

build_frontend() {
    log_step "构建前端..."
    
    if [[ ! -f "package.json" ]]; then
        log_warning "未找到 package.json，跳过前端构建"
        return
    fi
    
    log_info "构建前端资源..."
    if npm run build; then
        log_success "前端构建完成"
    else
        log_error "前端构建失败"
        exit 1
    fi
}

start_dev_mode() {
    log_step "启动开发模式..."
    
    # 检查前端开发服务器
    log_info "启动前端开发服务器..."
    npm run dev &
    
    # 等待前端服务器启动
    log_info "等待前端服务器启动..."
    sleep 5
    
    # 启动 Tauri 开发模式
    log_info "启动 Tauri 开发模式..."
    pushd "src-tauri" > /dev/null
    cargo tauri dev
    popd > /dev/null
}

show_build_info() {
    log_step "构建信息"
    log_info "模式: $MODE"
    log_info "清理: $CLEAN"
    log_info "离线模式: $OFFLINE"
    log_info "详细输出: $VERBOSE"
    log_info "修复网络: $FIX_NETWORK"
    echo -e "${NC}========================================${NC}"
}

main() {
    echo -e "${MAGENTA}⚡ InfluxDB GUI Manager - 快速编译工具${NC}"
    echo -e "${MAGENTA}===================================${NC}"
    
    show_build_info
    
    # 检查环境
    test_prerequisites
    
    # 修复网络问题
    if [[ "$FIX_NETWORK" == true ]]; then
        fix_network_issues
    fi
    
    # 清理文件
    if [[ "$CLEAN" == true ]]; then
        clear_build_files
    fi
    
    # 安装依赖
    install_dependencies
    
    # 根据模式执行构建
    case "$MODE" in
        "check")
            build_backend "check"
            log_success "代码检查完成！"
            ;;
        "build")
            build_backend "build"
            log_success "构建完成！"
            ;;
        "dev")
            build_backend "check"
            start_dev_mode
            ;;
        "full")
            build_frontend
            build_backend "build"
            log_success "完整构建完成！"
            ;;
        *)
            log_error "未知模式: $MODE"
            show_help
            exit 1
            ;;
    esac
}

# 错误处理
trap 'log_error "构建过程中发生错误，退出码: $?"' ERR

# 解析参数并运行
parse_args "$@"
main
