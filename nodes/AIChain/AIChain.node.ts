// import { INodeType, INodeTypeDescription, NodeConnectionType, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import {
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IExecuteFunctions
} from 'n8n-workflow';


export class AIChain implements INodeType {

    
	description: INodeTypeDescription = {
        displayName: 'AI Chain',
        name: 'aiChain',
        icon: 'file:AIChain.svg',
        group: ['transform'],
        version: 1,
        description: 'Get data from AI Chain',
        defaults: {
            name: 'AI Chain',
        },
        // eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
        inputs: [{ type: NodeConnectionType.Main }],
        // eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
        outputs: [{ type: NodeConnectionType.Main }],
        credentials: [
            {
                name: 'aiChainApi',
                required: false,
            },
        ],

        requestDefaults: {
            baseURL: 'https://rpc.agtchain.net',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        },

		properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Contact',
                        value: 'contact',
                    },
                ],
                default: 'contact',
                noDataExpression: true,
                required: true,
                description: 'Create a new contact',
            },

            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: [
                            'contact',
                        ],
                    },
                },
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a contact',
                        action: 'Create a contact',
                    },
                ],
                default: 'create',
                noDataExpression: true,
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        operation: [
                            'create',
                        ],
                        resource: [
                            'contact',
                        ],
                    },
                },
                default:'',
                placeholder: 'name@email.com',
                description:'Primary email for the contact',
            },

            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        resource: [
                            'contact',
                        ],
                        operation: [
                            'create',
                        ],
                    },
                },
                options: [
                    {
                        displayName: 'First Name',
                        name: 'firstName',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Last Name',
                        name: 'lastName',
                        type: 'string',
                        default: '',
                    },
                ],
            },
		]
	};
	// 新增 execute 方法，所有请求都默认发起 eth_blockNumber 的 POST 请求
	async execute(this: IExecuteFunctions) {
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: 'https://rpc.agtchain.net',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 1,
			},
			json: true,
		});
		let blockHeight = 'N/A';
		if (response && response.result) {
			blockHeight = parseInt(response.result, 16).toString();
		}
		// 返回二维数组，且每个元素为 { json: { blockHeight } }
		return [
			[{ json: { blockHeight: blockHeight } }]
		];
	}
}