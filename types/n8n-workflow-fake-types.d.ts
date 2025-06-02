// 解决 n8n-workflow 1.x 缺失类型问题

declare module '@n8n/config' {
  export type LogScope = string;
}

declare module '@/errors/error.types' {
  export type ErrorLevel = 'info' | 'warn' | 'warning' | 'error' | 'fatal';
  export interface ReportingOptions {
    tags?: string[];
    extra?: Record<string, any>;
  }
  export interface ErrorOptions {
    cause?: any;
    level?: ErrorLevel;
    tags?: string[];
    extra?: Record<string, any>;
  }
}

declare module 'n8n-workflow' {
  export * from '@/errors/error.types';
  
  export interface IWorkflowBase {
    id?: string;
    name: string;
    nodes: INode[];
    connections: IConnections;
    active: boolean;
    settings?: IWorkflowSettings;
    tags?: string[];
    triggerCount?: number;
    updatedAt?: string;
    versionId?: string;
  }

  export interface INode {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    parameters: INodeParameters;
    typeVersion?: number;
  }

  export interface IConnections {
    [key: string]: {
      main: Array<Array<{ node: string; type: string; index: number }>>;
    };
  }

  export interface IWorkflowSettings {
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
    saveDataErrorExecution?: 'all' | 'none';
    saveDataSuccessExecution?: 'all' | 'none';
    executionTimeout?: number;
    timezone?: string;
  }

  export interface INodeParameters {
    [key: string]: any;
  }

  // 添加缺失的类型定义
  export interface ICredentialType {
    name: string;
    displayName: string;
    documentationUrl?: string;
    properties: INodeProperties[];
  }

  export interface INodeProperties {
    displayName: string;
    name: string;
    type: string;
    default?: any;
    description?: string;
    displayOptions?: {
      show?: {
        [key: string]: any;
      };
      hide?: {
        [key: string]: any;
      };
    };
    options?: any[];
    noDataExpression?: boolean;
    required?: boolean;
    typeOptions?: {
      [key: string]: any;
    };
  }

  export interface INodeType {
    description: INodeTypeDescription;
    execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  }

  export interface INodeTypeDescription {
    displayName: string;
    name: string;
    group: string[];
    version: number;
    description: string;
    defaults?: {
        name: string;
    };
    inputs: (string | { type: NodeConnectionType })[];
    outputs: (string | { type: NodeConnectionType })[];
    credentials?: Array<{
        name: string;
        required: boolean;
    }>;
    properties: INodeProperties[];
  }

  export enum NodeConnectionType {
    Main = 'main',
  }

  export interface IExecuteFunctions {
    getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any;
    getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
    getWorkflowStaticData(type: string): IWorkflowDataProxyData;
    getWorkflowDataProxy(): IWorkflowDataProxyData;
    getMode(): string;
    getNode(): INode;
    getWorkflow(): IWorkflowBase;
    getTimezone(): string;
    getExecutionId(): string;
    getExecutionUrl(): string;
    getRestApiUrl(): string;
    getWebhookBaseUrl(): string;
    getWebhookUrl(): string;
    getWebhookDescription(): IWebhookDescription;
    getWebhookId(): string;
    getWebhookToken(): string;
    getInputData(): INodeExecutionData[];
  }

  export interface INodeExecutionData {
    json: { [key: string]: any };
    binary?: { [key: string]: IBinaryData };
  }

  export interface IBinaryData {
    data: string;
    mimeType: string;
    fileName?: string;
    directory?: string;
    id?: string;
  }

  export class NodeOperationError extends Error {
    constructor(node: INode | string, message: string, context?: any);
  }

  export interface ICredentialDataDecryptedObject {
    [key: string]: any;
  }

  export interface IWorkflowDataProxyData {
    [key: string]: any;
  }

  export interface IWebhookDescription {
    [key: string]: any;
  }

  export interface ILoadOptionsFunctions {
    getNodeParameter(name: string, itemIndex: number): any;
    // 可根据需要补充更多方法
  }
}

// 兼容 n8n-workflow 1.x 依赖的全局类型
type ErrorOptions = import('@/errors/error.types').ErrorOptions; 