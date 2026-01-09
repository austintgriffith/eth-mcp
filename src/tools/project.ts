/**
 * Project tools for ethereum-mcp
 * Tools for reading and writing project files
 */

import * as fs from "fs/promises";
import * as path from "path";
import { stateManager } from "../state.js";
import { isPathSafe, validateWriteContent, sanitizeOutput } from "../safety.js";

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

        return {
          success: true,
          path: args.path,
          bytesWritten: args.content.length,
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
};
