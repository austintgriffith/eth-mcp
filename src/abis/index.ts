/**
 * Bundled ABIs for common external contracts
 * 
 * These cover the most common use cases for Scaffold-ETH projects:
 * - ERC20 tokens (USDC, DAI, WETH, etc.)
 * - ERC721 NFTs
 * - ERC4626 vaults
 * - Aave V3 lending
 * - Uniswap V2/V3 swaps
 */

import { ERC20_ABI } from "./erc20.js";
import { ERC721_ABI } from "./erc721.js";
import { ERC4626_ABI } from "./erc4626.js";
import { AAVE_V3_POOL_ABI, AAVE_V3_POOL_DATA_PROVIDER_ABI } from "./aave.js";
import { UNISWAP_V3_ROUTER_ABI, UNISWAP_V3_QUOTER_ABI, UNISWAP_V2_ROUTER_ABI } from "./uniswap.js";

// Re-export individual ABIs
export { ERC20_ABI } from "./erc20.js";
export { ERC721_ABI } from "./erc721.js";
export { ERC4626_ABI } from "./erc4626.js";
export { AAVE_V3_POOL_ABI, AAVE_V3_POOL_DATA_PROVIDER_ABI } from "./aave.js";
export { UNISWAP_V3_ROUTER_ABI, UNISWAP_V3_QUOTER_ABI, UNISWAP_V2_ROUTER_ABI } from "./uniswap.js";

/**
 * Contract type to ABI mapping
 */
export type ContractType =
  | "ERC20"
  | "ERC721"
  | "ERC4626"
  | "AaveV3Pool"
  | "AaveV3PoolDataProvider"
  | "UniswapV3Router"
  | "UniswapV3Quoter"
  | "UniswapV2Router";

/**
 * Get ABI by contract type
 */
export function getAbiByType(type: ContractType): readonly unknown[] | null {
  switch (type) {
    case "ERC20":
      return ERC20_ABI;
    case "ERC721":
      return ERC721_ABI;
    case "ERC4626":
      return ERC4626_ABI;
    case "AaveV3Pool":
      return AAVE_V3_POOL_ABI;
    case "AaveV3PoolDataProvider":
      return AAVE_V3_POOL_DATA_PROVIDER_ABI;
    case "UniswapV3Router":
      return UNISWAP_V3_ROUTER_ABI;
    case "UniswapV3Quoter":
      return UNISWAP_V3_QUOTER_ABI;
    case "UniswapV2Router":
      return UNISWAP_V2_ROUTER_ABI;
    default:
      return null;
  }
}

/**
 * All available contract types with descriptions
 */
export const CONTRACT_TYPES: Record<ContractType, string> = {
  ERC20: "Standard ERC20 token (USDC, DAI, WETH, etc.)",
  ERC721: "Standard ERC721 NFT",
  ERC4626: "ERC4626 tokenized vault",
  AaveV3Pool: "Aave V3 lending pool (supply, borrow, withdraw, repay)",
  AaveV3PoolDataProvider: "Aave V3 data provider (reserve and user data)",
  UniswapV3Router: "Uniswap V3 swap router",
  UniswapV3Quoter: "Uniswap V3 quoter (get swap quotes)",
  UniswapV2Router: "Uniswap V2 style router (also Sushi, Quick, etc.)",
};

/**
 * List all available contract types
 */
export function listContractTypes(): Array<{ type: ContractType; description: string }> {
  return Object.entries(CONTRACT_TYPES).map(([type, description]) => ({
    type: type as ContractType,
    description,
  }));
}

/**
 * Check if a contract type is supported
 */
export function isValidContractType(type: string): type is ContractType {
  return type in CONTRACT_TYPES;
}
