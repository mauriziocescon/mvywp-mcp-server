import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { updateDependencies } from './update_dependencies.js';
import { validateTranslations } from './validate_translations.js';

// 1. Initialize the server
const server = new Server(
  {
    name: 'mywp-automation-server',
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
        name: 'validate_translations',
        description: 'Finds translation keys in code and checks if they exist in all i18n language files',
        inputSchema: {
          type: 'object',
          properties: {
            fileContent: { type: 'string', description: 'The content of the file to scan for translation keys' },
            filePath: { type: 'string', description: 'The absolute path of the file being validated' },
          },
          required: ['fileContent', 'filePath'],
        },
      },
      {
        name: 'update_dependencies',
        description: 'Updates project dependencies by running npm run sync command. Use when user asks to update dependencies or update packages.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'The absolute path to the project root directory' },
          },
          required: ['projectPath'],
        },
      },
    ],
  };
});

// 3. Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'validate_translations') {
    const fileContent = request.params.arguments?.fileContent as string;
    const filePath = request.params.arguments?.filePath as string;
    return validateTranslations(fileContent, filePath);
  }

  if (request.params.name === 'update_dependencies') {
    const projectPath = request.params.arguments?.projectPath as string;
    return updateDependencies(projectPath);
  }

  throw new Error('Tool not found');
});

// 4. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
