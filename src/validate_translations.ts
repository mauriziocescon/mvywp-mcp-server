import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Searches for the closest assets/i18n/ folder starting from the given file path
 * and moving up the directory tree until found or reaching the root.
 */
async function findClosestI18nPath(filePath: string): Promise<string | null> {
  let currentDir = path.dirname(filePath);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const i18nPath = path.join(currentDir, 'assets', 'i18n');
    try {
      const stats = await fs.stat(i18nPath);
      if (stats.isDirectory()) {
        return i18nPath;
      }
    } catch {
      // Directory doesn't exist, continue
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root level as well
  const rootI18nPath = path.join(root, 'assets', 'i18n');
  try {
    const stats = await fs.stat(rootI18nPath);
    if (stats.isDirectory()) {
      return rootI18nPath;
    }
  } catch {
    // Not found
  }

  return null;
}

export async function validateTranslations(fileContent: string, filePath: string) {
  // 1. Find all '**' | translate patterns
  const keyRegex = /'([^']+)'\s*\|\s*translate/g;
  const foundKeys = [...new Set([...fileContent.matchAll(keyRegex)].map(match => match[1]))];

  if (foundKeys.length === 0) {
    return { content: [{ type: 'text', text: 'No translation keys found in the provided content.' }] };
  }

  // 2. Find the closest assets/i18n/ folder
  const i18nPath = await findClosestI18nPath(filePath);
  if (!i18nPath) {
    return {
      content: [{
        type: 'text',
        text: `Error: Could not find 'assets/i18n/' folder in any parent directory of ${filePath}`
      }],
    };
  }

  try {
    // 3. Read all language files
    const files = (await fs.readdir(i18nPath)).filter(f => f.endsWith('.json'));
    const results: Record<string, string[]> = {}; // key -> missing languages

    for (const file of files) {
      const langPath = path.join(i18nPath, file);
      const translations = JSON.parse(await fs.readFile(langPath, 'utf-8'));

      for (const key of foundKeys) {
        if (!(key in translations)) {
          if (!results[key]) results[key] = [];
          results[key].push(file);
        }
      }
    }

    // 4. Format result
    if (Object.keys(results).length === 0) {
      return {
        content: [{
          type: 'text',
          text: `Success! All ${foundKeys.length} keys found are present in all language files.\n(Using i18n folder: ${i18nPath})`,
        }],
      };
    }

    const report = Object.entries(results)
      .map(([key, missingFiles]) => `- [ ] \`${key}\` is missing in: ${missingFiles.join(', ')}`)
      .join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${foundKeys.length} keys. Some are missing:\n\n${report}\n\n(Using i18n folder: ${i18nPath})`
      }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error reading i18n files from ${i18nPath}: ${error.message}` }],
    };
  }
}
