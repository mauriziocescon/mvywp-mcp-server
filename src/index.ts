import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

// Enhanced progress callback type
type ProgressCallback = (message: string, currentStep?: number, totalSteps?: number) => void;

// 1. Initialize the mcp
const mcp = new McpServer(
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

// 2. Define available tools
mcp.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'setup_environment_for_participants',
        description: 'Init some required packages for locally developing participants by running the init command for cc-shared-ui, cc-participants-ui and cc-task-details-ui. Use when user asks to setup the environment to develop participants.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'The absolute path to the project root directory',
            },
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
            projectPath: {
              type: 'string',
              description: 'The absolute path to the project root directory',
            },
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
            fileContent: {
              type: 'string',
              description: 'The content of the file to scan for translation keys',
            },
            filePath: {
              type: 'string',
              description: 'The absolute path of the file being validated',
            },
          },
          required: ['fileContent', 'filePath'],
        },
      },
    ],
  };
});

// 3. Define available resources (markdown documentation files)
mcp.server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
mcp.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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

// 5. Implement the tool logic
mcp.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const progressToken = request.params._meta?.progressToken;

  // Create enhanced progress callback
  const onProgress: ProgressCallback | undefined = progressToken !== undefined
    ? (message: string, currentStep?: number, totalSteps?: number) => {
      const progress = currentStep && totalSteps ? Math.round((currentStep / totalSteps) * 100) : undefined;
      mcp.server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          description: message.trim(),
        },
      });
    }
    : undefined;

  if (request.params.name === 'setup_environment_for_participants') {
    const projectPath = request.params.arguments?.projectPath as string;
    return setupEnvironmentForParticipants(projectPath, onProgress);
  }

  if (request.params.name === 'update_dependencies') {
    const projectPath = request.params.arguments?.projectPath as string;
    return updateDependencies(projectPath, onProgress);
  }

  if (request.params.name === 'validate_translations') {
    const fileContent = request.params.arguments?.fileContent as string;
    const filePath = request.params.arguments?.filePath as string;
    return validateTranslations(fileContent, filePath, onProgress);
  }

  throw new Error('Tool not found');
});

// 6. Start the mcp using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await mcp.connect(transport);
