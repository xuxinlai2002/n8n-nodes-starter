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
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                default: '',
                description: '输入关键字搜索合约',
            },
            {
                displayName: 'Contract Name or ID',
                name: 'contractName',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadContractNames' },
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
            },
            {
                displayName: 'Function Name or ID',
                name: 'functionName',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadFunctionNames' },
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
                
                await client.close();
                
                return contracts.map(contract => ({
                    name: contract.contract_name,
                    value: contract.contract_name,
                }));
            },

            async loadFunctionNames(this: ILoadOptionsFunctions) {
                const contractName = this.getNodeParameter('contractName', 0) as string;
                if (!contractName) return [];
                
                const client = new MongoClient('mongodb://localhost:10001');
                await client.connect();
                
                const db = client.db('contract_deployer');
                const collection = db.collection('contracts');
                
                // 获取最新的合约记录
                const contract = await collection
                    .findOne(
                        { contract_name: contractName },
                        { sort: { create_timestamp: -1 } }
                    );
                
                if (!contract) return [];
                
                try {
                    // 从 IPFS 获取合约 ABI
                    const response = await axios.get(contract.contract_ipfs);
                    const abi = response.data;
                    
                    await client.close();
                    
                    // 过滤出可调用的函数
                    return abi
                        .filter((item: any) => 
                            item.type === 'function' && 
                            item.stateMutability !== 'view' &&
                            !item.name.startsWith('_') // 排除内部函数
                        )
                        .map((item: any) => ({
                            name: `${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`,
                            value: item.name,
                            description: item.inputs.map((input: any) => `${input.name}: ${input.type}`).join(', '),
                        }));
                } catch (error) {
                    console.error('Error loading ABI:', error);
                    await client.close();
                    return [];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const contractName = this.getNodeParameter('contractName', 0) as string;
        const functionName = this.getNodeParameter('functionName', 0) as string;
        const parameters = JSON.parse(this.getNodeParameter('parameters', 0) as string);
        
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
        
        // TODO: 这里需要实现实际的合约调用逻辑
        // 1. 从 IPFS 获取合约 ABI
        // 2. 使用 ethers.js 调用合约
        // 3. 获取交易哈希
        
        // 模拟交易哈希
        const txHash = '0x' + Math.random().toString(16).slice(2);
        
        // 记录调用信息
        const call: ContractCallRecord = {
            contract_name: contractName,
            function_name: functionName,
            parameters,
            caller_address: '0x' + Math.random().toString(16).slice(2), // TODO: 获取实际调用者地址
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
        } }]];
    }
}

// 兼容 n8n loader
// @ts-ignore
module.exports = ContractCall;
// @ts-ignore
module.exports.ContractCall = ContractCall; 