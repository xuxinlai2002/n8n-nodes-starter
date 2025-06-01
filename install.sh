#!/bin/bash

# 确保脚本在错误时退出
set -e

echo "开始安装 n8n 智能合约部署节点..."

# 安装依赖
echo "安装依赖..."
npm install

# 构建节点
echo "构建节点..."
npm run build

# 创建目标目录
echo "创建目标目录..."
mkdir -p ~/.n8n/custom

# 复制构建后的文件
echo "复制构建文件..."
cp -r dist ~/.n8n/custom/

# 复制依赖
echo "复制依赖..."
cp -r node_modules ~/.n8n/custom/

echo "安装完成！"
echo "请重启 n8n 服务以应用更改。"
echo "如果使用 n8n 命令行，请运行: n8n restart"
echo "如果使用 Docker，请运行: docker restart n8n" 