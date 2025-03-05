export const NETWORKS = [
  {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    rpc: "https://rpc.ankr.com/eth",
    quoterAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  },
  {
    id: "bnb-smart-chain",
    name: "BNB Chain",
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org/",
    quoterAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  },
  {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    rpc: "https://polygon-rpc.com/",
    quoterAddress: "0xa5E0829CaCEd8fFDD4De3c16d7a330CfbD2b7E5e",
  },
];

const getChainIdFromNetworkId = (networkId: string) => {
  const network = NETWORKS.find((n) => n.id === networkId);
  return network ? network.chainId : null;
};

const getTokensFromList = (list: any, networkId: string) => {
  const chainId = getChainIdFromNetworkId(networkId);
  if (!chainId) return [];

  let tokens = [];
  if (Array.isArray(list)) {
    tokens = list; // QuickSwap format
  } else if (list && list["tokens"]) {
    tokens = list["tokens"]; // Uniswap and PancakeSwap format
  }

  return tokens
    .filter((token: any) => token.chainId === chainId)
    .map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      network: networkId,
    }));
};

// Import token lists
import uniswapTokens from "./tokenLists/uniswap-default.tokenlist.json";
import bnbTokens from "./tokenLists/pancakeswap-extended.json";
// import polygonTokens from "./tokenLists/quickswap-default.tokenlist.json"; // Updated file

const allTokens = [
  ...getTokensFromList(uniswapTokens, "ethereum"),
  ...getTokensFromList(bnbTokens, "bnb-smart-chain"),
  //   ...getTokensFromList(polygonTokens, "polygon"),
];

export default allTokens;
