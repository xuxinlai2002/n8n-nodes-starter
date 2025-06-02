declare module 'ipfs-http-client-lite' {
	interface IPFSClient {
		add(data: Buffer): Promise<{ path: string }>;
	}

	interface IPFSClientOptions {
		host: string;
		port: number;
		protocol: string;
		headers?: Record<string, string>;
	}

	export function create(options: IPFSClientOptions): IPFSClient;
} 