# Agent Workflow Examples

Detailed examples of how an AI agent should use ethereum-mcp to build Ethereum applications.

---

## Example 1: Tax Token Swap App

**User Request:**
> "Build me a swapping app with a 1% tax token using Uniswap v4 on Base"

### Agent Thought Process

1. **Understand the request**: User wants a token with built-in tax + swap UI
2. **Break down components**:
   - Tax token contract (ERC-20 with transfer tax)
   - Uniswap V4 hook for swap integration
   - Frontend swap interface
3. **Choose chain**: Base (chain ID 8453)
4. **Plan execution order**: Init → Install → Contracts → Deploy → UI → Start

### Step-by-Step Execution

#### Step 1: Initialize Project

```json
{
  "tool": "stack_init",
  "arguments": {
    "template": "scaffold-eth",
    "chain": "base",
    "workspacePath": "/home/user/tax-swap-app"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Scaffold-ETH initialized for base at /home/user/tax-swap-app",
  "chain": {
    "name": "base",
    "chainId": 8453,
    "rpcUrl": "https://mainnet.base.org"
  },
  "nextStep": "Run stack.install() to install dependencies"
}
```

#### Step 2: Install Dependencies

```json
{
  "tool": "stack_install",
  "arguments": {}
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Dependencies installed successfully",
  "nextStep": "Run stack.start() to start the development environment"
}
```

#### Step 3: Create Tax Token Contract

```json
{
  "tool": "project_writeFile",
  "arguments": {
    "path": "packages/foundry/contracts/TaxToken.sol",
    "content": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\nimport \"@openzeppelin/contracts/token/ERC20/ERC20.sol\";\n\ncontract TaxToken is ERC20 {\n    uint256 public constant TAX_BPS = 100; // 1%\n    address public treasury;\n    \n    constructor(address _treasury) ERC20(\"Tax Token\", \"TAX\") {\n        treasury = _treasury;\n        _mint(msg.sender, 1_000_000 * 10**18);\n    }\n    \n    function _update(address from, address to, uint256 value) internal override {\n        if (from != address(0) && to != address(0)) {\n            uint256 tax = (value * TAX_BPS) / 10000;\n            super._update(from, treasury, tax);\n            super._update(from, to, value - tax);\n        } else {\n            super._update(from, to, value);\n        }\n    }\n}"
  }
}
```

#### Step 4: Update Deploy Script

```json
{
  "tool": "project_readFile",
  "arguments": {
    "path": "packages/foundry/script/Deploy.s.sol"
  }
}
```

Then modify:

```json
{
  "tool": "project_writeFile",
  "arguments": {
    "path": "packages/foundry/script/Deploy.s.sol",
    "content": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\nimport \"./DeployHelpers.s.sol\";\nimport \"../contracts/TaxToken.sol\";\n\ncontract DeployScript is ScaffoldETHDeploy {\n    function run() external ScaffoldEthDeployerRunner {\n        TaxToken taxToken = new TaxToken(deployer);\n        console.log(\"TaxToken deployed to:\", address(taxToken));\n    }\n}"
  }
}
```

#### Step 5: Start the Stack

```json
{
  "tool": "stack_start",
  "arguments": {
    "components": ["fork", "deploy", "frontend"]
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "results": {
    "fork": { "success": true },
    "deploy": { "success": true },
    "frontend": { "success": true }
  },
  "urls": {
    "rpc": "http://localhost:8545",
    "frontend": "http://localhost:3000"
  },
  "message": "All components started successfully"
}
```

#### Step 6: Check Status

```json
{
  "tool": "stack_status",
  "arguments": {}
}
```

**Expected Response:**
```json
{
  "ready": true,
  "workspace": "/home/user/tax-swap-app",
  "chain": "base",
  "chainId": 8453,
  "components": {
    "fork": "running",
    "deploy": "deployed",
    "frontend": "running"
  },
  "urls": {
    "rpc": "http://localhost:8545",
    "frontend": "http://localhost:3000"
  },
  "deployedContracts": [
    {
      "name": "TaxToken",
      "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    }
  ]
}
```

#### Step 7: Create Swap UI

```json
{
  "tool": "project_writeFile",
  "arguments": {
    "path": "packages/nextjs/app/swap/page.tsx",
    "content": "\"use client\";\n\nimport { useState } from \"react\";\nimport { useScaffoldContractRead, useScaffoldContractWrite } from \"~~/hooks/scaffold-eth\";\n\nexport default function SwapPage() {\n  const [amount, setAmount] = useState(\"\");\n  \n  return (\n    <div className=\"flex flex-col items-center pt-10\">\n      <h1 className=\"text-4xl font-bold\">Tax Token Swap</h1>\n      <p className=\"text-lg mt-2\">1% tax on all transfers</p>\n      \n      <div className=\"mt-8 bg-base-200 p-6 rounded-xl w-96\">\n        <input\n          type=\"number\"\n          placeholder=\"Amount to swap\"\n          value={amount}\n          onChange={(e) => setAmount(e.target.value)}\n          className=\"input input-bordered w-full\"\n        />\n        \n        <div className=\"mt-4 text-sm\">\n          Tax (1%): {amount ? (parseFloat(amount) * 0.01).toFixed(4) : \"0\"}\n        </div>\n        \n        <button className=\"btn btn-primary w-full mt-4\">\n          Swap\n        </button>\n      </div>\n    </div>\n  );\n}"
  }
}
```

### Final Status Check

The agent should poll logs to verify everything is working:

```json
{
  "tool": "process_logs",
  "arguments": {
    "id": "frontend",
    "tail": 20
  }
}
```

---

## Example 2: Simple NFT Collection

**User Request:**
> "Create an NFT collection with mint functionality"

### Agent Execution

