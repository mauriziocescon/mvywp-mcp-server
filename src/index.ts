import fs from 'node:fs/promises';
import path from 'node:path';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const I18N_PATH = path.join(process.cwd(), 'src', 'assets', 'i18n');

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
          },
          required: ['fileContent'],
        },
      },
    ],
  };
});

// 3. Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'validate_translations') {
    const fileContent = request.params.arguments?.fileContent as string;

    // 1. Find all '**' | translate patterns
    const keyRegex = /'([^']+)'\s*\|\s*translate/g;
    const foundKeys = [...new Set([...fileContent.matchAll(keyRegex)].map(match => match[1]))];

    if (foundKeys.length === 0) {
      return { content: [{ type: 'text', text: 'No "cc.**" translation keys found in the provided content.' }] };
    }

    try {
      // 2. Read all language files
      const files = (await fs.readdir(I18N_PATH)).filter(f => f.endsWith('.json'));
      const results: Record<string, string[]> = {}; // key -> missing languages

      for (const file of files) {
        const langPath = path.join(I18N_PATH, file);
        const translations = JSON.parse(await fs.readFile(langPath, 'utf-8'));

        for (const key of foundKeys) {
          if (!(key in translations)) {
            if (!results[key]) results[key] = [];
            results[key].push(file);
          }
        }
      }

      // 3. Format result
      if (Object.keys(results).length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Success! All ${foundKeys.length} keys found are present in all language files.`,
          }],
        };
      }

      const report = Object.entries(results)
        .map(([key, missingFiles]) => `- [ ] \`${key}\` is missing in: ${missingFiles.join(', ')}`)
        .join('\n');

      return {
        content: [{ type: 'text', text: `Found ${foundKeys.length} keys. Some are missing:\n\n${report}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error reading i18n files: ${error.message}. Ensure 'assets/i18n/' exists.` }],
      };
    }
  }
  throw new Error('Tool not found');
});

// 4. Start the server using Standard Input/Output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
