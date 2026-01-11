/**
 * Uniswap V4 ABIs
 * 
 * CRITICAL GOTCHA: settle() has NO parameters!
 * Use sync(currency) first, then settle() with no args.
 * 
 * V4 uses an unlock/callback pattern - you cannot call swap() directly.
 * Your contract must implement unlockCallback().
 */

/**
 * IPoolManager - Core V4 interface
 * 
 * Key functions for swaps:
 * - unlock(data): Entry point, triggers your unlockCallback
 * - swap(key, params, hookData): Execute swap (only inside callback!)
 * - sync(currency): Tell PM which currency you're paying
 * - settle(): Finalize payment (NO PARAMS - uses synced currency!)
 * - take(currency, to, amount): Receive tokens
 */
export const UNISWAP_V4_POOL_MANAGER_ABI = [
  // unlock - entry point for all operations
  {
    inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
    name: "unlock",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // swap - execute a swap (must be called inside unlockCallback)
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "key",
        type: "tuple",
      },
      {
        components: [
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "int256", name: "amountSpecified", type: "int256" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        internalType: "struct IPoolManager.SwapParams",
        name: "params",
        type: "tuple",
      },
      { internalType: "bytes", name: "hookData", type: "bytes" },
    ],
    name: "swap",
    outputs: [{ internalType: "BalanceDelta", name: "", type: "int256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // sync - tell PoolManager which currency you're about to pay
  // MUST call this before settle()!
  {
    inputs: [{ internalType: "Currency", name: "currency", type: "address" }],
    name: "sync",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // settle - CRITICAL: NO PARAMETERS!
  // Uses the currency from sync(). This is the #1 V4 gotcha.
  // Error 0x5212cba1 means you called settle(currency) - wrong!
  {
    inputs: [],
    name: "settle",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  // take - receive tokens from PoolManager
  {
    inputs: [
      { internalType: "Currency", name: "currency", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "take",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // initialize - create a new pool
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "key",
        type: "tuple",
      },
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "bytes", name: "hookData", type: "bytes" },
    ],
    name: "initialize",
    outputs: [{ internalType: "int24", name: "tick", type: "int24" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // modifyLiquidity - add/remove liquidity (for LPs)
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "key",
        type: "tuple",
      },
      {
        components: [
          { internalType: "int24", name: "tickLower", type: "int24" },
          { internalType: "int24", name: "tickUpper", type: "int24" },
          { internalType: "int256", name: "liquidityDelta", type: "int256" },
          { internalType: "bytes32", name: "salt", type: "bytes32" },
        ],
        internalType: "struct IPoolManager.ModifyLiquidityParams",
        name: "params",
        type: "tuple",
      },
      { internalType: "bytes", name: "hookData", type: "bytes" },
    ],
    name: "modifyLiquidity",
    outputs: [
      { internalType: "BalanceDelta", name: "", type: "int256" },
      { internalType: "BalanceDelta", name: "", type: "int256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Uniswap V4 Quoter ABI
 * For getting swap quotes without executing
 */
export const UNISWAP_V4_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              { internalType: "Currency", name: "intermediateCurrency", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              { internalType: "contract IHooks", name: "hooks", type: "address" },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IQuoter.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInput",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              { internalType: "contract IHooks", name: "hooks", type: "address" },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IQuoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * V4 Constants and Helper Values
 */
export const V4_CONSTANTS = {
  // Min/max sqrt price limits for swaps
  MIN_SQRT_PRICE: BigInt("4295128739"),
  MAX_SQRT_PRICE: BigInt("1461446703485210103287273052203988822378723970342"),
  
  // Common fee tiers and their tick spacings
  FEE_TIERS: {
    "0.01%": { fee: 100, tickSpacing: 1 },
    "0.05%": { fee: 500, tickSpacing: 10 },
    "0.30%": { fee: 3000, tickSpacing: 60 },
    "1.00%": { fee: 10000, tickSpacing: 200 },
  },
  
  // Recommended gas limits
  GAS_LIMITS: {
    swap: 500_000,
    poolInitialization: 2_500_000,
    addLiquidity: 1_000_000,
  },
} as const;

/**
 * Type helpers for V4 integration
 */
export interface PoolKey {
  currency0: string; // Must be < currency1!
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint; // Negative = exact input
  sqrtPriceLimitX96: bigint;
}

/**
 * Helper to build a sorted PoolKey
 * CRITICAL: currency0 must be < currency1
 */
export function buildPoolKey(
  tokenA: string,
  tokenB: string,
  fee: number,
  tickSpacing: number,
  hooks: string = "0x0000000000000000000000000000000000000000"
): PoolKey {
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
  
  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };
}
