import { INodeType, INodeTypeDescription, NodeConnectionType, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

export class AIChain implements INodeType {
	description: INodeTypeDescription = {
        displayName: 'AI Chain',
        name: 'aiChain',
        icon: 'file:AIChain.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
                "displayName": "区块高度工具",
                "name": "blockHeightUtil",
                "type": "collection",
                "default": {},
                "placeholder": "添加项",
                "description": "用于获取和显示当前区块高度的工具。",
                "options": [
                    {
                        "displayName": "操作",
                        "name": "getBlockHeightButton",
                        "type": "options",
                        "noDataExpression": true,
                        "default": "fetch",
                        "typeOptions": {
                            "loadOptionsMethod": "getBlockHeightAndUpdateDisplay"
                        },
                        "options": [
                            {
                                "name": "获取当前区块高度",
                                "value": "fetch"
                            }
                        ],
                        "description": "点击以从 rpc.agtchain.net 获取当前区块高度。"
                    },
                    {
                        "displayName": "当前区块高度",
                        "name": "currentBlockHeightDisplay",
                        "type": "string",
                        "default": "N/A",
                        "description": "显示获取到的区块高度。由 '获取当前区块高度' 按钮更新。"
                    }
                ]
            }
		]
	};

	// 新增方法：用于 loadOptionsMethod
	async getBlockHeightAndUpdateDisplay(this: ILoadOptionsFunctions) {
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
		return [
			{
				name: blockHeight,
				value: blockHeight,
			},
		];
	}

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