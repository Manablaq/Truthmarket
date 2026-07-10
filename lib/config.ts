export const TRUTHMARKET_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS?.trim() ?? "";

export const BRADBURY_CHAIN_ID = 4221;
export const BRADBURY_RPC = "https://rpc-bradbury.genlayer.com";
export const BRADBURY_EXPLORER = "https://explorer-bradbury.genlayer.com";

export function isContractConfigured() {
  return /^0x[a-fA-F0-9]{40}$/.test(TRUTHMARKET_CONTRACT_ADDRESS);
}

export const bradburyChain = {
  id: BRADBURY_CHAIN_ID,
  name: "GenLayer Bradbury",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [BRADBURY_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "GenExplorer",
      url: BRADBURY_EXPLORER,
    },
  },
} as const;
