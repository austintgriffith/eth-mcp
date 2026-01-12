/**
 * Project tools for ethereum-mcp
 * Tools for reading and writing project files
 */

import * as fs from "fs/promises";
import * as path from "path";
import { stateManager } from "../state.js";
import { 
  isPathSafe, 
  validateWriteContent, 
  sanitizeOutput,
  validateCriticalPatterns,
  getWarningPatterns,
} from "../safety.js";

/**
 * Banned patterns for frontend design lint
 */
const DESIGN_LINT_PATTERNS = [
  { pattern: /\bpurple\b/gi, message: "purple color", severity: "error" as const },
  { pattern: /\bviolet\b/gi, message: "violet color", severity: "error" as const },
  { pattern: /\blavender\b/gi, message: "lavender color", severity: "error" as const },
  { pattern: /\bindigo\b/gi, message: "indigo color", severity: "error" as const },
  { pattern: /\bfuchsia\b/gi, message: "fuchsia color", severity: "error" as const },
  { pattern: /bg-gradient-/gi, message: "gradient background (bg-gradient-*)", severity: "error" as const },
  { pattern: /from-purple|from-violet|from-indigo|from-pink|from-fuchsia/gi, message: "purple-adjacent gradient", severity: "error" as const },
  { pattern: /to-purple|to-violet|to-indigo|to-pink|to-fuchsia/gi, message: "purple-adjacent gradient", severity: "error" as const },
  { pattern: /backdrop-blur/gi, message: "glassmorphism (backdrop-blur)", severity: "error" as const },
  { pattern: /backdrop-filter/gi, message: "glassmorphism (backdrop-filter)", severity: "error" as const },
  { pattern: /shadow-lg\b/gi, message: "shadow-lg (max is shadow-md)", severity: "warning" as const },
  { pattern: /shadow-xl\b/gi, message: "shadow-xl (max is shadow-md)", severity: "error" as const },
  { pattern: /shadow-2xl\b/gi, message: "shadow-2xl (max is shadow-md)", severity: "error" as const },
  { pattern: /shadow-.*purple|shadow-.*violet|shadow-.*indigo|shadow-.*pink/gi, message: "colored shadow (purple-adjacent)", severity: "error" as const },
  { pattern: /text-transparent.*bg-clip-text.*bg-gradient/gi, message: "gradient text effect", severity: "error" as const },
  { pattern: /bg-opacity-.*backdrop/gi, message: "glassmorphism pattern", severity: "warning" as const },
];

