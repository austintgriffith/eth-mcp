/**
 * Project tools for ethereum-mcp
 * Tools for reading and writing project files
 */

import * as fs from "fs/promises";
import * as path from "path";
import { stateManager } from "../state.js";
import { isPathSafe, validateWriteContent, sanitizeOutput } from "../safety.js";

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
Creates parent directories if they don't exist.`,
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

        // Check if this is a frontend component file - inject design rules reminder
        const isFrontendFile = args.path.includes("/nextjs/") && 
          (args.path.endsWith(".tsx") || args.path.endsWith(".jsx"));
        
        // Detect banned patterns in the content
        const bannedPatterns = [];
        if (/\bpurple\b|\bviolet\b|\blavender\b|\bindigo\b/i.test(args.content)) {
          bannedPatterns.push("purple/violet/indigo colors detected");
        }
        if (/bg-gradient-|from-.*-\d+\s+to-/i.test(args.content)) {
          bannedPatterns.push("gradient background detected");
        }
        if (/backdrop-blur|backdrop-filter/i.test(args.content)) {
          bannedPatterns.push("glassmorphism/blur effect detected");
        }
        if (/shadow-lg|shadow-xl|shadow-2xl/i.test(args.content)) {
          bannedPatterns.push("excessive shadow detected (max is shadow-md)");
        }

        const designWarning = isFrontendFile && bannedPatterns.length > 0 ? {
          DESIGN_VIOLATIONS: bannedPatterns,
          ACTION_REQUIRED: "These patterns violate eth-mcp frontend design rules. Revise the component to use DaisyUI theme tokens and remove banned patterns.",
          FIX: "Use: bg-base-100, bg-base-200, btn btn-primary, card, shadow-sm/shadow-md. NO purple, NO gradients."
        } : isFrontendFile ? {
          DESIGN_CHECK: "Frontend file written. Verify: no purple/gradients, using DaisyUI components (btn, card, input), shadow-md max."
        } : {};

        return {
          success: true,
          path: args.path,
          bytesWritten: args.content.length,
          ...designWarning,
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
};
