import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ContractCallApi implements ICredentialType {
    name = 'contractCallApi';
    displayName = 'Private Key';
    documentationUrl = 'https://docs.n8n.io/credentials/';
    properties: INodeProperties[] = [
        {
            displayName: 'Private Key',
            name: 'privateKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Your wallet private key',
            required: true,
        },
    ];
} 