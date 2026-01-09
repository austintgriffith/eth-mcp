/**
 * Process manager for ethereum-mcp
 * Spawns, tracks, and manages long-running processes
 */

import { spawn, ChildProcess } from "child_process";
import { isCommandAllowed, sanitizeOutput, getSafeEnv } from "./safety.js";

export interface ManagedProcess {
  id: string;
  command: string;
  args: string[];
  cwd: string;
  startedAt: number;
  status: "running" | "stopped" | "error";
  exitCode: number | null;
  pid: number | null;
}

interface ProcessEntry {
  process: ChildProcess;
  info: ManagedProcess;
  stdout: string[];
  stderr: string[];
  maxLogLines: number;
}

class ProcessManager {
  private processes: Map<string, ProcessEntry> = new Map();
  private maxLogLines = 1000;

  /**
   * Start a new managed process
   */
  async start(
    id: string,
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check if process with this ID already exists
    if (this.processes.has(id)) {
      const existing = this.processes.get(id)!;
      if (existing.info.status === "running") {
        return { success: false, error: `Process '${id}' is already running` };
      }
      // Clean up stopped process
      this.processes.delete(id);
    }

    // Validate command
    const fullCommand = `${command} ${args.join(" ")}`;
    const safetyCheck = isCommandAllowed(fullCommand);
    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.reason };
    }

    try {
      const proc = spawn(command, args, {
        cwd,
        env: getSafeEnv(),
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });

      const entry: ProcessEntry = {
        process: proc,
        info: {
          id,
          command,
          args,
          cwd,
          startedAt: Date.now(),
          status: "running",
          exitCode: null,
          pid: proc.pid || null,
        },
        stdout: [],
        stderr: [],
        maxLogLines: this.maxLogLines,
      };

      // Capture stdout
      proc.stdout?.on("data", (data: Buffer) => {
        const lines = sanitizeOutput(data.toString()).split("\n");
        entry.stdout.push(...lines);
        // Trim to max lines
        if (entry.stdout.length > entry.maxLogLines) {
          entry.stdout = entry.stdout.slice(-entry.maxLogLines);
        }
      });

      // Capture stderr
      proc.stderr?.on("data", (data: Buffer) => {
        const lines = sanitizeOutput(data.toString()).split("\n");
        entry.stderr.push(...lines);
        if (entry.stderr.length > entry.maxLogLines) {
          entry.stderr = entry.stderr.slice(-entry.maxLogLines);
        }
      });

      // Handle process exit
      proc.on("exit", (code) => {
        entry.info.status = code === 0 ? "stopped" : "error";
        entry.info.exitCode = code;
      });

      proc.on("error", (err) => {
        entry.info.status = "error";
        entry.stderr.push(`Process error: ${err.message}`);
      });

      this.processes.set(id, entry);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }

  /**
   * Stop a managed process
   */
  stop(id: string): { success: boolean; error?: string } {
    const entry = this.processes.get(id);
    if (!entry) {
      return { success: false, error: `Process '${id}' not found` };
    }

    if (entry.info.status !== "running") {
      return { success: false, error: `Process '${id}' is not running` };
    }

    try {
      entry.process.kill("SIGTERM");
      // Give it a moment, then force kill if needed
      setTimeout(() => {
        if (entry.info.status === "running") {
          entry.process.kill("SIGKILL");
        }
      }, 5000);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }

  /**
   * Get process info
   */
  getProcess(id: string): ManagedProcess | null {
    const entry = this.processes.get(id);
    return entry ? { ...entry.info } : null;
  }

  /**
   * List all processes
   */
  list(): ManagedProcess[] {
    return Array.from(this.processes.values()).map((entry) => ({ ...entry.info }));
  }

  /**
   * Get stdout logs for a process
   */
  getStdout(id: string, tail?: number): string[] | null {
    const entry = this.processes.get(id);
    if (!entry) return null;
    if (tail && tail > 0) {
      return entry.stdout.slice(-tail);
    }
    return [...entry.stdout];
  }

  /**
   * Get stderr logs for a process
   */
  getStderr(id: string, tail?: number): string[] | null {
    const entry = this.processes.get(id);
    if (!entry) return null;
    if (tail && tail > 0) {
      return entry.stderr.slice(-tail);
    }
    return [...entry.stderr];
  }

  /**
   * Get combined logs for a process
   */
  getLogs(id: string, tail?: number): { stdout: string[]; stderr: string[] } | null {
    const entry = this.processes.get(id);
    if (!entry) return null;
    return {
      stdout: tail ? entry.stdout.slice(-tail) : [...entry.stdout],
      stderr: tail ? entry.stderr.slice(-tail) : [...entry.stderr],
    };
  }

  /**
   * Check if a process is running
   */
  isRunning(id: string): boolean {
    const entry = this.processes.get(id);
    return entry?.info.status === "running";
  }

  /**
   * Stop all running processes
   */
  stopAll(): void {
    for (const [id, entry] of this.processes) {
      if (entry.info.status === "running") {
        this.stop(id);
      }
    }
  }

  /**
   * Clean up stopped processes
   */
  cleanup(): void {
    for (const [id, entry] of this.processes) {
      if (entry.info.status !== "running") {
        this.processes.delete(id);
      }
    }
  }
}

// Singleton instance
export const processManager = new ProcessManager();

// Cleanup on exit
process.on("exit", () => {
  processManager.stopAll();
});

process.on("SIGINT", () => {
  processManager.stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  processManager.stopAll();
  process.exit(0);
});
