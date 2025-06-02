import { INodeType, INodeTypeDescription, IExecuteFunctions, INodeExecutionData, ILoadOptionsFunctions } from 'n8n-workflow';

export default class ContractCall implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Contract Call',
        name: 'contractCall',
        description: 'Test minimal custom node',
        group: ['transform'],
        version: 1,
        defaults: { name: 'Contract Call' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Test Option',
                name: 'testOption',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadOptionsTest' },
                default: '',
                description: 'Test dropdown',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return [[{ json: { ok: true } }]];
    }

    static async loadOptionsTest(this: ILoadOptionsFunctions) {
        return [
            { name: 'A', value: 'a' },
            { name: 'B', value: 'b' },
        ];
    }
}
// 兼容 n8n loader
// @ts-ignore
module.exports = ContractCall;
// @ts-ignore
module.exports.ContractCall = ContractCall; 