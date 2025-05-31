// import { INodeType, INodeTypeDescription, NodeConnectionType, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import {
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import * as fs from 'fs';


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
				displayName: 'Config Path',
				name: 'configPath',
				type: 'string',
				required: true,
				default: '',
				description: 'Path to config.json file',
			},
			{
				displayName: 'ABI Path',
				name: 'abiPath',
				type: 'string',
				required: true,
				default: '',
				description: 'Path to abi.json file',
			},
			{
				displayName: 'Private Key',
				name: 'privateKey',
				type: 'string',
				required: true,
				default: '',
				description: 'Private key for signing the transaction',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				required: true,
				default: '',
				description: 'Key for the writeData function',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				required: true,
				default: '',
				description: 'Value for the writeData function',
			},
		]
	};
	// 新增 execute 方法，读取配置文件并调用合约函数
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// 读取 config/config.json 获取合约地址和 RPC
		const configPath = this.getNodeParameter('configPath', 0) as string;
		const abiPath = this.getNodeParameter('abiPath', 0) as string;

		// 使用 fs 模块读取文件
		const configContent = fs.readFileSync(configPath, 'utf8');
		const abiContent = fs.readFileSync(abiPath, 'utf8');

		const config = JSON.parse(configContent);
		const abi = JSON.parse(abiContent);

		const contractAddress = config.contractAddress;
		const rpcUrl = config.rpcUrl;

		// 获取用户输入的参数
		const privateKey = this.getNodeParameter('privateKey', 0) as string;
		const key = this.getNodeParameter('key', 0) as string;
		const value = this.getNodeParameter('value', 0) as string;

		// 调用合约函数 writeData
		const ethers = require('ethers');
		const provider = new ethers.JsonRpcProvider(rpcUrl);
		const wallet = new ethers.Wallet(privateKey, provider);
		const contract = new ethers.Contract(contractAddress, abi, wallet);
		const tx = await contract.writeData(key, value);
		const receipt = await tx.wait();

		// 返回交易结果
		return [
			[{ json: { transactionHash: receipt.hash } }]
		];
	}
}