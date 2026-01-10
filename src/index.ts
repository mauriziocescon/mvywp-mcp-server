import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { setupEnvironmentForParticipants } from './setup_environment_for_participants.js';
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
        name: 'setup_environment_for_participants',
        description: 'Init some required packages for developing participants by running init for cc-participants-ui and cc-shared-ui command. Use when user asks to setup the environment to develop participants.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'The absolute path to the project root directory' },
          },
          required: ['projectPath'],
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
    ],
  };
});

// 3. Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {

  if (request.params.name === 'setup_participants') {
    const projectPath = request.params.arguments?.projectPath as string;

    // Check if the client provided a progress token
    const progressToken = request.params._meta?.progressToken;

    return setupEnvironmentForParticipants(projectPath, (chunk: string) => {
      if (progressToken !== undefined) {
        server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress: 0, // You can calculate percentage if known
            description: chunk.trim(), // This sends the text
          },
        });
      }
    });
  }

  if (request.params.name === 'update_dependencies') {
    const projectPath = request.params.arguments?.projectPath as string;

    // Check if the client provided a progress token
    const progressToken = request.params._meta?.progressToken;

    return updateDependencies(projectPath, (chunk: string) => {
      if (progressToken !== undefined) {
        server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress: 0, // You can calculate percentage if known
            description: chunk.trim(), // This sends the text
          },
        });
      }
    });
  }

  if (request.params.name === 'validate_translations') {
    const fileContent = request.params.arguments?.fileContent as string;
    const filePath = request.params.arguments?.filePath as string;
    return validateTranslations(fileContent, filePath);
  }

  throw new Error('Tool not found');
});

// 4. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
