# eth-mcp

MCP server that enables AI agents to build and deploy Ethereum applications using Scaffold-ETH.

**The AI is the planner. The MCP server is the executor.**

---

## Quick Start

Add to your Cursor MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "eth-mcp": {
      "command": "npx",
      "args": ["-y", "eth-mcp@latest"]
    }
  }
}
```

Restart Cursor. Done! Now ask your AI:

> "Build me a swapping app with a 1% tax token on Base"

---

## What This Does

eth-mcp is a Model Context Protocol (MCP) server that:

1. **Clones and configures Scaffold-ETH projects** - Foundry + Next.js stack
2. **Manages long-running processes** - Anvil fork, contract deployment, frontend
3. **Provides file access** - Read/write project files
4. **Exposes logs and status** - Resources for agent polling
5. **Includes Web3 knowledge** - Guides for incentive design and Solidity patterns
6. **DeFi address registry** - Token and protocol addresses across 5 chains
7. **DeFi yield tools** - Query live APY/TVL data from DefiLlama

This enables AI agents to go from natural language to running dApp without manual intervention.

---

## Recommended MCP Stack

eth-mcp is designed to work alongside companion MCP servers for a **complete Ethereum development experience**. We strongly recommend installing all three:

| MCP Server | Purpose | Essential For |
|------------|---------|---------------|
| **eth-mcp** | Build, deploy, run local dev | Core functionality |
| **mcp-server-ens** | ENS name resolution | Resolving .eth names (vitalik.eth → 0x...) |
| **@blockscout/mcp-server** | Blockchain exploration | Tx analysis, contract ABIs, on-chain data |

### Full Configuration (Recommended)

Add all three to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "eth-mcp": {
      "command": "npx",
      "args": ["-y", "eth-mcp@latest"]
    },
    "ens": {
      "command": "npx",
      "args": ["-y", "mcp-server-ens"]
    },
    "blockscout": {
      "command": "npx",
      "args": ["-y", "@blockscout/mcp-server"]
    }
  }
}
```

### Division of Responsibilities

| Task | eth-mcp | ENS MCP | Blockscout |
|------|:-------:|:-------:|:----------:|
| Scaffold project | ✅ | | |
| Deploy contracts | ✅ | | |
| Run local fork | ✅ | | |
| Start frontend | ✅ | | |
| Resolve vitalik.eth | | ✅ | |
| Get ENS records (avatar, socials) | | ✅ | |
| Check mainnet balances | | | ✅ |
| Analyze transactions | | | ✅ |
| Get contract ABIs | | | ✅ |
| Look up token addresses | ✅ (registry) | | ✅ (live) |
| Query live yield data | ✅ | | |

### Example Workflow

```
1. Use ENS MCP to resolve "vitalik.eth" to get the address
2. Use Blockscout to check their USDC balance and recent transactions
3. Use eth-mcp to scaffold a project that interacts with their address
4. Use eth-mcp to write and deploy contracts locally
5. Use Blockscout to verify mainnet state your fork is based on
6. Use eth-mcp to start frontend and test
```

### Why All Three?

- **eth-mcp** handles the **local development loop**: scaffolding, forking, deploying, hot-reloading
- **ENS MCP** handles **name resolution**: converting human-readable .eth names to addresses
- **Blockscout** handles **blockchain exploration**: reading mainnet state, analyzing transactions, fetching ABIs

The AI agent orchestrates all three, choosing the right tool for each task.

---

## Alternative Installation (from source)

```bash
# Clone the repo
git clone https://github.com/austintgriffith/eth-mcp
cd eth-mcp

# Install dependencies
npm install

# Build
npm run build
```

### Configure MCP Client (local)

Add to your MCP settings:

```json
{
  "mcpServers": {
    "eth-mcp": {
      "command": "node",
      "args": ["/path/to/eth-mcp/dist/index.js"]
    }
  }
}
```

---

## MCP Tools

### Stack Management

| Tool | Description |
|------|-------------|
| `stack_init` | Clone Scaffold-ETH, configure for chain |
| `stack_install` | Install dependencies (yarn install) |
| `stack_start` | Start components: fork, deploy, frontend |
| `stack_stop` | Stop running components |
| `stack_status` | Get health report and URLs |

### Process Management

| Tool | Description |
|------|-------------|
| `process_list` | List all managed processes |
| `process_logs` | Get stdout/stderr for a process |
| `process_stop` | Stop a specific process |

