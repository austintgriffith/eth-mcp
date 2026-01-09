/**
 * Process tools for ethereum-mcp
 * Tools for managing and inspecting running processes
 */

import { processManager } from "../process-manager.js";

export const processTools = {
  /**
   * process.list - List all managed processes
   */
  list: {
    name: "process_list",
    description: `List all managed processes and their status.
Shows process ID, command, status, PID, and start time.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const processes = processManager.list();
      return {
        count: processes.length,
        processes: processes.map((p) => ({
          id: p.id,
          command: `${p.command} ${p.args.join(" ")}`,
          status: p.status,
          pid: p.pid,
          startedAt: new Date(p.startedAt).toISOString(),
          exitCode: p.exitCode,
        })),
      };
    },
  },

  /**
   * process.logs - Get logs for a process
   */
  logs: {
    name: "process_logs",
    description: `Get stdout and stderr logs for a managed process.
Use tail parameter to get only the last N lines.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Process ID (e.g., 'fork', 'frontend')",
        },
        tail: {
          type: "number",
          description: "Number of lines to return (from the end)",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string; tail?: number }) => {
      const logs = processManager.getLogs(args.id, args.tail);
      if (!logs) {
        return { success: false, error: `Process '${args.id}' not found` };
      }

      const process = processManager.getProcess(args.id);
      return {
        success: true,
        processId: args.id,
        status: process?.status || "unknown",
        stdout: logs.stdout.join("\n"),
        stderr: logs.stderr.join("\n"),
        lineCount: {
          stdout: logs.stdout.length,
          stderr: logs.stderr.length,
        },
      };
    },
  },

  /**
   * process.stop - Stop a specific process
   */
  stop: {
    name: "process_stop",
    description: "Stop a specific managed process by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Process ID to stop",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }) => {
      return processManager.stop(args.id);
    },
  },
};
