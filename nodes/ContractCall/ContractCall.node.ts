import { INodeType, INodeTypeDescription, IExecuteFunctions, INodeExecutionData, ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import { MongoClient } from 'mongodb';
import axios from 'axios';

interface Contract {
    contract_name: string;
    contract_address: string;
    abi_ipfs: string;
    contract_ipfs: string;
    deployer: string;
    create_timestamp: number;
    tx_hash: string;
}

interface ContractCallRecord {
    contract_name: string;
    function_name: string;
    parameters: any;
    caller_address: string;
    tx_hash: string;
    create_timestamp: number;
}

export default class ContractCall implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Contract Call',
        name: 'contractCall',
        // @ts-ignore
        icon: 'file:contractCall.svg',
        description: '调用智能合约的节点',
        group: ['transform'],
        version: 1,
        defaults: { name: 'Contract Call' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Private Key',
                name: 'privateKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                description: '用于合约调用的钱包私钥（请妥善保管）',
            },
            {
                displayName: 'Chain',
                name: 'chain',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadChains' },
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
            },
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                default: '',
                description: '输入关键字搜索合约',
            },
            {
                displayName: 'Contract Name',
                name: 'contractName',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadContractNames' },
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
            },
            {
                displayName: 'Function Name',
                name: 'functionName',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadFunctionNames' },
                // @ts-ignore
                dependsOn: ['contractName'],
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
            },
            {
                displayName: 'Parameters',
                name: 'parameters',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '{}',
                description: '输入函数参数，JSON格式',
            },
        ],
    };

    methods = {
        loadOptions: {
            async loadContractNames(this: ILoadOptionsFunctions) {
                console.log('==== loadContractNames called ====');
                const prompt = this.getNodeParameter('prompt', 0) as string;
                
                const client = new MongoClient('mongodb://localhost:10001');
                await client.connect();
                
                const db = client.db('contract_deployer');
                const collection = db.collection('contracts');
                
                // 构建查询条件
                const query: any = {};
                if (prompt) {
                    query.contract_name = { $regex: prompt, $options: 'i' };
                }
                
                // 按时间戳排序并去重
                const contracts = await collection
                    .aggregate([
                        { $match: query },
                        { $sort: { create_timestamp: -1 } },
                        {
                            $group: {
                                _id: '$contract_name',
                                doc: { $first: '$$ROOT' }
                            }
                        },
                        { $replaceRoot: { newRoot: '$doc' } }
                    ])
                    .toArray();
                console.log('loadContractNames result:', contracts);
                
                await client.close();
                
                return contracts.map(contract => ({
                    name: contract.contract_name,
                    value: contract.contract_name,
                }));
            },

            async loadFunctionNames(this: ILoadOptionsFunctions) {
                console.log('==== FunctionName called ====');
                const contractName = this.getNodeParameter('contractName', 0) as string;
                console.log('FunctionName: contractName =', contractName);

                const client = new MongoClient('mongodb://localhost:10001');
                await client.connect();

                const db = client.db('contract_deployer');
                const collection = db.collection('contracts');

                let contracts;
                if (contractName) {
                    contracts = await collection.find({ contract_name: contractName }).toArray();
                } else {
                    contracts = await collection.find({}).toArray();
                }
                console.log('FunctionName: contracts =', contracts);

                let allFunctions: any[] = [];
                for (const contract of contracts) {
                    const gateways = [
                        contract.abi_ipfs,
                        contract.abi_ipfs.replace('ipfs.io', 'dweb.link'),
                        contract.abi_ipfs.replace('ipfs.io', 'cf-ipfs.com'),
                    ];
                    let abi;
                    for (const url of gateways) {
                        try {
                            console.log('Trying ABI url:', url);
                            const response = await axios.get(url, {
                                timeout: 5000,
                                headers: {
                                    'User-Agent': 'curl/7.68.0',
                                    'Accept': '*/*',
                                },
                            });
                            if (typeof response.data === 'string') {
                                try {
                                    abi = JSON.parse(response.data);
                                } catch (e) {
                                    console.error('Not a valid ABI JSON, skip:', url);
                                    continue;
                                }
                            } else {
                                abi = response.data;
                            }
                            break;
                        } catch (error) {
                            console.error('Error loading ABI for contract', contract.contract_name, url, (error as any).message);
                        }
                    }
                    if (!abi) continue;
                    const functions = abi
                        .filter((item: any) => item.type === 'function')
                        .map((item: any) => ({
                            name: `${contract.contract_name}: ${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`,
                            value: `${contract.contract_name}::${item.name}`,
                            description: item.inputs.map((input: any) => `${input.name}: ${input.type}`).join(', '),
                        }));
                    allFunctions = allFunctions.concat(functions);
                }
                // 去重
                const uniqueFunctions = Array.from(new Map(allFunctions.map(f => [f.value, f])).values());
                console.log('FunctionName: allFunctions =', uniqueFunctions);
                await client.close();
                return uniqueFunctions;
            },

            async loadChains(this: ILoadOptionsFunctions) {
                const fs = require('fs');
                const path = require('path');
                // 优先 custom 目录下的 config.json
                let configPath = path.join(__dirname, 'chains', 'config.json');
                if (!fs.existsSync(configPath)) {
                    // fallback 到源码目录
                    configPath = path.join(process.cwd(), 'nodes', 'ContractCall', 'chains', 'config.json');
                }
                const chains = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                return Object.keys(chains).map((key: string) => ({ name: key, value: key }));
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const contractName = this.getNodeParameter('contractName', 0) as string;
        const functionName = this.getNodeParameter('functionName', 0) as string;
        const parameters = JSON.parse(this.getNodeParameter('parameters', 0) as string);
        const privateKey = this.getNodeParameter('privateKey', 0) as string;
        const chainKey = this.getNodeParameter('chain', 0) as string;
        // 获取链配置
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, 'chains', 'config.json');
        const chains = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const rpcUrl = chains[chainKey];
        if (!rpcUrl) throw new NodeOperationError(this.getNode(), '未找到链配置');
        // 获取合约信息
        const client = new MongoClient('mongodb://localhost:10001');
        await client.connect();
        const db = client.db('contract_deployer');
        const contractsCollection = db.collection('contracts');
        const callsCollection = db.collection('calls');
        // 获取最新的合约记录
        const contract = await contractsCollection
            .findOne(
                { contract_name: contractName },
                { sort: { create_timestamp: -1 } }
            );
        if (!contract) {
            throw new NodeOperationError(this.getNode(), `Contract ${contractName} not found`);
        }
        // 获取 ABI
        let abi;
        try {
            const response = await axios.get(contract.abi_ipfs, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'curl/7.68.0',
                    'Accept': '*/*',
                },
            });
            abi = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            console.log('ABI loaded:', abi);
        } catch (e) {
            throw new NodeOperationError(this.getNode(), `ABI 加载失败: ${e instanceof Error ? e.message : String(e)}`);
        }
        // 使用 ethers.js 调用合约
        const { ethers } = require('ethers');
        
        // 验证 RPC 连接
        let provider;
        let retryCount = 0;
        const maxRetries = 3;
        
        // 获取 RPC 配置
        let rpcConfigPath = path.join(__dirname, 'chains', 'config.json');
        if (!fs.existsSync(rpcConfigPath)) {
            rpcConfigPath = path.join(process.cwd(), 'nodes', 'ContractCall', 'chains', 'config.json');
        }
        const rpcConfig = JSON.parse(fs.readFileSync(rpcConfigPath, 'utf-8'));
        
        // 使用 Base Sepolia RPC
        const baseSepoliaRpc = rpcConfig.baseSepolia;
        console.log('Using Base Sepolia RPC:', baseSepoliaRpc);
        
        // 创建钱包
        const wallet = new ethers.Wallet(privateKey);
        
        while (retryCount < maxRetries) {
            try {
                console.log(`尝试连接 RPC (第 ${retryCount + 1} 次)...`);
                provider = new ethers.JsonRpcProvider(baseSepoliaRpc);
                
                // 连接钱包到 provider
                wallet.connect(provider);
                
                // 测试 RPC 连接
                const blockNumber = await provider.getBlockNumber();
                console.log('RPC 连接成功，当前区块:', blockNumber);
                
                // 获取网络信息
                const network = await provider.getNetwork();
                console.log('网络信息:', {
                    chainId: network.chainId,
                    name: network.name
                });
                
                // 检查合约代码
                const code = await provider.getCode(contract.contract_address);
                console.log('Contract code length:', code.length);
                console.log('Contract code preview:', code.slice(0, 66) + '...');
                
                if (code === '0x') {
                    // 尝试获取区块信息，确认 RPC 连接正常
                    const blockNumber = await provider.getBlockNumber();
                    console.log('Current block number:', blockNumber);
                    
                    // 尝试获取钱包余额，确认 RPC 连接正常
                    const balance = await provider.getBalance(wallet.address);
                    console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');
                    
                    // 尝试获取合约创建区块
                    const tx = await provider.getTransaction(contract.tx_hash);
                    if (tx) {
                        console.log('Contract creation block:', tx.blockNumber);
                        console.log('Contract creation timestamp:', tx.timestamp);
                    }
                    
                    throw new NodeOperationError(this.getNode(), `合约地址 ${contract.contract_address} 不存在或未部署。\n当前区块: ${blockNumber}\n钱包余额: ${ethers.formatEther(balance)} ETH\n合约创建区块: ${tx?.blockNumber}\n合约创建时间: ${tx?.timestamp}`);
                }
                
                break;
            } catch (e: any) {
                console.error(`RPC 连接失败 (第 ${retryCount + 1} 次):`, e.message);
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new NodeOperationError(this.getNode(), `RPC 连接失败: ${e.message}\nRPC URL: ${baseSepoliaRpc}`);
                }
                // 等待 1 秒后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('Contract address:', contract.contract_address);
        console.log('RPC URL:', provider.connection.url);
        console.log('Wallet address:', wallet.address);
        console.log('ABI:', JSON.stringify(abi, null, 2));
        
        const contractInstance = new ethers.Contract(contract.contract_address, abi, wallet);

        // 解析函数名
        const [, actualFunctionName] = functionName.split('::');
        if (!actualFunctionName) {
            throw new NodeOperationError(this.getNode(), '函数名格式错误，应为 "ContractName::FunctionName"');
        }

        console.log('Function name:', actualFunctionName);
        console.log('Raw parameters:', parameters);
        
        // 检查函数是否存在
        if (!contractInstance[actualFunctionName]) {
            console.log('Available functions:', Object.keys(contractInstance.functions));
            throw new NodeOperationError(this.getNode(), `函数 ${actualFunctionName} 不存在于合约中`);
        }

        // 获取函数签名
        const functionFragment = contractInstance.interface.getFunction(actualFunctionName);
        console.log('Function fragment:', functionFragment);
        console.log('Function inputs:', functionFragment.inputs);

        let txHash = '';
        let callResult = null;
        let args: any[] = [];
        try {
            // 确保参数格式正确
            if (typeof parameters === 'string') {
                try {
                    args = JSON.parse(parameters);
                } catch (e) {
                    args = [parameters];
                }
            } else if (Array.isArray(parameters)) {
                args = parameters;
            } else if (typeof parameters === 'object') {
                args = Object.values(parameters);
            } else {
                args = [parameters];
            }

            // 验证参数类型
            const expectedTypes = functionFragment.inputs.map((input: { type: string }) => input.type);
            console.log('Expected parameter types:', expectedTypes);
            console.log('Actual arguments:', args);

            // 尝试编码参数
            try {
                const encodedData = contractInstance.interface.encodeFunctionData(actualFunctionName, args);
                console.log('Encoded function data:', encodedData);
            } catch (e: any) {
                console.error('Parameter encoding error:', e);
                throw new NodeOperationError(this.getNode(), `参数编码失败: ${e.message}`);
            }

            console.log('Processed arguments:', args);
            
            // 先尝试调用
            console.log('Calling contract function...');
            const tx = await contractInstance[actualFunctionName](...args);
            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            txHash = receipt.transactionHash;
            callResult = receipt;
            console.log('Transaction confirmed:', txHash);
            console.log('Transaction receipt:', receipt);
        } catch (e: any) {
            console.error('Contract call error:', e);
            if (e.code === 'BAD_DATA') {
                // 尝试获取更多合约信息
                try {
                    const contractCode = await provider.getCode(contract.contract_address);
                    console.log('Contract bytecode:', contractCode.slice(0, 66) + '...');
                    
                    // 尝试获取合约的所有函数
                    const allFunctions = contractInstance.interface.fragments
                        .filter((f: any) => f.type === 'function')
                        .map((f: any) => ({
                            name: f.name,
                            inputs: f.inputs,
                            outputs: f.outputs,
                        }));
                    console.log('All contract functions:', allFunctions);
                } catch (debugError) {
                    console.error('Debug info error:', debugError);
                }
                
                throw new NodeOperationError(this.getNode(), `合约调用失败: 参数格式错误或合约地址不正确。\n函数: ${actualFunctionName}\n参数: ${JSON.stringify(args)}\n错误: ${e.message}\n合约地址: ${contract.contract_address}`);
            }
            throw new NodeOperationError(this.getNode(), `合约调用失败: ${e instanceof Error ? e.message : String(e)}`);
        }
        // 记录调用信息
        const call: ContractCallRecord = {
            contract_name: contractName,
            function_name: functionName,
            parameters,
            caller_address: wallet.address,
            tx_hash: txHash,
            create_timestamp: Date.now(),
        };
        await callsCollection.insertOne(call);
        await client.close();
        return [[{ json: { 
            success: true,
            contractName,
            functionName,
            parameters,
            txHash,
            callResult,
        } }]];
    }
}

// 兼容 n8n loader
// @ts-ignore
module.exports = ContractCall;
// @ts-ignore
module.exports.ContractCall = ContractCall; 