export const projectTools = {
  /**
   * project.readFile - Read a file from the project
   */
  readFile: {
    name: "project_readFile",
    description: `Read a file from the Scaffold-ETH project.
Path should be relative to the project root.
Cannot read .env files or files containing private keys.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative path to the file (e.g., 'packages/foundry/contracts/YourContract.sol')",
        },
      },
      required: ["path"],
    },
    handler: async (args: { path: string }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      const fullPath = path.join(state.workspacePath, args.path);

      // Safety check
      const safetyCheck = isPathSafe(args.path, state.workspacePath);
      if (!safetyCheck.safe) {
        return { success: false, error: safetyCheck.reason };
      }

      try {
        const content = await fs.readFile(fullPath, "utf-8");
        return {
          success: true,
          path: args.path,
          content: sanitizeOutput(content),
          size: content.length,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },

  /**
   * project.writeFile - Write a file to the project
   */
  writeFile: {
    name: "project_writeFile",
    description: `Write content to a file in the Scaffold-ETH project.
Path should be relative to the project root.
Cannot write to .env files or write content containing private keys.
Creates parent directories if they don't exist.

IMPORTANT: After writing frontend files, you MUST review the code against critical rules.
The response will include a REVIEW_REQUIRED section with instructions.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative path to the file",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
    handler: async (args: { path: string; content: string }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      const fullPath = path.join(state.workspacePath, args.path);

      // Safety checks
      const pathCheck = isPathSafe(args.path, state.workspacePath);
      if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
      }

      const contentCheck = validateWriteContent(args.content);
      if (!contentCheck.safe) {
        return { success: false, error: contentCheck.reason };
      }

      try {
        // Create directory if needed
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(fullPath, args.content, "utf-8");

        // Check if this is a frontend file that needs review
        const isFrontendFile = args.path.includes("/nextjs/") && 
          (args.path.endsWith(".tsx") || args.path.endsWith(".jsx") || 
           args.path.endsWith(".ts") || args.path.endsWith(".js"));
        
        // Check if this is a config file that needs review
        const isConfigFile = args.path.includes("scaffold.config") || 
                            args.path.includes("wagmi.config") ||
                            args.path.includes("externalContracts");

        // Build the review instruction for frontend/config files
        const reviewRequired = (isFrontendFile || isConfigFile) ? {
          REVIEW_REQUIRED: {
            instruction: "You MUST now review the code you just wrote against the critical rules.",
            action: "Read resource://critical-rules/review and check the code above for violations.",
            rules_to_check: [
              "No hardcoded contract addresses (0x... strings used as contract addresses)",
              "No raw wagmi hooks (useReadContract, useWriteContract) - use scaffold-eth hooks",
              "No old hook names (useScaffoldContractRead → useScaffoldReadContract)",
              "No infinite token approvals (MaxUint256, type(uint256).max)",
              "No dangerous config (onlyLocalBurnerWallet: false)",
            ],
            if_violations_found: "Report each violation with the specific line/code and the correct fix. Then rewrite the file with corrections.",
            resource_uri: "resource://critical-rules/review",
          },
        } : {};

        // Quick regex checks as a safety net (not blocking, just flagging)
        const potentialIssues: string[] = [];
        
        if (isFrontendFile) {
          // Check for obvious hardcoded addresses
          if (/["'`]0x[a-fA-F0-9]{40}["'`]/.test(args.content)) {
            potentialIssues.push("Potential hardcoded address detected - verify this is not a contract address");
          }
          
          // Check for raw wagmi contract hooks
          if (/import\s*{[^}]*\b(useReadContract|useWriteContract)\b[^}]*}\s*from\s*["'`]wagmi["'`]/.test(args.content)) {
            potentialIssues.push("Raw wagmi contract hook import detected - should use scaffold-eth hooks");
          }
          
          // Check for old hook names
          if (/useScaffoldContractRead|useScaffoldContractWrite/.test(args.content)) {
            potentialIssues.push("Old scaffold-eth hook name detected - use useScaffoldReadContract/useScaffoldWriteContract");
          }
          
          // Check for infinite approvals
          if (/approve\s*\([^)]*(?:MaxUint|type\s*\(\s*uint256\s*\)\s*\.max|2n?\s*\*\*\s*256)/i.test(args.content)) {
            potentialIssues.push("Potential infinite approval detected - security risk");
          }
        }
        
        if (isConfigFile) {
          // Check for dangerous burner wallet config
          if (/onlyLocalBurnerWallet\s*:\s*false/.test(args.content)) {
            potentialIssues.push("DANGEROUS: onlyLocalBurnerWallet set to false - this enables burner wallets on mainnet!");
          }
        }

        const flaggedIssues = potentialIssues.length > 0 ? {
          FLAGGED_ISSUES: potentialIssues,
          NOTE: "These are pattern-matched flags. Do a semantic review to confirm if they are actual violations.",
        } : {};

        return {
          success: true,
          path: args.path,
          bytesWritten: args.content.length,
          ...reviewRequired,
          ...flaggedIssues,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },

  /**
   * project.listFiles - List files in a directory
   */
  listFiles: {
    name: "project_listFiles",
    description: `List files in a project directory.
Path should be relative to the project root.
Use to explore the project structure.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative path to the directory (default: root)",
        },
        recursive: {
          type: "boolean",
          description: "List files recursively (default: false)",
        },
      },
      required: [],
    },
    handler: async (args: { path?: string; recursive?: boolean }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      const targetPath = args.path
        ? path.join(state.workspacePath, args.path)
        : state.workspacePath;

      try {
        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        const files: string[] = [];
        const directories: string[] = [];

        for (const entry of entries) {
          // Skip hidden files and node_modules
          if (entry.name.startsWith(".") || entry.name === "node_modules") {
            continue;
          }

          if (entry.isDirectory()) {
            directories.push(entry.name + "/");
            if (args.recursive) {
              // Recursively list subdirectory
              const subPath = args.path ? path.join(args.path, entry.name) : entry.name;
              const subResult = await projectTools.listFiles.handler({
                path: subPath,
                recursive: true,
              });
              if (subResult.success && subResult.files) {
                files.push(
                  ...subResult.files.map((f: string) => path.join(entry.name, f))
                );
              }
            }
          } else {
            files.push(entry.name);
          }
        }

        return {
          success: true,
          path: args.path || "/",
          directories,
          files,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    },
  },

  /**
   * frontend.lintDesign - Scan frontend files for banned design patterns
   */
  lintDesign: {
    name: "frontend_lintDesign",
    description: `Scan frontend files for banned design patterns (purple gradients, glassmorphism, etc.).

Use this tool to verify frontend code follows eth-mcp design guidelines BEFORE finishing any frontend work.

Scans for:
- Purple/violet/indigo/lavender colors (BANNED)
- Gradient backgrounds (BANNED)
- Glassmorphism/blur effects (BANNED)
- Excessive shadows > shadow-md (BANNED)
- Purple-adjacent gradient combinations (BANNED)

Returns errors and warnings with line numbers and suggested fixes.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative path to file or directory to lint (e.g., 'packages/nextjs/app/page.tsx' or 'packages/nextjs/components')",
        },
      },
      required: ["path"],
    },
    handler: async (args: { path: string }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      const fullPath = path.join(state.workspacePath, args.path);

      // Check if path exists and is file or directory
      let filesToLint: string[] = [];
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          // Get all .tsx and .jsx files in the directory
          const entries = await fs.readdir(fullPath, { withFileTypes: true, recursive: true });
          for (const entry of entries) {
            if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx"))) {
              const entryPath = path.join(entry.parentPath || entry.path || fullPath, entry.name);
              filesToLint.push(entryPath);
            }
          }
        } else {
          filesToLint = [fullPath];
        }
      } catch {
        return { success: false, error: `Path not found: ${args.path}` };
      }

      if (filesToLint.length === 0) {
        return { success: true, message: "No .tsx/.jsx files found to lint", violations: [] };
      }

      const allViolations: Array<{
        file: string;
        line: number;
        message: string;
        severity: "error" | "warning";
        match: string;
      }> = [];

      for (const filePath of filesToLint) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");
          const relativePath = path.relative(state.workspacePath, filePath);

          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            for (const { pattern, message, severity } of DESIGN_LINT_PATTERNS) {
              // Reset regex lastIndex for global patterns
              pattern.lastIndex = 0;
              const match = pattern.exec(line);
              if (match) {
                allViolations.push({
                  file: relativePath,
                  line: lineNum + 1,
                  message,
                  severity,
                  match: match[0],
                });
              }
            }
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      const errors = allViolations.filter((v) => v.severity === "error");
      const warnings = allViolations.filter((v) => v.severity === "warning");

      return {
        success: errors.length === 0,
        filesScanned: filesToLint.length,
        summary: {
          errors: errors.length,
          warnings: warnings.length,
          passed: errors.length === 0 && warnings.length === 0,
        },
        violations: allViolations,
        ...(errors.length > 0 ? {
          ACTION_REQUIRED: "Fix all errors before proceeding. Replace banned patterns with DaisyUI theme tokens.",
          fixes: {
            "purple/violet/indigo colors": "Use theme colors: primary, secondary, accent, or base-100/200/300",
            "gradient backgrounds": "Use solid colors: bg-base-100, bg-base-200, bg-primary",
            "glassmorphism": "Use solid backgrounds with border: bg-base-100 border border-base-300",
            "large shadows": "Use shadow-sm or shadow-md only",
          },
        } : {
          message: "All files pass design lint! ✓",
        }),
      };
    },
  },

  /**
   * frontend.validateAll - Comprehensive validation of all critical rules
   */
  validateAll: {
    name: "frontend_validateAll",
    description: `Scan entire frontend for ALL critical rule violations.

This tool performs a comprehensive scan of your frontend code for:

CRITICAL (would block writes):
- Hardcoded contract addresses (use useDeployedContractInfo instead)
- Raw wagmi hooks (use scaffold-eth hooks)
- Infinite token approvals (security risk!)
- Old hook names (useScaffoldContractRead → useScaffoldReadContract)
- Dangerous config changes (onlyLocalBurnerWallet: false)

WARNINGS (non-blocking):
- Inline ABI definitions (should use deployedContracts/externalContracts)
- Generic hardcoded addresses (may be intentional)

Use this tool to audit your codebase before deployment or to find existing issues.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative path to scan (default: 'packages/nextjs')",
        },
        includeWarnings: {
          type: "boolean",
          description: "Include warning-level issues in results (default: true)",
        },
      },
      required: [],
    },
    handler: async (args: { path?: string; includeWarnings?: boolean }) => {
      const state = stateManager.getState();

      if (!state.initialized || !state.workspacePath) {
        return { success: false, error: "Stack not initialized. Run stack.init first." };
      }

      const targetPath = args.path || "packages/nextjs";
      const includeWarnings = args.includeWarnings !== false;
      const fullPath = path.join(state.workspacePath, targetPath);

      // Find all relevant files
      let filesToScan: string[] = [];
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const entries = await fs.readdir(fullPath, { withFileTypes: true, recursive: true });
          for (const entry of entries) {
            if (entry.isFile() && 
                (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx") ||
                 entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
                !entry.name.includes("node_modules")) {
              const entryPath = path.join(entry.parentPath || entry.path || fullPath, entry.name);
              // Skip node_modules and .next directories
              if (!entryPath.includes("node_modules") && !entryPath.includes(".next")) {
                filesToScan.push(entryPath);
              }
            }
          }
        } else {
          filesToScan = [fullPath];
        }
      } catch {
        return { success: false, error: `Path not found: ${targetPath}` };
      }

      if (filesToScan.length === 0) {
        return { 
          success: true, 
          message: "No TypeScript/JavaScript files found to scan", 
          criticalViolations: [],
          warnings: [],
        };
      }

      const allCritical: Array<{
        file: string;
        line: number;
        message: string;
        match: string;
        fix: string;
      }> = [];

      const allWarnings: Array<{
        file: string;
        line: number;
        message: string;
        match: string;
        fix: string;
      }> = [];

      for (const filePath of filesToScan) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const relativePath = path.relative(state.workspacePath, filePath);

          // Check critical patterns
          const criticalResult = validateCriticalPatterns(content, filePath);
          for (const violation of criticalResult.violations) {
            allCritical.push({
              file: relativePath,
              line: violation.line || 0,
              message: violation.message,
              match: violation.match,
              fix: violation.fix,
            });
          }

          // Check warning patterns
          if (includeWarnings) {
            const warnings = getWarningPatterns(content, filePath);
            for (const warning of warnings) {
              allWarnings.push({
                file: relativePath,
                line: warning.line,
                message: warning.message,
                match: warning.match,
                fix: warning.fix,
              });
            }
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      const passed = allCritical.length === 0;

      return {
        success: passed,
        filesScanned: filesToScan.length,
        summary: {
          critical: allCritical.length,
          warnings: allWarnings.length,
          passed,
        },
        ...(allCritical.length > 0 ? {
          CRITICAL_VIOLATIONS: allCritical,
          ACTION_REQUIRED: `Found ${allCritical.length} critical violation(s) that would BLOCK writes. Fix these issues to ensure code quality and security.`,
          COMMON_FIXES: {
            "Hardcoded address": "Use useDeployedContractInfo('ContractName') to get addresses dynamically",
            "Raw wagmi hooks": "Use useScaffoldReadContract/useScaffoldWriteContract from '~~/hooks/scaffold-eth'",
            "Infinite approval": "Approve only the specific amount needed: approve(spender, amount)",
            "Old hook names": "useScaffoldContractRead → useScaffoldReadContract, useScaffoldContractWrite → useScaffoldWriteContract",
            "Dangerous config": "Keep onlyLocalBurnerWallet: true (the default is correct)",
          },
        } : {
          message: "All files pass critical validation! ✓",
        }),
        ...(allWarnings.length > 0 ? {
          WARNINGS: allWarnings,
          WARNING_NOTE: "These are warnings that don't block writes but should be reviewed.",
        } : {}),
      };
    },
  },
};
