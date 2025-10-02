// 类型声明文件，解决 Hardhat + Viem 的类型问题

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: {
      getWalletClients(): Promise<any[]>;
      getPublicClient(): Promise<any>;
      deployContract(name: string, args?: any[]): Promise<any>;
      getContractAt(name: string, address: string): Promise<any>;
    };
  }
  
  interface Network {
    name: string;
  }
}

export {};
