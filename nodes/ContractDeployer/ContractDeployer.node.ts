import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

function getAbi(contractType: string): any[] {
	const abiPath = path.join(__dirname, `../../../contract_temp/abi/${contractType}.json`);
	return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
}

function isUpgradeableAbi(abi: any[]): boolean {
	return abi.some((item) => item.type === 'function' && item.name === 'initialize');
}

function getConstructorInputs(abi: any[]): any[] {
	const ctor = abi.find((item) => item.type === 'constructor');
	return ctor?.inputs || [];
}

function getInitializeInputs(abi: any[]): any[] {
	const init = abi.find((item) => item.type === 'function' && item.name === 'initialize');
	return init?.inputs || [];
}

export class ContractDeployer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contract Deployer',
		name: 'contractDeployer',
		icon: 'file:contract.svg',
		group: ['blockchain'],
		version: 1,
		description: 'Deploy smart contracts to blockchain',
		defaults: {
			name: 'Contract Deployer',
		},
		inputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Main',
			},
		],
		outputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Main',
			},
		],
		properties: [
			{
				displayName: 'Private Key',
				name: 'privateKey',
				type: 'string',
				default: '',
				required: true,
				description: 'Private key for contract deployment',
			},
			{
				displayName: 'Network',
				name: 'network',
				type: 'options',
				options: [
					{
						name: 'Aichain',
						value: 'aichain',
					},
					{
						name: 'Base Sepolia',
						value: 'baseSepolia',
					},
					{
						name: 'Base',
						value: 'base',
					},
				],
				default: 'baseSepolia',
				required: true,
				description: 'Target blockchain network',
			},
			{
				displayName: 'Contract Type',
				name: 'contractType',
				type: 'options',
				options: [
					{
						name: 'TestCall',
						value: 'TestCall',
					},
					{
						name: 'KOLService',
						value: 'KOLService',
					},
				],
				default: 'TestCall',
				required: true,
				description: 'Contract to deploy',
			},
			{
				displayName: 'Is Upgradeable',
				name: 'isUpgradeable',
				type: 'boolean',
				default: false,
				required: true,
				description: 'Whether the contract is upgradeable',
				noDataExpression: true,
				// 只读，自动判断
				readOnly: true,
				loadOptionsMethod: 'getIsUpgradeable',
			},
			{
				displayName: '合约参数',
				name: 'contractParams',
				type: 'collection',
				placeholder: 'Add Parameter',
				default: {},
				options: [], // 动态生成
				loadOptionsMethod: 'getContractParams',
				displayOptions: {
					show: {
						contractType: ['TestCall', 'KOLService'],
					},
				},
			},
		],
		// 动态加载方法
		loadOptions: {
			async getIsUpgradeable(this: ILoadOptionsFunctions) {
				const contractType = this.getCurrentNodeParameter('contractType') as string;
				const abi = getAbi(contractType);
				return [{
					name: isUpgradeableAbi(abi) ? 'true' : 'false',
					value: isUpgradeableAbi(abi),
				}];
			},
			async getContractParams(this: ILoadOptionsFunctions) {
				const contractType = this.getCurrentNodeParameter('contractType') as string;
				const abi = getAbi(contractType);
				const isUp = isUpgradeableAbi(abi);
				const params = isUp ? getInitializeInputs(abi) : getConstructorInputs(abi);
				return params.map((p) => ({
					displayName: `${p.name} (${p.type})`,
					name: p.name,
					type: 'string',
					default: '',
					description: p.type,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const privateKey = this.getNodeParameter('privateKey', i) as string;
				const network = this.getNodeParameter('network', i) as string;
				const contractType = this.getNodeParameter('contractType', i) as string;
				const contractParams = this.getNodeParameter('contractParams', i) as Record<string, any>;

				// 读取链配置
				const chainConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../contract_temp/chains/config.json'), 'utf8'));
				const rpcUrl = chainConfig[network];

				// 读取ABI
				const abi = getAbi(contractType);
				const isUpgradeable = isUpgradeableAbi(abi);
				const params = isUpgradeable ? getInitializeInputs(abi) : getConstructorInputs(abi);
				const paramValues = params.map((p) => contractParams[p.name]);

				// 创建provider和signer
				const provider = new ethers.JsonRpcProvider(rpcUrl);
				const wallet = new ethers.Wallet(privateKey, provider);

				// 部署合约
				let contract;
				if (isUpgradeable) {
					// 这里需要实现可升级合约的部署逻辑
					throw new NodeOperationError(this.getNode(), 'Upgradeable contract deployment not implemented yet');
				} else {
					// 部署普通合约
					const factory = new ethers.ContractFactory(abi, '0x', wallet);
					contract = await factory.deploy(...paramValues);
					await contract.waitForDeployment();
				}

				returnData.push({
					json: {
						contractAddress: await contract.getAddress(),
						network,
						contractType,
						isUpgradeable,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
} 