1. **Initialize** with mainnet fork (for testing NFT marketplace integration)
2. **Create NFT contract** using ERC-721
3. **Create mint page** with wallet connection
4. **Deploy and verify**

```json
// Step 1
{ "tool": "stack_init", "arguments": { "template": "scaffold-eth", "chain": "mainnet", "workspacePath": "/home/user/nft-collection" } }

// Step 2
{ "tool": "stack_install", "arguments": {} }

// Step 3
{ "tool": "project_writeFile", "arguments": { "path": "packages/foundry/contracts/MyNFT.sol", "content": "..." } }

// Step 4
{ "tool": "stack_start", "arguments": { "components": ["fork", "deploy", "frontend"] } }
```

---

## Resource Polling Pattern

Agents should poll resources to monitor long-running operations:

```python
# Pseudocode for agent polling
while True:
    status = call_tool("stack_status")
    
    if status["components"]["fork"] == "error":
        logs = call_tool("process_logs", { "id": "fork", "tail": 50 })
        analyze_and_fix(logs)
        break
    
    if status["components"]["frontend"] == "running":
        print(f"App ready at {status['urls']['frontend']}")
        break
    
    sleep(5)
```

---

## Error Handling

### Common Errors and Recovery

**Error: "Dependencies not installed"**
```json
{ "tool": "stack_install", "arguments": {} }
```

**Error: "Stack not initialized"**
```json
{ "tool": "stack_init", "arguments": { "template": "scaffold-eth", "chain": "base", "workspacePath": "/tmp/project" } }
```

**Error: "Process already running"**
```json
{ "tool": "stack_stop", "arguments": { "components": ["fork"] } }
// Then retry start
```

**Error: Compilation failure**
```json
// Check logs
{ "tool": "process_logs", "arguments": { "id": "deploy", "tail": 100 } }
// Fix contract code
{ "tool": "project_writeFile", "arguments": { "path": "...", "content": "fixed code" } }
// Redeploy
{ "tool": "stack_start", "arguments": { "components": ["deploy"] } }
```

---

## Best Practices for Agents

1. **Always check status before starting** - Use `stack_status` to understand current state

2. **Read before writing** - Use `project_readFile` to understand existing code before modifying

3. **Start components in order** - Fork before deploy, deploy before frontend needs contracts

4. **Poll logs on failure** - Use `process_logs` to understand what went wrong

5. **Use the docs** - Read WEB3_DEVELOPMENT_GUIDE.md before building complex contracts

6. **Test incrementally** - Deploy and test contracts before building full UI

7. **Keep user informed** - Provide status updates during long operations

8. **Use companion MCPs** - Combine eth-mcp with Blockscout for complete coverage

---

## Multi-MCP Workflows

eth-mcp works best alongside **Blockscout MCP** for blockchain exploration. Here's how to use them together.

### Division of Responsibilities

| Task | eth-mcp | Blockscout MCP |
|------|---------|----------------|
| Scaffold project | ✅ | |
| Deploy contracts | ✅ | |
| Run local fork | ✅ | |
| Start frontend | ✅ | |
| Check mainnet state | | ✅ |
| Analyze transactions | | ✅ |
| Get contract ABIs | | ✅ |
| Look up token addresses | ✅ (local registry) | ✅ (live chain) |

### Example: Building a Uniswap Integration

**Phase 1: Research (Blockscout)**

Before building, use Blockscout to understand what you're integrating with:

```json
// Find USDC address on Base
{ "tool": "blockscout.lookup_token_by_symbol", "arguments": { "chain_id": "8453", "symbol": "USDC" } }

// Get Uniswap V3 Router ABI
{ "tool": "blockscout.get_contract_abi", "arguments": { "chain_id": "8453", "address": "0x2626664c2603336E57B271c5C0b26F421741e481" } }

// Analyze a successful swap transaction
{ "tool": "blockscout.transaction_summary", "arguments": { "chain_id": "8453", "transaction_hash": "0x..." } }
```

**Phase 2: Build (eth-mcp)**

Use eth-mcp to create and deploy your project:

```json
// Initialize project
{ "tool": "stack_init", "arguments": { "template": "scaffold-eth", "chain": "base", "workspacePath": "/home/user/swap-app" } }

// Install dependencies
{ "tool": "stack_install", "arguments": {} }

// Write swap contract
{ "tool": "project_writeFile", "arguments": { "path": "packages/foundry/contracts/SwapHelper.sol", "content": "..." } }

// Deploy locally
{ "tool": "stack_start", "arguments": { "components": ["fork", "deploy"] } }
```

**Phase 3: Verify (Blockscout)**

After deploying to your local fork, verify state matches mainnet:

```json
// Check USDC balance of a whale address on mainnet
{ "tool": "blockscout.get_tokens_by_address", "arguments": { "chain_id": "8453", "address": "0x..." } }

// Verify your fork has the same state
// (Compare with local RPC calls)
```

**Phase 4: Test & Iterate**

```json
// Start frontend
{ "tool": "stack_start", "arguments": { "components": ["frontend"] } }

// Check logs if issues
{ "tool": "process_logs", "arguments": { "id": "frontend", "tail": 50 } }

// Make changes and redeploy
{ "tool": "project_writeFile", "arguments": { "path": "...", "content": "..." } }
{ "tool": "stack_start", "arguments": { "components": ["deploy"] } }
```

### When to Use Each MCP

**Use eth-mcp when:**
- Creating new projects
- Writing/modifying contracts
- Deploying to local fork
- Running frontend dev server
- Managing local processes

**Use Blockscout when:**
- Researching existing contracts
- Looking up mainnet addresses
- Analyzing transaction patterns
- Debugging by comparing mainnet state
- Verifying contract ABIs before integration
