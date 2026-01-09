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
