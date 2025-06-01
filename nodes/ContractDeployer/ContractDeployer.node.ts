import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
	IExecuteFunctions,
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

function getSuggestParams(params: any[]): Record<string, string> | undefined {
	if (!params || params.length === 0) return undefined;
	const obj: Record<string, string> = {};
	for (const p of params) {
		obj[p.name] = '待输入';
	}
	return obj;
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
				displayName: 'Contract Name',
				name: 'contractName',
				type: 'options',
				options: [
					{ name: 'TestCall', value: 'TestCall' },
					{ name: 'KOLService', value: 'KOLService' },
				],
				default: 'TestCall',
				required: true,
				description: 'Contract to deploy',
			},
			{
				displayName: 'TestCall 合约参数',
				name: 'testCallParams',
				type: 'json',
				default: '[]',
				required: false,
				displayOptions: {
					show: {
						contractName: ['TestCall'],
					},
				},
				description: 'TestCall 合约参数，格式为数组或对象。如无参数可留空。',
			},
			{
				displayName: 'KOLService 合约参数',
				name: 'kolServiceParams',
				type: 'json',
				default: '{"_owner": "待输入"}',
				required: false,
				displayOptions: {
					show: {
						contractName: ['KOLService'],
					},
				},
				description: 'KOLService 合约参数，格式为对象，如 {"_owner": "0x..."}。',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const privateKey = this.getNodeParameter('privateKey', i) as string;
				const network = this.getNodeParameter('network', i) as string;
				const contractName = this.getNodeParameter('contractName', i) as string;

				let contractParamsRaw = '';
				if (contractName === 'TestCall') {
					contractParamsRaw = this.getNodeParameter('testCallParams', i) as string;
				} else if (contractName === 'KOLService') {
					contractParamsRaw = this.getNodeParameter('kolServiceParams', i) as string;
				} else {
					throw new NodeOperationError(this.getNode(), '请填写合约参数');
				}
				console.log('[n8n] 输入参数:', { privateKey, network, contractName, contractParamsRaw });

				let contractParams: any = contractParamsRaw;
				if (typeof contractParamsRaw === 'string') {
					try {
						contractParams = JSON.parse(contractParamsRaw);
					} catch (e) {
						console.error('[n8n] 合约参数JSON解析失败:', contractParamsRaw);
						throw new NodeOperationError(this.getNode(), '合约参数格式错误，请输入合法的JSON');
					}
				}

				// 读取链配置
				const chainConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../contract_temp/chains/config.json'), 'utf8'));
				const rpcUrl = chainConfig[network];
				console.log('[n8n] 链配置:', { rpcUrl });

				// 读取ABI
				const abi = getAbi(contractName);
				console.log('[n8n] ABI:', abi);

				const isUpgradeable = isUpgradeableAbi(abi);
				const params = isUpgradeable ? getInitializeInputs(abi) : getConstructorInputs(abi);
				const suggestParams = getSuggestParams(params);
				console.log('[n8n] ABI参数定义:', params);

				// 校验参数数量和类型
				let paramValues: any[] = [];
				if (params.length === 0) {
					paramValues = [];
					if (contractParams && ((Array.isArray(contractParams) && contractParams.length > 0) || (typeof contractParams === 'object' && Object.keys(contractParams).length > 0))) {
						console.error('[n8n] 不需要参数但用户填写了:', contractParams);
						throw new NodeOperationError(this.getNode(), `该合约不需要参数，请勿填写合约参数。建议模板: ${JSON.stringify(suggestParams)}`);
					}
				} else {
					if (Array.isArray(contractParams)) {
						if (contractParams.length !== params.length) {
							console.error('[n8n] 参数数量不匹配:', contractParams, params);
							throw new NodeOperationError(this.getNode(), `参数数量不匹配，ABI需要${params.length}个参数，实际输入${contractParams.length}个。建议模板: ${JSON.stringify(suggestParams)}`);
						}
						paramValues = contractParams;
					} else if (typeof contractParams === 'object' && contractParams !== null) {
						paramValues = params.map((p) => {
							if (!(p.name in contractParams)) {
								console.error('[n8n] 缺少参数:', p.name, contractParams);
								throw new NodeOperationError(this.getNode(), `缺少参数: ${p.name}。建议模板: ${JSON.stringify(suggestParams)}`);
							}
							return contractParams[p.name];
						});
					} else {
						console.error('[n8n] 参数格式错误:', contractParams);
						throw new NodeOperationError(this.getNode(), `合约参数格式错误，请输入数组或对象。建议模板: ${JSON.stringify(suggestParams)}`);
					}
				}

				// 创建provider和signer
				const provider = new ethers.JsonRpcProvider(rpcUrl);
				const wallet = new ethers.Wallet(privateKey, provider);
				console.log('[n8n] 钱包地址:', wallet.address);

				// 部署合约
				let contract;
				if (isUpgradeable) {
					console.log('[n8n] 开始部署可升级合约...');
					
					// 1. 部署实现合约
					const implementationFactory = new ethers.ContractFactory(abi, '0x', wallet);
					const implementation = await implementationFactory.deploy();
					await implementation.waitForDeployment();
					const implementationAddress = await implementation.getAddress();
					console.log('[n8n] 实现合约部署成功，地址:', implementationAddress);

					// 2. 部署代理合约
					const proxyFactory = new ethers.ContractFactory(
						[
							'constructor(address _implementation, bytes memory _data)',
							'function upgradeTo(address newImplementation)',
							'function upgradeToAndCall(address newImplementation, bytes memory data)',
						],
						'0x',
						wallet
					);
					
					// 3. 准备初始化数据
					const initializeData = implementation.interface.encodeFunctionData('initialize', paramValues);
					
					// 4. 部署代理合约
					const proxy = await proxyFactory.deploy(implementationAddress, initializeData);
					await proxy.waitForDeployment();
					const proxyAddress = await proxy.getAddress();
					console.log('[n8n] 代理合约部署成功，地址:', proxyAddress);

					// 5. 创建代理合约实例
					contract = new ethers.Contract(proxyAddress, abi, wallet);
					console.log('[n8n] 可升级合约部署完成');
				} else {
					console.log('[n8n] 部署参数:', paramValues);
					const factory = new ethers.ContractFactory(abi, '0x', wallet);
					contract = await factory.deploy(...paramValues);
					await contract.waitForDeployment();
					console.log('[n8n] 合约部署成功，地址:', await contract.getAddress());
				}

				returnData.push({
					json: {
						contractAddress: await contract.getAddress(),
						network,
						contractName,
						isUpgradeable,
						abiParams: params.map(p => ({ name: p.name, type: p.type })),
						inputParams: paramValues,
						suggestParams,
					},
				});
			} catch (error) {
				console.error('[n8n] 节点执行异常:', error);
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