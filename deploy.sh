#!/bin/bash

# 部署前自动设置终端翻墙代理
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890

# 自动切换 node 版本
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use v18.17.1

# 构建项目
pnpm build

# 清理并创建目标目录
rm -rf ~/.n8n/custom/nodes/ContractCall
mkdir -p ~/.n8n/custom/nodes/ContractCall/chains

# 复制文件
cp -r dist/nodes/ContractCall/* ~/.n8n/custom/nodes/ContractCall/
cp nodes/ContractCall/contractCall.svg ~/.n8n/custom/nodes/ContractCall/
cp nodes/ContractCall/chains/config.json ~/.n8n/custom/nodes/ContractCall/chains/

echo "部署完成！正在重启 n8n 服务..."

# 查找 n8n 进程
N8N_PID=$(ps aux | grep '[n]8n' | awk '{print $2}')

if [ -n "$N8N_PID" ]; then
    echo "找到 n8n 进程 (PID: $N8N_PID)，正在重启..."
    kill $N8N_PID
    sleep 2
fi

# 前台启动 n8n，输出日志到终端
n8n start 