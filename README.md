# ethereum-mcp

MCP server that enables AI agents to build and deploy Ethereum applications using Scaffold-ETH.

**The AI is the planner. The MCP server is the executor.**

```
"Build me a swapping app with a 1% tax token using Uniswap v4"
                              ↓
                     [ethereum-mcp]
                              ↓
              Local app running at localhost:3000
```

---

## What This Does

ethereum-mcp is a Model Context Protocol (MCP) server that:

1. **Clones and configures Scaffold-ETH projects** - Foundry + Next.js stack
2. **Manages long-running processes** - Anvil fork, contract deployment, frontend
3. **Provides file access** - Read/write project files
4. **Exposes logs and status** - Resources for agent polling
5. **Includes Web3 knowledge** - Guides for incentive design and Solidity patterns

This enables AI agents to go from natural language to running dApp without manual intervention.

---

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/ethereum-mcp
cd ethereum-mcp

# Install dependencies
npm install

# Build
npm run build
```

### Configure MCP Client

**For Claude Code / Cursor:**

Add to your MCP settings:

```json
{
  "mcpServers": {
    "ethereum-mcp": {
      "command": "node",
      "args": ["/path/to/ethereum-mcp/dist/index.js"]
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

7. project_writeFile({ path: "packages/nextjs/app/swap/page.tsx", content: "..." })
   → Creates swap UI page

Result: Running app at http://localhost:3000/swap
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
│                    ethereum-mcp                             │
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
