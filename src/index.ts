import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { setupEnvironmentForParticipants } from './setup_environment_for_participants.js';
import { updateDependencies } from './update_dependencies.js';
import { validateTranslations } from './validate_translations.js';

// Enhanced progress callback type
type ProgressCallback = (message: string, currentStep?: number, totalSteps?: number) => void;

// 1. Initialize the server
const server = new McpServer(
  {
    name: 'participants-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // Enable tools capability
      resources: {}, // Enable resources capability
    },
  },
);

// 2. Register tools using the registerTool API
server.registerTool(
  'setup_environment_for_participants',
  {
    description: 'Init some required packages for locally developing participants by running the init command for cc-shared-ui, cc-participants-ui and cc-task-details-ui. Use when user asks to setup the environment to develop participants.',
    inputSchema: z.object({
      projectPath: z.string().describe('The absolute path to the project root directory'),
    }),
  },
  async (args, extra) => {
    const progressToken = extra._meta?.progressToken;
    const onProgress: ProgressCallback | undefined = progressToken !== undefined
      ? (message: string, currentStep?: number, totalSteps?: number) => {
        const progress = currentStep && totalSteps ? Math.round((currentStep / totalSteps) * 100) : undefined;
        server.server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress,
            description: message.trim(),
          },
        });
      }
      : undefined;

    return setupEnvironmentForParticipants(args.projectPath, onProgress);
  },
);

server.registerTool(
  'update_dependencies',
  {
    description: 'Updates project dependencies by running npm run sync command. Use when user asks to update dependencies or update packages.',
    inputSchema: z.object({
      projectPath: z.string().describe('The absolute path to the project root directory'),
    }),
  },
  async (args, extra) => {
    const progressToken = extra._meta?.progressToken;
    const onProgress: ProgressCallback | undefined = progressToken !== undefined
      ? (message: string, currentStep?: number, totalSteps?: number) => {
        const progress = currentStep && totalSteps ? Math.round((currentStep / totalSteps) * 100) : undefined;
        server.server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress,
            description: message.trim(),
          },
        });
      }
      : undefined;

    return updateDependencies(args.projectPath, onProgress);
  },
);

server.registerTool(
  'validate_translations',
  {
    description: 'Finds translation keys in code and checks if they exist in all i18n language files',
    inputSchema: z.object({
      fileContent: z.string().describe('The content of the file to scan for translation keys'),
      filePath: z.string().describe('The absolute path of the file being validated'),
    }),
  },
  async (args, extra) => {
    const progressToken = extra._meta?.progressToken;
    const onProgress: ProgressCallback | undefined = progressToken !== undefined
      ? (message: string, currentStep?: number, totalSteps?: number) => {
        const progress = currentStep && totalSteps ? Math.round((currentStep / totalSteps) * 100) : undefined;
        server.server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress,
            description: message.trim(),
          },
        });
      }
      : undefined;

    return validateTranslations(args.fileContent, args.filePath, onProgress);
  },
);

// 3. Define available resources (markdown documentation files)
server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    return {
      resources: [{
        uri: `docs:///resources/participants.md`,
        name: 'Participants', // Use filename as resource name
        description: `Describes what a participant is all about and how to its configuration looks like. It also clarifies the role of participants in the task flow and their interaction with the task container.`,
        mimeType: 'text/markdown',
      }],
    };
  } catch (error) {
    // Return empty list if directory is missing or inaccessible
    return { resources: [] };
  }
});

// 4. Implement resource reading logic
server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const resourcePrefix = 'docs:///resources/';

  if (uri.startsWith(resourcePrefix)) {
    // Extract filename from URI
    const fileName = uri.slice(resourcePrefix.length);

    // Security check: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error(`Invalid resource path: ${uri}`);
    }

    try {
      const resourcesPath = join(process.cwd(), 'src', 'resources');
      const filePath = join(resourcesPath, fileName);
      const content = await readFile(filePath, 'utf-8');

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

// 5. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