### Project Files

| Tool | Description |
|------|-------------|
| `project_readFile` | Read a project file |
| `project_writeFile` | Write content to a file |
| `project_listFiles` | List directory contents |

---

## MCP Resources

Resources for polling status and logs:

| Resource URI | Description |
|--------------|-------------|
| `resource://stack/status` | Current stack health |
| `resource://stack/config` | Stack configuration |
| `resource://process/fork/stdout` | Anvil fork output |
| `resource://process/fork/stderr` | Anvil fork errors |
| `resource://process/frontend/stdout` | Next.js output |
| `resource://process/frontend/stderr` | Next.js errors |
| `resource://contracts/deployed` | Deployed contract addresses |

---

## Example Agent Workflow

Here's how an AI agent would build a tax token swap app:

```
Agent: "Build a swapping app with a 1% tax token on Base"

1. stack_init({ template: "scaffold-eth", chain: "base", workspacePath: "/tmp/tax-swap" })
   → Clones scaffold-eth-2, configures for Base

2. stack_install()
   → Runs yarn install

3. project_writeFile({ path: "packages/foundry/contracts/TaxToken.sol", content: "..." })
   → Creates the tax token contract

4. project_writeFile({ path: "packages/foundry/script/Deploy.s.sol", content: "..." })
   → Updates deploy script

5. stack_start({ components: ["fork", "deploy", "frontend"] })
   → Starts Anvil fork of Base
   → Deploys contracts
   → Starts Next.js

6. stack_status()
   → Returns: { urls: { rpc: "http://localhost:8545", frontend: "http://localhost:3000" } }

7. project_writeFile({ path: "packages/nextjs/app/page.tsx", content: "..." })
   → Creates swap UI on home page

Result: Running app at http://localhost:3000
```

---

## Supported Chains

| Chain | ID | Fork RPC |
|-------|----|-|
| mainnet | 1 | Public RPC |
| base | 8453 | Public RPC |
| optimism | 10 | Public RPC |
| arbitrum | 42161 | Public RPC |
| polygon | 137 | Public RPC |
| sepolia | 11155111 | Public RPC |

---

## Documentation for AI Agents

The `docs/` folder contains guides that help AI agents understand Web3 development:

- **WEB3_DEVELOPMENT_GUIDE.md** - Mental model shift, incentive thinking, security patterns
- **SOLIDITY_PATTERNS.md** - Common contract patterns and templates
- **DEFI_BUILDING_BLOCKS.md** - DeFi primitives and composability

AI agents should read these before building complex applications.

---

## Protocol Packs

Example protocol integrations in `protocol-packs/`:

### uniswap-v4-tax-swap

Placeholder implementation of:
- `TaxToken.sol` - ERC-20 with 1% transfer tax
- `TaxSwapHook.sol` - Uniswap V4 hook for tax handling
- `SwapUI.tsx` - React swap interface

This shows structure, not full implementation. V4 is still in development.

---

## Safety

The server enforces several safety constraints:

**Command Allowlist:**
- Only `git`, `yarn`, `npm`, `pnpm`, `npx`, `forge`, `anvil`, `cast`, `node`

**Private Key Protection:**
- Sanitizes output to remove private keys
- Blocks access to `.env` files
- Filters sensitive environment variables

**No Mainnet Writes:**
- Local development only
- Fork-based testing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Agent                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Build me a swapping app with a 1% tax token"      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol
┌─────────────────────────▼───────────────────────────────────┐
│                       eth-mcp                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Stack   │  │ Process  │  │ Project  │  │Resources │   │
│  │  Tools   │  │ Manager  │  │  Tools   │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│                     Workspace                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               scaffold-eth-2                         │   │
│  │  ┌───────────────┐  ┌───────────────────────────┐   │   │
│  │  │   Foundry     │  │        Next.js            │   │   │
│  │  │  (Contracts)  │  │       (Frontend)          │   │   │
│  │  └───────────────┘  └───────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  Anvil Fork     │  │     http://localhost:3000       │  │
│  │  (Base chain)   │  │         (Running app)           │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Development

```bash
# Watch mode
npm run dev

# Type check
npm run typecheck

# Run server directly
npm start
```

---

## Limitations (v1)

- Local development only (no mainnet deployment)
- Single workspace at a time
- Basic error recovery
- Placeholder protocol pack implementations

---

## License

MIT
