export const config = {
    // IPFS配置
    ipfs: {
        gateway: 'https://ipfs.infura.io:5001/api/v0',
        projectId: '7e31d49d7c8a48f4a4539aff9da768e7',
        projectSecret: '4a5e4e0d4afd48a1a62036c88c07f14a',
    },
    
    // MongoDB配置
    mongodb: {
        url: 'mongodb://localhost:10001',
        dbName: 'contracts',
        collectionName: 'contracts',
    }
}; 