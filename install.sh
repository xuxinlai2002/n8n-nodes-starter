#!/bin/bash

# 确保脚本在错误时退出
set -e

echo "开始安装 n8n 智能合约部署节点..."

# 清理旧的自定义节点目录
CUSTOM_NODE_DIR="$HOME/.n8n/custom/nodes/ContractDeployer"
echo "清理旧的自定义节点目录: $CUSTOM_NODE_DIR"
rm -rf "$CUSTOM_NODE_DIR"

# 安装依赖
echo "安装依赖..."
npm install

# 构建节点
echo "构建节点..."
npm run build

# 创建目标目录
echo "创建目标目录..."
mkdir -p ~/.n8n/custom/nodes/ContractDeployer/contract_temp/abi
mkdir -p ~/.n8n/custom/nodes/ContractDeployer/contract_temp/contract

# 复制构建文件
echo "复制构建文件..."
cp -r dist/* ~/.n8n/custom/

# 复制合约文件
echo "复制合约文件..."
cp -r contract_temp/abi/* ~/.n8n/custom/nodes/ContractDeployer/contract_temp/abi/
cp -r contract_temp/contract/* ~/.n8n/custom/nodes/ContractDeployer/contract_temp/contract/

# 复制依赖
echo "复制依赖..."
cp -r node_modules ~/.n8n/custom/

echo "安装完成！"

echo "自动启动 n8n..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18.17.1
n8n start 