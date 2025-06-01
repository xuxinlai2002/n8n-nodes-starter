# n8n 智能合约部署节点安装指南

本文档将指导您如何安装和配置智能合约部署节点。

## 前置要求

- Node.js (v16 或更高版本)
- npm (v7 或更高版本)
- n8n 已安装并运行

## 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/aichain-io/n8n-nodes-aichain.git
cd n8n-nodes-aichain
```

2. 安装依赖：
```bash
# 安装所有依赖
npm install

# 如果遇到依赖问题，可以尝试清除缓存后重新安装
npm cache clean --force
rm -rf node_modules
npm install
```

3. 构建节点：
```bash
npm run build
```

4. 将构建好的节点复制到n8n的custom nodes目录：
```bash
# 如果n8n是全局安装的
cp -r dist ~/.n8n/custom/

# 如果n8n是本地安装的
cp -r dist ./n8n/custom/
```

5. 重启n8n服务：
```bash
# 如果使用n8n命令行
n8n restart

# 如果使用Docker
docker restart n8n
```

## 使用方法

1. 在n8n工作流中添加"Contract Deployer"节点：
   - 点击"+"按钮添加新节点
   - 在搜索框中输入"Contract Deployer"
   - 选择"Contract Deployer"节点

2. 在节点配置界面中设置参数：
   - Private Key：输入部署账户的私钥
   - Network：从下拉菜单选择目标链（Aichain、Base Sepolia、Base）
   - Contract Type：从下拉菜单选择要部署的合约（TestCall、KOLService）
   - Is Upgradeable：切换开关选择是否可升级
   - Constructor Parameters：在JSON编辑器中输入构造函数参数

3. 参数说明：
   - Private Key：用于部署合约的账户私钥，请确保安全存储
   - Network：选择要部署到的区块链网络
   - Contract Type：选择要部署的合约类型
   - Is Upgradeable：选择合约是否可升级
   - Constructor Parameters：合约构造函数参数，格式为JSON数组

## 注意事项

1. 私钥安全
   - 请确保私钥安全存储
   - 建议使用环境变量或n8n的凭证管理功能存储私钥
   - 不要将私钥直接硬编码在工作流中

2. Gas费用
   - 部署前确保账户有足够的gas费用
   - 不同网络的gas费用可能不同

3. 合约部署
   - 普通合约部署已实现
   - 可升级合约部署功能待实现
   - 部署前请确认合约ABI和构造函数参数正确

## 故障排除

1. 如果节点未显示在n8n中：
   - 检查custom目录路径是否正确
   - 确认构建是否成功
   - 检查n8n日志是否有错误

2. 如果部署失败：
   - 检查私钥是否正确
   - 确认账户余额是否充足
   - 验证网络连接是否正常
   - 检查构造函数参数格式是否正确

3. 如果遇到依赖问题：
   - 确保Node.js版本正确（v16或更高）
   - 尝试清除npm缓存并重新安装依赖
   - 检查package.json中的依赖版本是否正确

## 开发说明

1. 开发模式：
```bash
npm run dev
```

2. 代码格式化：
```bash
npm run format
```

3. 代码检查：
```bash
npm run lint
```

## 支持

如有问题，请提交Issue或联系：
- Email: support@aichain.io
- GitHub: https://github.com/aichain-io/n8n-nodes-aichain 