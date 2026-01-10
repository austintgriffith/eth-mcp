/**
 * Address lookup tools for ethereum-mcp
 * Tools for looking up token and protocol addresses across chains
 */

import {
  CHAIN_REGISTRY,
  CHAIN_BY_NAME,
  getTokenAddress,
  getProtocolAddresses,
  getChainTokens,
  findToken,
  getWhales,
  getBestWhale,
  getChainWhales,
  generateFundingCommands,
  type WhaleInfo,
} from "../addresses/index.js";

export const addressTools = {
  /**
   * addresses.getToken - Get a token address on a chain
   */
  getToken: {
    name: "addresses_getToken",
    description: `Get a token's contract address on a specific chain.
Examples:
- WETH on Base: returns 0x4200000000000000000000000000000000000006
- USDC on Arbitrum: returns 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- wstETH on Optimism: returns 0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb

Supported chains: mainnet, base, optimism, arbitrum, polygon
Common tokens: WETH, USDC, USDT, DAI, WBTC, wstETH, rETH, cbETH`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
        symbol: {
          type: "string",
          description: "Token symbol (WETH, USDC, DAI, etc.)",
        },
      },
      required: ["chain", "symbol"],
    },
    handler: async (args: { chain: string; symbol: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const token = chainData.tokens[args.symbol];
      if (!token) {
        const available = Object.keys(chainData.tokens).join(", ");
        return {
          success: false,
          error: `Token ${args.symbol} not found on ${args.chain}. Available: ${available}`,
        };
      }

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        token: {
          symbol: token.symbol,
          address: token.address,
          decimals: token.decimals,
          name: token.name,
        },
      };
    },
  },

  /**
   * addresses.getProtocol - Get protocol addresses on a chain
   */
  getProtocol: {
    name: "addresses_getProtocol",
    description: `Get contract addresses for a DeFi protocol on a specific chain.
Examples:
- uniswapV3 on Base: returns factory, router, quoterV2, positionManager
- aaveV3 on Arbitrum: returns pool, poolDataProvider, oracle
- moonwell on Base: returns comptroller, mWETH, mUSDbC, flagshipETH vault

Supported protocols by chain:
- All chains: uniswapV3, aaveV3, chainlink
- Base: aerodrome, moonwell, morpho
- Optimism: velodrome
- Arbitrum: gmx, camelot
- Mainnet: uniswapV2, sushiswap, curve, lido, compoundV3`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
        protocol: {
          type: "string",
          description: "Protocol name (uniswapV3, aaveV3, moonwell, etc.)",
        },
      },
      required: ["chain", "protocol"],
    },
    handler: async (args: { chain: string; protocol: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const protocol = chainData.protocols[args.protocol];
      if (!protocol) {
        const available = Object.keys(chainData.protocols).join(", ");
        return {
          success: false,
          error: `Protocol ${args.protocol} not found on ${args.chain}. Available: ${available}`,
        };
      }

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        protocol: args.protocol,
        addresses: protocol,
      };
    },
  },

  /**
   * addresses.listTokens - List all tokens on a chain
   */
  listTokens: {
    name: "addresses_listTokens",
    description: `List all known token addresses on a specific chain.
Returns symbols, addresses, decimals for all tokens in the registry.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
      },
      required: ["chain"],
    },
    handler: async (args: { chain: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const tokens = Object.entries(chainData.tokens).map(([symbol, info]) => ({
        symbol,
        address: info.address,
        decimals: info.decimals,
        name: info.name,
      }));

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        tokenCount: tokens.length,
        tokens,
      };
    },
  },

  /**
   * addresses.listProtocols - List all protocols on a chain
   */
  listProtocols: {
    name: "addresses_listProtocols",
    description: `List all known DeFi protocols and their addresses on a specific chain.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
      },
      required: ["chain"],
    },
    handler: async (args: { chain: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const protocols = Object.entries(chainData.protocols).map(([name, addresses]) => ({
        name,
        contracts: Object.keys(addresses),
        addresses,
      }));

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        protocolCount: protocols.length,
        protocols,
      };
    },
  },

  /**
   * addresses.findToken - Search for a token across all chains
   */
  findToken: {
    name: "addresses_findToken",
    description: `Search for a token symbol across all chains.
Useful when you need to find where a token exists.
Returns all chains where the token is available with addresses.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Token symbol to search for (e.g., USDC, WETH, wstETH)",
        },
      },
      required: ["symbol"],
    },
    handler: async (args: { symbol: string }) => {
      const results = findToken(args.symbol);

      if (results.length === 0) {
        return {
          success: false,
          error: `Token ${args.symbol} not found on any chain`,
        };
      }

      return {
        success: true,
        symbol: args.symbol,
        foundOnChains: results.length,
        results: results.map((r) => ({
          chain: r.chainName,
          chainId: r.chainId,
          address: r.token.address,
          decimals: r.token.decimals,
        })),
      };
    },
  },

  /**
   * addresses.getWhale - Get whale addresses for funding test wallets
   */
  getWhale: {
    name: "addresses_getWhale",
    description: `Get whale addresses for funding test wallets with tokens on Anvil forks.

WHEN TO USE: When users need tokens (USDC, WETH, DAI) to test their DeFi apps.

Returns protocol contract addresses (Morpho, Aave) that hold large token balances.
Protocol contracts are more reliable than EOAs because they hold funds as their core function.

Also returns one-shot cast commands to transfer tokens from the whale to a recipient.

Example usage flow:
1. User builds a USDC vault on Base
2. Call addresses_getWhale({ chain: "base", token: "USDC" })
3. Get Morpho Blue whale (0xBBBB...) with ~131M USDC
4. Provide user with cast commands to fund their wallet`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
        token: {
          type: "string",
          description: "Token symbol (USDC, WETH, DAI, etc.)",
        },
        recipient: {
          type: "string",
          description: "Optional: Recipient address to include in funding commands",
        },
        amount: {
          type: "string",
          description: "Optional: Amount in token's smallest unit (e.g., 10000000000 for 10k USDC)",
        },
      },
      required: ["chain", "token"],
    },
    handler: async (args: { chain: string; token: string; recipient?: string; amount?: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const whales = getWhales(chainData.chainId, args.token);
      if (!whales || whales.length === 0) {
        // Return helpful message about what tokens have whales
        const chainWhales = getChainWhales(chainData.chainId);
        const availableTokens = chainWhales ? Object.keys(chainWhales).join(", ") : "none";
        return {
          success: false,
          error: `No whale found for ${args.token} on ${args.chain}. Available tokens with whales: ${availableTokens}`,
          hint: "For tokens without whales, try using Blockscout MCP to find large holders, or for WETH, mint directly by depositing ETH.",
        };
      }

      const bestWhale = whales[0];
      
      // Get token info for decimals
      const tokenInfo = chainData.tokens[args.token];
      
      // Generate funding commands if recipient provided
      let fundingCommands: string | null = null;
      if (args.recipient && tokenInfo) {
        const amount = args.amount || (tokenInfo.decimals === 6 ? "10000000000" : "10000000000000000000000"); // 10k default
        fundingCommands = generateFundingCommands(
          chainData.chainId,
          args.token,
          tokenInfo.address,
          args.recipient,
          amount
        );
      }

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        token: args.token,
        tokenAddress: tokenInfo?.address || "unknown",
        tokenDecimals: tokenInfo?.decimals || "unknown",
        recommendedWhale: {
          address: bestWhale.address,
          label: bestWhale.label,
          protocol: bestWhale.protocol,
          balance: bestWhale.balance,
          isContract: bestWhale.isContract,
        },
        allWhales: whales,
        fundingCommands,
        importantNotes: [
          "Protocol contracts (Morpho, Aave) are more reliable than EOAs",
          "Contract whales need ETH for gas - use anvil_setBalance first",
          "Must call anvil_impersonateAccount before sending",
          "Use --unlocked flag with cast send",
        ],
      };
    },
  },

  /**
   * addresses.listWhales - List all available token whales on a chain
   */
  listWhales: {
    name: "addresses_listWhales",
    description: `List all available token whales on a specific chain.
Shows which tokens have known whale addresses for funding test wallets.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain name (mainnet, base, optimism, arbitrum, polygon)",
        },
      },
      required: ["chain"],
    },
    handler: async (args: { chain: string }) => {
      const chainData = CHAIN_BY_NAME[args.chain.toLowerCase()];
      if (!chainData) {
        return {
          success: false,
          error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
        };
      }

      const chainWhales = getChainWhales(chainData.chainId);
      if (!chainWhales) {
        return {
          success: false,
          error: `No whales configured for ${args.chain}`,
        };
      }

      const tokens = Object.entries(chainWhales).map(([symbol, whales]) => ({
        token: symbol,
        whaleCount: whales.length,
        bestWhale: whales[0] ? {
          address: whales[0].address,
          label: whales[0].label,
          protocol: whales[0].protocol,
          balance: whales[0].balance,
        } : null,
      }));

      return {
        success: true,
        chain: args.chain,
        chainId: chainData.chainId,
        tokenCount: tokens.length,
        tokens,
        usage: "Use addresses_getWhale({ chain, token }) to get whale details and funding commands",
      };
    },
  },
};
