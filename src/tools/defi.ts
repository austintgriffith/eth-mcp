/**
 * DeFi tools for ethereum-mcp
 * Tools for querying yield data from DefiLlama API
 */

// Chain name to DefiLlama chain mapping
const CHAIN_MAP: Record<string, string> = {
  mainnet: "Ethereum",
  ethereum: "Ethereum",
  base: "Base",
  optimism: "Optimism",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
};

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  pool: string;
  underlyingTokens?: string[];
  rewardTokens?: string[];
}

interface YieldResult {
  chain: string;
  protocol: string;
  pool: string;
  symbol: string;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  poolId: string;
}

/**
 * Fetch yields from DefiLlama API
 */
async function fetchDefiLlamaYields(): Promise<DefiLlamaPool[]> {
  const response = await fetch("https://yields.llama.fi/pools");
  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Fetch protocol TVL from DefiLlama API
 */
async function fetchProtocolTVL(protocol: string): Promise<{
  name: string;
  tvl: number;
  chainTvls: Record<string, number>;
}> {
  const response = await fetch(`https://api.llama.fi/protocol/${protocol}`);
  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status}`);
  }
  const data = await response.json();
  return {
    name: data.name,
    tvl: data.tvl,
    chainTvls: data.chainTvls || {},
  };
}

export const defiTools = {
  /**
   * defi.getYields - Get top yields from DefiLlama
   */
  getYields: {
    name: "defi_getYields",
    description: `Query DefiLlama for top yield opportunities.
Filter by chain, protocol, or asset. Returns APY, TVL, and pool details.
Examples:
- Get all yields on Base: { chain: "base" }
- Get Aave yields: { protocol: "aave-v3" }
- Get USDC yields on Arbitrum: { chain: "arbitrum", asset: "USDC" }`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Filter by chain (mainnet, base, optimism, arbitrum, polygon)",
        },
        protocol: {
          type: "string",
          description: "Filter by protocol name (e.g., aave-v3, compound-v3, moonwell)",
        },
        asset: {
          type: "string",
          description: "Filter by asset symbol (e.g., USDC, ETH, WETH)",
        },
        minTvl: {
          type: "number",
          description: "Minimum TVL in USD (default: 100000)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 20)",
        },
      },
      required: [],
    },
    handler: async (args: {
      chain?: string;
      protocol?: string;
      asset?: string;
      minTvl?: number;
      limit?: number;
    }) => {
      try {
        const pools = await fetchDefiLlamaYields();
        const minTvl = args.minTvl || 100000;
        const limit = args.limit || 20;

        // Map chain name to DefiLlama format
        const targetChain = args.chain ? CHAIN_MAP[args.chain.toLowerCase()] : null;

        // Filter pools
        let filtered = pools.filter((pool) => {
          if (pool.tvlUsd < minTvl) return false;
          if (pool.apy === null || pool.apy === undefined) return false;
          if (targetChain && pool.chain !== targetChain) return false;
          if (args.protocol && !pool.project.toLowerCase().includes(args.protocol.toLowerCase())) return false;
          if (args.asset && !pool.symbol.toUpperCase().includes(args.asset.toUpperCase())) return false;
          return true;
        });

        // Sort by APY descending
        filtered.sort((a, b) => (b.apy || 0) - (a.apy || 0));

        // Limit results
        filtered = filtered.slice(0, limit);

        // Format results
        const results: YieldResult[] = filtered.map((pool) => ({
          chain: pool.chain,
          protocol: pool.project,
          pool: pool.pool,
          symbol: pool.symbol,
          apy: Math.round(pool.apy * 100) / 100,
          apyBase: pool.apyBase ? Math.round(pool.apyBase * 100) / 100 : null,
          apyReward: pool.apyReward ? Math.round(pool.apyReward * 100) / 100 : null,
          tvlUsd: Math.round(pool.tvlUsd),
          poolId: pool.pool,
        }));

        return {
          success: true,
          filters: {
            chain: args.chain || "all",
            protocol: args.protocol || "all",
            asset: args.asset || "all",
            minTvl,
          },
          resultCount: results.length,
          yields: results,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },

  /**
   * defi.compareYields - Compare yields for a specific asset
   */
  compareYields: {
    name: "defi_compareYields",
    description: `Compare yields for a specific asset across protocols on a chain.
Useful for finding the best place to deposit a specific token.
Example: Compare USDC yields on Base to find best lending rate.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        asset: {
          type: "string",
          description: "Asset symbol to compare (e.g., USDC, ETH, WETH)",
        },
        chain: {
          type: "string",
          description: "Chain to search (mainnet, base, optimism, arbitrum, polygon)",
        },
        minTvl: {
          type: "number",
          description: "Minimum TVL in USD (default: 500000)",
        },
      },
      required: ["asset", "chain"],
    },
    handler: async (args: { asset: string; chain: string; minTvl?: number }) => {
      try {
        const pools = await fetchDefiLlamaYields();
        const minTvl = args.minTvl || 500000;
        const targetChain = CHAIN_MAP[args.chain.toLowerCase()];

        if (!targetChain) {
          return {
            success: false,
            error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
          };
        }

        // Filter for this asset on this chain
        let filtered = pools.filter((pool) => {
          if (pool.chain !== targetChain) return false;
          if (pool.tvlUsd < minTvl) return false;
          if (pool.apy === null || pool.apy === undefined) return false;
          // Check if symbol contains the asset
          const symbol = pool.symbol.toUpperCase();
          const asset = args.asset.toUpperCase();
          return symbol.includes(asset);
        });

        // Sort by APY descending
        filtered.sort((a, b) => (b.apy || 0) - (a.apy || 0));

        // Format comparison
        const comparison = filtered.slice(0, 15).map((pool, index) => ({
          rank: index + 1,
          protocol: pool.project,
          pool: pool.symbol,
          apy: `${Math.round(pool.apy * 100) / 100}%`,
          apyBreakdown: {
            base: pool.apyBase ? `${Math.round(pool.apyBase * 100) / 100}%` : "N/A",
            rewards: pool.apyReward ? `${Math.round(pool.apyReward * 100) / 100}%` : "N/A",
          },
          tvl: `$${(pool.tvlUsd / 1000000).toFixed(2)}M`,
          poolId: pool.pool,
        }));

        const bestOption = comparison[0];

        return {
          success: true,
          asset: args.asset.toUpperCase(),
          chain: args.chain,
          recommendation: bestOption
            ? `Best yield for ${args.asset} on ${args.chain}: ${bestOption.protocol} at ${bestOption.apy} APY with ${bestOption.tvl} TVL`
            : `No yields found for ${args.asset} on ${args.chain}`,
          comparison,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },

  /**
   * defi.getProtocolTVL - Get TVL for a protocol
   */
  getProtocolTVL: {
    name: "defi_getProtocolTVL",
    description: `Get Total Value Locked (TVL) for a DeFi protocol across all chains.
Use to assess protocol health and trustworthiness.
Higher TVL generally means more battle-tested.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        protocol: {
          type: "string",
          description: "Protocol slug (e.g., aave, compound, uniswap, lido, maker)",
        },
      },
      required: ["protocol"],
    },
    handler: async (args: { protocol: string }) => {
      try {
        const data = await fetchProtocolTVL(args.protocol);

        // Format chain TVLs
        const chainBreakdown = Object.entries(data.chainTvls)
          .filter(([chain]) => !chain.includes("-") && !chain.includes("staking"))
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([chain, tvl]) => ({
            chain,
            tvl: `$${((tvl as number) / 1000000).toFixed(2)}M`,
          }));

        return {
          success: true,
          protocol: data.name,
          totalTvl: `$${(data.tvl / 1000000000).toFixed(2)}B`,
          totalTvlRaw: Math.round(data.tvl),
          chainBreakdown,
          assessment:
            data.tvl > 1000000000
              ? "Very High TVL - Well established protocol"
              : data.tvl > 100000000
                ? "High TVL - Established protocol"
                : data.tvl > 10000000
                  ? "Medium TVL - Growing protocol"
                  : "Lower TVL - Exercise caution",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          error: `Could not fetch TVL for "${args.protocol}". Try using the exact protocol slug from DefiLlama.`,
        };
      }
    },
  },

  /**
   * defi.getTopProtocols - Get top protocols by TVL
   */
  getTopProtocols: {
    name: "defi_getTopProtocols",
    description: `Get top DeFi protocols by TVL on a specific chain.
Useful for discovering what protocols are most used on a chain.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          description: "Chain to query (mainnet, base, optimism, arbitrum, polygon)",
        },
        category: {
          type: "string",
          description: "Optional category filter (e.g., lending, dex, yield, liquid-staking)",
        },
        limit: {
          type: "number",
          description: "Number of results (default: 10)",
        },
      },
      required: ["chain"],
    },
    handler: async (args: { chain: string; category?: string; limit?: number }) => {
      try {
        const targetChain = CHAIN_MAP[args.chain.toLowerCase()];
        if (!targetChain) {
          return {
            success: false,
            error: `Unknown chain: ${args.chain}. Supported: mainnet, base, optimism, arbitrum, polygon`,
          };
        }

        const response = await fetch("https://api.llama.fi/protocols");
        if (!response.ok) {
          throw new Error(`DefiLlama API error: ${response.status}`);
        }
        const protocols = await response.json();

        // Filter by chain and optionally category
        let filtered = protocols.filter((p: { chains: string[]; category?: string }) => {
          if (!p.chains.includes(targetChain)) return false;
          if (args.category && p.category?.toLowerCase() !== args.category.toLowerCase()) return false;
          return true;
        });

        // Sort by TVL
        filtered.sort(
          (a: { tvl: number }, b: { tvl: number }) => (b.tvl || 0) - (a.tvl || 0)
        );

        const limit = args.limit || 10;
        const results = filtered.slice(0, limit).map(
          (
            p: {
              name: string;
              tvl: number;
              category: string;
              slug: string;
              chainTvls: Record<string, number>;
            },
            index: number
          ) => ({
            rank: index + 1,
            name: p.name,
            category: p.category,
            totalTvl: `$${(p.tvl / 1000000).toFixed(2)}M`,
            chainTvl: p.chainTvls?.[targetChain]
              ? `$${(p.chainTvls[targetChain] / 1000000).toFixed(2)}M`
              : "N/A",
            slug: p.slug,
          })
        );

        return {
          success: true,
          chain: args.chain,
          category: args.category || "all",
          protocols: results,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },
};
