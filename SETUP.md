# 环境设置说明

## MongoDB Docker 设置

使用以下命令启动 MongoDB 容器：

```bash
docker run -d \
  --name mongodb \
  -p 10001:27017 \
  -v /Users/xuxinlai/goo/ai-agent/n8n-nodes-starter/db:/data/db \
  mongo:latest
```

这个命令会：
- 在后台运行 MongoDB 容器
- 将容器的 27017 端口映射到主机的 10001 端口
- 将容器内的 /data/db 目录映射到主机的 /Users/xuxinlai/goo/ai-agent/n8n-nodes-starter/db 目录，实现数据持久化
- 使用 mongo:latest 镜像 