/**
 * Safety utilities for ethereum-mcp
 * Enforces command allowlist and prevents private key exposure
 */

// Allowed commands that can be executed
const ALLOWED_COMMANDS = new Set([
  "git",
  "yarn",
  "pnpm",
  "npm",
  "npx",
  "forge",
  "anvil",
  "cast",
  "node",
]);

// Allowed yarn/npm scripts
const ALLOWED_SCRIPTS = new Set([
  "install",
  "dev",
  "start",
  "build",
  "deploy",
  "fork",
  "chain",
  "verify",
  "compile",
  "test",
  "generate",
  "account",
  "flatten",
]);

// Patterns that indicate private key exposure
const PRIVATE_KEY_PATTERNS = [
  /0x[a-fA-F0-9]{64}/g, // 32-byte hex (private key format)
  /DEPLOYER_PRIVATE_KEY\s*=\s*\S+/gi,
  /PRIVATE_KEY\s*=\s*\S+/gi,
  /secret[_-]?key\s*[:=]\s*\S+/gi,
  /mnemonic\s*[:=]\s*.+/gi,
];

// Mainnet RPC URLs that should be blocked for writes
const MAINNET_RPC_PATTERNS = [
  /mainnet\.infura\.io/i,
  /eth-mainnet\.g\.alchemy\.com/i,
  /api\.etherscan\.io/i,
  /cloudflare-eth\.com/i,
];

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Check if a command is in the allowlist
 */
export function isCommandAllowed(command: string): SafetyCheckResult {
  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0];

  if (!ALLOWED_COMMANDS.has(baseCommand)) {
    return {
      safe: false,
      reason: `Command '${baseCommand}' is not in the allowlist. Allowed: ${Array.from(ALLOWED_COMMANDS).join(", ")}`,
    };
  }

  // For package managers, validate the script
  if (["yarn", "npm", "pnpm"].includes(baseCommand)) {
    const script = parts[1];
    if (script && !ALLOWED_SCRIPTS.has(script) && !script.startsWith("-")) {
      // Allow flags and known scripts
      const isFlag = script.startsWith("-");
      const isRun = script === "run" && parts[2] && ALLOWED_SCRIPTS.has(parts[2]);
      if (!isFlag && !isRun) {
        return {
          safe: false,
          reason: `Script '${script}' is not in the allowlist. Allowed: ${Array.from(ALLOWED_SCRIPTS).join(", ")}`,
        };
      }
    }
  }

  return { safe: true };
}

/**
 * Sanitize output to remove any private keys
 */
