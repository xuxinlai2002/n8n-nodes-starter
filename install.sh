#!/bin/bash

set -e  # 遇到错误自动退出

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 自动加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 强制 kill 所有 n8n 进程
pkill -f "n8n" 2>/dev/null || true

# 清理 AIChainApi 残留
rm -f ~/.n8n/custom/credentials/AIChainApi.credentials.* || true
rm -rf ~/.n8n/custom/nodes/AIChain || true

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到Node.js，请先安装Node.js${NC}"
    exit 1
fi

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.17.1"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${YELLOW}警告: 当前Node.js版本($NODE_VERSION)可能不兼容，自动切换到v$REQUIRED_VERSION${NC}"
    if command -v nvm &> /dev/null; then
        nvm use v$REQUIRED_VERSION
    else
        echo -e "${RED}错误: 未找到 nvm，请手动安装并切换到 Node.js v$REQUIRED_VERSION${NC}"
        exit 1
    fi
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到npm，请先安装npm${NC}"
    exit 1
fi

echo -e "${GREEN}开始安装 Contract Call 节点...${NC}"

# 清理旧的依赖
echo -e "${GREEN}清理旧的依赖...${NC}"
rm -rf node_modules
rm -f package-lock.json
rm -rf dist

# 只清理本项目相关的自定义节点文件（ContractCall*）
echo -e "${GREEN}清理本项目相关的 n8n 自定义节点数据...${NC}"
N8N_CUSTOM_DIR="$HOME/.n8n/custom"
if [ -d "$N8N_CUSTOM_DIR/nodes/ContractCall" ]; then
    rm -rf "$N8N_CUSTOM_DIR/nodes/ContractCall"
fi

# 创建types目录
echo -e "${GREEN}创建types目录...${NC}"
mkdir -p types

# 安装TypeScript相关依赖
echo -e "${GREEN}安装TypeScript相关依赖...${NC}"
npm install --save-dev typescript@4.8.4 @types/node@20.17.57
npm install --save-dev ts-node@10.9.2
npm install --save-dev @typescript-eslint/parser@5.45.0
npm install --save-dev gulp@4.0.2
npm install --save-dev @types/mongodb@4.0.7
npm install --save-dev @types/express@4.17.21
npm install --save-dev @types/luxon@3.4.0
npm install --save-dev @types/ssh2@1.11.18

# 只执行一次依赖安装和构建
echo -e "${GREEN}安装依赖...${NC}"
npm install

echo -e "${GREEN}构建项目...${NC}"
npm run build

# 复制构建后的文件到 n8n 正确 custom 目录
N8N_NODE_DIR="$HOME/.n8n/custom/nodes/ContractCall"
rm -rf "$N8N_NODE_DIR"
mkdir -p "$N8N_NODE_DIR"
cp -r dist/nodes/ContractCall/* "$N8N_NODE_DIR/"
chmod -R 755 "$N8N_NODE_DIR"

echo -e "${GREEN}启动 n8n...${NC}"
n8n start &

echo -e "${GREEN}安装完成！${NC}"
echo -e "${YELLOW}当前 ~/.n8n/custom/credentials/ 目录内容：${NC}"
ls -l ~/.n8n/custom/credentials/ || true 