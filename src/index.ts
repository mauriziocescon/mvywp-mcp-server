import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// 1. Initialize the server
const server = new Server(
  {
    name: 'my-automation-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // Enable tools capability
    },
  },
);

// 2. Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'check_translation_key',
        description: 'Checks if a translation key exists in the local i18n files',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'The translation key, e.g., \'cc.task-details.SNC\'' },
          },
          required: ['key'],
        },
      },
    ],
  };
});

// 3. Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'check_translation_key') {
    const key = request.params.arguments?.key as string;

    // Logic to search your files would go here
    // For now, we'll return a mock response
    console.error(`Checking key: ${key}`); // Log to stderr so it doesn't break the protocol

    return {
      content: [
        {
          type: 'text',
          text: `The key '${key}' was found in assets/i18n/en.json.`,
        },
      ],
    };
  }
  throw new Error('Tool not found');
});

// 4. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