export function sanitizeOutput(output: string): string {
  let sanitized = output;

  for (const pattern of PRIVATE_KEY_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized;
}

/**
 * Check if content contains private keys
 */
export function containsPrivateKey(content: string): boolean {
  for (const pattern of PRIVATE_KEY_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
  }
  return false;
}

/**
 * Check if an RPC URL is a mainnet URL (should block writes)
 */
export function isMainnetRpc(url: string): boolean {
  for (const pattern of MAINNET_RPC_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate file path is within workspace
 */
export function isPathSafe(filePath: string, workspacePath: string): SafetyCheckResult {
  const normalizedFile = filePath.replace(/\\/g, "/");
  const normalizedWorkspace = workspacePath.replace(/\\/g, "/");

  // Check for path traversal
  if (normalizedFile.includes("..")) {
    // Resolve the path and check it's still within workspace
    const resolved = require("path").resolve(workspacePath, filePath);
    if (!resolved.startsWith(normalizedWorkspace)) {
      return {
        safe: false,
        reason: "Path traversal detected - file must be within workspace",
      };
    }
  }

  // Block access to sensitive files
  const sensitivePatterns = [
    /\.env$/i,
    /\.env\.local$/i,
    /\.env\.production$/i,
    /private[_-]?key/i,
    /\.pem$/i,
    /\.key$/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(normalizedFile)) {
      return {
        safe: false,
        reason: `Access to sensitive file pattern blocked: ${pattern}`,
      };
    }
  }

  return { safe: true };
}

/**
 * Validate content before writing (no private keys)
 */
export function validateWriteContent(content: string): SafetyCheckResult {
  if (containsPrivateKey(content)) {
    return {
      safe: false,
      reason: "Content appears to contain private keys or secrets",
    };
  }
  return { safe: true };
}

/**
 * Get safe environment variables for subprocess
 * Removes any private key environment variables
 */
export function getSafeEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const unsafeKeys = [
    "DEPLOYER_PRIVATE_KEY",
    "PRIVATE_KEY",
    "SECRET_KEY",
    "MNEMONIC",
  ];

  for (const [key, value] of Object.entries(process.env)) {
    if (value && !unsafeKeys.includes(key.toUpperCase())) {
      env[key] = value;
    }
  }

  return env;
}

// ============================================================
// CRITICAL PATTERN VALIDATION
// These patterns BLOCK file writes when detected
// ============================================================

export interface CriticalViolation {
  message: string;
  fix: string;
  match: string;
  line?: number;
}

export interface CriticalValidationResult {
  valid: boolean;
  violations: CriticalViolation[];
}

/**
 * Critical patterns that BLOCK writes
 * Each pattern has:
 * - pattern: RegExp to match
 * - message: Human-readable description of the violation
 * - fix: How to fix it
 * - fileTypes: Which file extensions to check (optional, defaults to all)
 */
const CRITICAL_VIOLATIONS: Array<{
  pattern: RegExp;
  message: string;
  fix: string;
  fileTypes?: string[];
}> = [
  // ============================================================
  // SECURITY VIOLATIONS
  // ============================================================
  
  // Infinite token approvals - major security risk
  // Matches: .approve(x, max), approve(x, max), writeContractAsync with approve and max
  {
    pattern: /\.?approve\s*\(\s*[^,]+,\s*(?:type\s*\(\s*uint256\s*\)\s*\.max|ethers\.MaxUint256|MaxUint256|MAX_UINT256|2n?\s*\*\*\s*256n?\s*-\s*1n?|BigInt\s*\(\s*2\s*\)\s*\*\*\s*BigInt\s*\(\s*256\s*\)|"0x[fF]{64}")/gi,
    message: "Infinite token approval (security risk)",
    fix: "Approve only the specific amount needed, not max uint256. Example: approve(spender, depositAmount)",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // ============================================================
  // HARDCODED ADDRESS VIOLATIONS
  // ============================================================
  
  // Hardcoded addresses in variable declarations
  {
    pattern: /(?:const|let|var)\s+\w*(?:ADDRESS|ADDR|CONTRACT|TOKEN|VAULT|POOL|ROUTER|FACTORY)\w*\s*[:=]\s*["'`]0x[a-fA-F0-9]{40}["'`]/gi,
    message: "Hardcoded contract address in variable",
    fix: "Use useDeployedContractInfo('ContractName') for your contracts or add external contracts to externalContracts.ts via stack_configureExternalContracts",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // Hardcoded addresses as function arguments (common mistake)
  {
    pattern: /args:\s*\[\s*["'`]0x[a-fA-F0-9]{40}["'`]/gi,
    message: "Hardcoded address in function arguments",
    fix: "Get addresses dynamically: const { data: contractInfo } = useDeployedContractInfo('ContractName'); then use contractInfo?.address",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // ============================================================
  // RAW WAGMI HOOK VIOLATIONS
  // ============================================================
  
  // Importing raw wagmi hooks for contract interaction
  {
    pattern: /import\s*\{[^}]*\b(?:useReadContract|useWriteContract|useContractRead|useContractWrite)\b[^}]*\}\s*from\s*["'`]wagmi["'`]/gi,
    message: "Raw wagmi hook import (use scaffold-eth hooks instead)",
    fix: "Import from scaffold-eth: import { useScaffoldReadContract, useScaffoldWriteContract } from '~~/hooks/scaffold-eth'",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // Using raw wagmi hooks with address parameter
  {
    pattern: /\buseReadContract\s*\(\s*\{\s*(?:[^}]*\n)*?\s*address\s*:/gi,
    message: "Raw wagmi useReadContract with address parameter",
    fix: "Use useScaffoldReadContract({ contractName: 'YourContract', functionName: 'functionName' }) - addresses come from deployedContracts.ts automatically",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  {
    pattern: /\buseWriteContract\s*\(\s*\{\s*(?:[^}]*\n)*?\s*address\s*:/gi,
    message: "Raw wagmi useWriteContract with address parameter",
    fix: "Use useScaffoldWriteContract('YourContract') - addresses come from deployedContracts.ts automatically",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // ============================================================
  // OLD HOOK NAME VIOLATIONS
  // ============================================================
  
  // Old scaffold-eth hook names that no longer exist
  {
    pattern: /\buseScaffoldContractRead\b/g,
    message: "Old scaffold-eth hook name (doesn't exist anymore)",
    fix: "Use useScaffoldReadContract (the new name)",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  {
    pattern: /\buseScaffoldContractWrite\b/g,
    message: "Old scaffold-eth hook name (doesn't exist anymore)",
    fix: "Use useScaffoldWriteContract (the new name)",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // ============================================================
  // DANGEROUS CONFIG VIOLATIONS
  // ============================================================
  
  // Enabling burner wallets on mainnet (dangerous!)
  {
    pattern: /onlyLocalBurnerWallet\s*:\s*false/g,
    message: "Dangerous config: enables burner wallets on mainnet",
    fix: "Keep onlyLocalBurnerWallet: true (the default). Setting it to false enables burner wallets on mainnet which is a security risk!",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
];

/**
 * Warning patterns that DON'T block but should be flagged
 */
const WARNING_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  fix: string;
  fileTypes?: string[];
}> = [
  // Inline ABI definitions (usually redundant)
  {
    pattern: /(?:const|let|var)\s+\w*ABI\w*\s*[:=]\s*\[/gi,
    message: "Inline ABI definition (usually redundant)",
    fix: "ABIs should come from deployedContracts.ts or externalContracts.ts automatically. Use stack_configureExternalContracts to add external protocol ABIs.",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
  
  // Generic hardcoded address (could be user input, so just warn)
  {
    pattern: /["'`]0x[a-fA-F0-9]{40}["'`]/g,
    message: "Hardcoded Ethereum address detected",
    fix: "If this is a contract address, use useDeployedContractInfo() or add to externalContracts.ts. If it's user input, this warning can be ignored.",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
  },
];

/**
 * Check if a file type matches the pattern's allowed file types
 */
function matchesFileType(filePath: string, fileTypes?: string[]): boolean {
  if (!fileTypes || fileTypes.length === 0) {
    return true; // No restriction, match all
  }
  
  const lowerPath = filePath.toLowerCase();
  return fileTypes.some(ext => lowerPath.endsWith(ext));
}

/**
 * Find line number for a match in content
 */
function findLineNumber(content: string, matchIndex: number): number {
  const beforeMatch = content.substring(0, matchIndex);
  return (beforeMatch.match(/\n/g) || []).length + 1;
}

/**
 * Validate content for critical pattern violations that should BLOCK writes
 * 
 * @param content - The file content to validate
 * @param filePath - The file path (used to determine file type)
 * @returns Validation result with any violations found
 */
export function validateCriticalPatterns(
  content: string,
  filePath: string
): CriticalValidationResult {
  const violations: CriticalViolation[] = [];
  
  for (const { pattern, message, fix, fileTypes } of CRITICAL_VIOLATIONS) {
    // Skip if file type doesn't match
    if (!matchesFileType(filePath, fileTypes)) {
      continue;
    }
    
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      violations.push({
        message,
        fix,
        match: match[0].length > 100 ? match[0].substring(0, 100) + "..." : match[0],
        line: findLineNumber(content, match.index),
      });
      
      // For non-global patterns, break after first match
      if (!pattern.global) {
        break;
      }
    }
    
    // Reset lastIndex again for next iteration
    pattern.lastIndex = 0;
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Get warning-level patterns (don't block, but flag)
 * Used by the lintAll tool for comprehensive scanning
 * 
 * @param content - The file content to check
 * @param filePath - The file path (used to determine file type)
 * @returns Array of warnings found
 */
export function getWarningPatterns(
  content: string,
  filePath: string
): Array<{ message: string; fix: string; match: string; line: number }> {
  const warnings: Array<{ message: string; fix: string; match: string; line: number }> = [];
  
  for (const { pattern, message, fix, fileTypes } of WARNING_PATTERNS) {
    // Skip if file type doesn't match
    if (!matchesFileType(filePath, fileTypes)) {
      continue;
    }
    
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Skip if this is already caught as a critical violation
      // (e.g., a hardcoded address that's also in a variable)
      const alreadyCritical = CRITICAL_VIOLATIONS.some(cv => {
        cv.pattern.lastIndex = 0;
        const isCritical = cv.pattern.test(match![0]);
        cv.pattern.lastIndex = 0;
        return isCritical;
      });
      
      if (!alreadyCritical) {
        warnings.push({
          message,
          fix,
          match: match[0].length > 100 ? match[0].substring(0, 100) + "..." : match[0],
          line: findLineNumber(content, match.index),
        });
      }
      
      // For non-global patterns, break after first match
      if (!pattern.global) {
        break;
      }
    }
    
    // Reset lastIndex again for next iteration
    pattern.lastIndex = 0;
  }
  
  return warnings;
}
