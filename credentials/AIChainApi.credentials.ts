import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AIChainApi implements ICredentialType {
	name = 'aiChainApi';
	displayName = 'AI Chain API';
	documentationUrl = 'https://docs.n8n.io/credentials/aiChainApi';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}

export default AIChainApi;
