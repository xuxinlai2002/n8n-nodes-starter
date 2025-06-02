#!/bin/bash

# 构建项目
pnpm build

# 清理并创建目标目录
rm -rf ~/.n8n/custom/nodes/ContractCall
mkdir -p ~/.n8n/custom/nodes/ContractCall

# 复制文件
cp -r dist/nodes/ContractCall/* ~/.n8n/custom/nodes/ContractCall/
cp nodes/ContractCall/icon.svg ~/.n8n/custom/nodes/ContractCall/

echo "部署完成！正在重启 n8n 服务..."

# 查找 n8n 进程
N8N_PID=$(ps aux | grep '[n]8n' | awk '{print $2}')

if [ -n "$N8N_PID" ]; then
    echo "找到 n8n 进程 (PID: $N8N_PID)，正在重启..."
    kill $N8N_PID
    sleep 2
fi

# 启动 n8n
n8n start > /dev/null 2>&1 &
echo "n8n 服务已重启！" 