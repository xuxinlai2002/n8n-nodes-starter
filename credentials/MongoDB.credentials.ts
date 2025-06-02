import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MongoDB implements ICredentialType {
    name = 'mongodb';
    displayName = 'MongoDB';
    documentationUrl = 'https://docs.n8n.io/credentials/mongodb';
    properties: INodeProperties[] = [
        {
            displayName: 'Connection URL',
            name: 'url',
            type: 'string',
            default: 'mongodb://localhost:27017',
            description: 'MongoDB connection URL',
            required: true,
        },
    ];
} 