#!/bin/bash
# Linux 依赖安装脚本 - 支持多种发行版

set -e

# 颜色输出函数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# 检测 Linux 发行版
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="centos"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
    info "检测到发行版: $DISTRO $VERSION"
}

# Ubuntu/Debian 依赖安装
install_ubuntu_deps() {
    info "安装 Ubuntu/Debian 依赖..."
    sudo apt-get update
    sudo apt-get install -y software-properties-common
    sudo add-apt-repository universe -y || true
    sudo apt-get update
    
    # 解决 appindicator 冲突
    sudo apt-get remove -y libappindicator3-dev libappindicator3-1 2>/dev/null || true
    
    # 安装核心依赖
    sudo apt-get install -y \
        libgtk-3-dev \
        libwebkit2gtk-4.1-dev \
        librsvg2-dev \
        patchelf \
        libsoup-3.0-dev \
        libjavascriptcoregtk-4.1-dev \
        build-essential \
        curl \
        wget \
        libssl-dev \
        pkg-config \
        libayatana-appindicator3-dev
    
    success "Ubuntu/Debian 依赖安装完成"
}

# CentOS/RHEL/Fedora 依赖安装
install_centos_deps() {
    info "安装 CentOS/RHEL/Fedora 依赖..."
    
    if command -v dnf >/dev/null 2>&1; then
        PKG_MGR="dnf"
    elif command -v yum >/dev/null 2>&1; then
        PKG_MGR="yum"
    else
        error "未找到包管理器 (dnf/yum)"
        exit 1
    fi
    
    # 安装 EPEL 仓库
    if [[ "$DISTRO" == "centos" || "$DISTRO" == "rhel" ]]; then
        sudo $PKG_MGR install -y epel-release
    fi
    
    # 安装依赖
    sudo $PKG_MGR install -y \
        gtk3-devel \
        webkit2gtk4.1-devel \
        librsvg2-devel \
        libappindicator-gtk3-devel \
        openssl-devel \
        curl \
        wget \
        gcc \
        gcc-c++ \
        make \
        pkgconfig
    
    success "CentOS/RHEL/Fedora 依赖安装完成"
}

# 安装交叉编译工具
install_cross_compile_tools() {
    local target_arch=$1
    
    if [[ "$target_arch" == "arm64" ]]; then
        info "安装 ARM64 交叉编译工具..."
        case $DISTRO in
            ubuntu|debian)
                sudo apt-get install -y gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
                export CC_aarch64_unknown_linux_gnu=aarch64-linux-gnu-gcc
                export CXX_aarch64_unknown_linux_gnu=aarch64-linux-gnu-g++
                ;;
            centos|rhel|fedora)
                sudo $PKG_MGR install -y gcc-aarch64-linux-gnu
                ;;
        esac
        success "ARM64 交叉编译工具安装完成"
    elif [[ "$target_arch" == "x86" ]]; then
        info "安装 x86 交叉编译工具..."
        case $DISTRO in
            ubuntu|debian)
                sudo apt-get install -y gcc-multilib g++-multilib
                ;;
            centos|rhel|fedora)
                sudo $PKG_MGR install -y glibc-devel.i686
                ;;
        esac
        success "x86 交叉编译工具安装完成"
    fi
}

# 验证安装
verify_installation() {
    info "验证依赖安装..."
    
    local missing_deps=()
    
    if ! pkg-config --exists gtk+-3.0; then
        missing_deps+=("gtk3")
    fi
    
    if ! pkg-config --exists webkit2gtk-4.1; then
        missing_deps+=("webkit2gtk")
    fi
    
    if [[ ${#missing_deps[@]} -eq 0 ]]; then
        success "所有依赖验证通过"
        return 0
    else
        error "缺少依赖: ${missing_deps[*]}"
        return 1
    fi
}

# 主函数
main() {
    echo "🔧 Linux 依赖安装脚本"
    echo "======================"
    
    detect_distro
    TARGET_ARCH=${1:-"x64"}
    
    case $DISTRO in
        ubuntu|debian)
            install_ubuntu_deps
            ;;
        centos|rhel|fedora)
            install_centos_deps
            ;;
        *)
            error "不支持的发行版: $DISTRO"
            exit 1
            ;;
    esac
    
    if [[ "$TARGET_ARCH" != "x64" ]]; then
        install_cross_compile_tools "$TARGET_ARCH"
    fi
    
    if verify_installation; then
        success "Linux 依赖安装完成！"
    else
        error "依赖安装验证失败"
        exit 1
    fi
}

main "$@"
