import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AIChainAPI implements ICredentialType {
	name = 'aiChainApi';
	displayName = 'AI Chain API';
	documentationUrl = 'https://github.com/aichain-io/n8n-nodes-aichain'; // 你可以修改为你的文档链接
	properties: INodeProperties[] = [
		// 在这里添加你的凭证字段，例如 API密钥、URL等
		// 示例:
		// {
		// 	displayName: 'API Key',
		// 	name: 'apiKey',
		// 	type: 'string',
		// 	typeOptions: { password: true },
		// 	default: '',
		// },
	];
}
