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
                displayName: 'Test Option Name or ID',
                name: 'testOption',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'loadOptionsTest' },
                default: '',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
            },
        ],
    };

    methods = {
        loadOptions: {
            async loadOptionsTest(this: ILoadOptionsFunctions) {
                return [
                    { name: 'A', value: 'a' },
                    { name: 'B', value: 'b' },
                ];
            }
        }
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return [[{ json: { ok: true } }]];
    }
}
// 兼容 n8n loader
// @ts-ignore
module.exports = ContractCall;
// @ts-ignore
module.exports.ContractCall = ContractCall; 