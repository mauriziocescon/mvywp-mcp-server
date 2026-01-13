import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { setupEnvironmentForParticipants } from './setup_environment_for_participants.js';
import { updateDependencies } from './update_dependencies.js';
import { validateTranslations } from './validate_translations.js';

// 1. Initialize the server
const server = new Server(
  {
    name: 'mywp-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // Enable tools capability
      resources: {}, // Enable resources capability
    },
  },
);

// 2. Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'setup_environment_for_participants',
        description: 'Init some required packages for developing participants by running the init command for cc-shared-ui, cc-participants-ui and cc-task-details-ui. Use when user asks to setup the environment to develop participants.',
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

// 3. Define available resources (markdown documentation files)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'file:///docs/participants.md',
        name: 'Participants Documentation',
        description: 'Documentation about participants development',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// 4. Implement resource reading logic
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'file:///docs/participants.md') {
    try {
      // Read the markdown file from the docs directory
      const docsPath = join(process.cwd(), 'docs', 'participants.md');
      const content = await readFile(docsPath, 'utf-8');

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read resource: ${error}`);
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// 5. Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {

  if (request.params.name === 'setup_environment_for_participants') {
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

// 6. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
