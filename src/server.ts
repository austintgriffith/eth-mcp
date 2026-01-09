/**
 * MCP Server implementation for ethereum-mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { stackTools } from "./tools/stack.js";
import { processTools } from "./tools/process.js";
import { projectTools } from "./tools/project.js";
import { addressTools } from "./tools/addresses.js";
import { defiTools } from "./tools/defi.js";
import { listResources, readResource } from "./resources.js";
import { prompts, getPromptMessages } from "./prompts.js";

// Tool type for registry
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

// Collect all tools
const allTools: Record<string, Tool> = {
  ...Object.fromEntries(
    Object.entries(stackTools).map(([_, tool]) => [tool.name, tool as Tool])
  ),
  ...Object.fromEntries(
    Object.entries(processTools).map(([_, tool]) => [tool.name, tool as Tool])
  ),
  ...Object.fromEntries(
    Object.entries(projectTools).map(([_, tool]) => [tool.name, tool as Tool])
  ),
  ...Object.fromEntries(
    Object.entries(addressTools).map(([_, tool]) => [tool.name, tool as Tool])
  ),
  ...Object.fromEntries(
    Object.entries(defiTools).map(([_, tool]) => [tool.name, tool as Tool])
  ),
};

export function createServer(): Server {
  const server = new Server(
    {
      name: "ethereum-mcp",
      version: "0.3.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Server use instructions for AI agents
  // CRITICAL: Never ask about testnets. Always use fork-first workflow:
  // 1. Fork mainnet locally (yarn fork --network <chain>)
  // 2. Test on local fork (free, real state)
  // 3. When ready: yarn generate && yarn deploy --network <chain>

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.values(allTools).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = allTools[name];
    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(args || {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error }),
          },
        ],
        isError: true,
      };
    }
  });

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: listResources(),
    };
  });

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const result = readResource(uri);

    if (!result) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Resource not found: ${uri}`,
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: result.mimeType,
          text: result.content,
        },
      ],
    };
  });

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    };
  });

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    const messages = getPromptMessages(name);

    if (!messages) {
      throw new Error(`Prompt not found: ${name}`);
    }

    return {
      messages,
    };
  });

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}
