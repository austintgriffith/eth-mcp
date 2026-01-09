# Uniswap V4 Tax Swap Protocol Pack

This protocol pack demonstrates building a token swap interface with a custom tax token using Uniswap V4 hooks.

## Overview

The goal is to create:
1. A custom ERC-20 token with a 1% transfer tax
2. A Uniswap V4 hook that handles the tax logic
3. A frontend swap UI integrated with Scaffold-ETH

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Uniswap V4 Pool                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   Token A   │────▶│    Hook     │────▶│   Token B   │  │
│  │   (TAX)     │     │ (TaxSwap)   │     │   (ETH)     │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│                            │                               │
│                            ▼                               │
│                    ┌─────────────┐                        │
│                    │ Tax Treasury│                        │
│                    │    (1%)     │                        │
│                    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Contracts

- `TaxToken.sol` - ERC-20 with 1% transfer tax
- `TaxSwapHook.sol` - Uniswap V4 hook for tax handling

### Frontend

- `SwapUI.tsx` - React component for the swap interface

## Where Uniswap V4 Logic Goes

### Hook Implementation

The hook should implement these callbacks:
- `beforeSwap` - Called before swap, can modify amounts
- `afterSwap` - Called after swap, can collect tax

Key V4 concepts:
- Hooks are deployed to specific addresses based on their permissions
- The hook address encodes which callbacks are enabled
- Use `PoolKey` to identify pools
- Use `IPoolManager` for pool operations

### Integration Points

1. **Deploy hook to correct address**: Use CREATE2 with salt mining
2. **Register hook with pool**: When creating pool, specify hook address
3. **Tax collection**: In `afterSwap`, transfer tax to treasury

## Implementation Notes

This is a placeholder structure. Full implementation requires:
- Uniswap V4 core contracts (currently in development)
- Proper hook address derivation
- Pool creation scripts
- Integration tests

## Resources

- [Uniswap V4 Docs](https://docs.uniswap.org/)
- [V4 Hook Examples](https://github.com/uniswapfoundation/v4-periphery)
- [Scaffold-ETH 2](https://scaffoldeth.io/)
