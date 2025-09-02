export interface NetworkConfig {
  name: string;
  chainId: number;
  networkId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  explorerUrl?: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  pi: {
    name: 'Pi Network',
    chainId: 1,
    networkId: 1,
    nativeCurrency: {
      name: 'Pi',
      symbol: 'PI',
      decimals: 18
    },
    rpcUrls: ['https://api.pi.network'],
    explorerUrl: 'https://explorer.pi.network'
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    networkId: 1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    explorerUrl: 'https://etherscan.io'
  },
  filecoin: {
    name: 'Filecoin',
    chainId: 314,
    networkId: 314,
    nativeCurrency: {
      name: 'Filecoin',
      symbol: 'FIL',
      decimals: 18
    },
    rpcUrls: ['https://api.filecoin.io'],
    explorerUrl: 'https://filscan.io'
  }
};
