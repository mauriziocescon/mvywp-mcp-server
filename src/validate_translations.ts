import fs from 'node:fs/promises';
import path from 'node:path';

// Enhanced progress callback type
type ProgressCallback = (message: string, currentStep?: number, totalSteps?: number) => void;

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

export async function validateTranslations(
  fileContent: string,
  filePath: string,
  onProgress?: ProgressCallback,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const totalSteps = 5;

  try {
    // Step 1: Scan for translation keys
    if (onProgress) onProgress('🔍 Scanning file for translation keys...', 1, totalSteps);

    const keyRegex = /'([^']+)'\s*\|\s*translate/g;
    const foundKeys = [...new Set([...fileContent.matchAll(keyRegex)].map(match => match[1]))];

    if (foundKeys.length === 0) {
      if (onProgress) onProgress('ℹ️ No translation keys found', totalSteps, totalSteps);
      return { content: [{ type: 'text', text: 'ℹ️ No translation keys found in the provided content.' }] };
    }

    if (onProgress) onProgress(`📝 Found ${foundKeys.length} translation keys`, 2, totalSteps);

    // Step 2: Find i18n folder
    if (onProgress) onProgress('📁 Locating i18n folder...', 2, totalSteps);

    const i18nPath = await findClosestI18nPath(filePath);
    if (!i18nPath) {
      if (onProgress) onProgress('❌ i18n folder not found', totalSteps, totalSteps);
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Could not find 'assets/i18n/' folder in any parent directory of ${filePath}`,
        }],
      };
    }

    if (onProgress) onProgress(`📁 Using i18n folder: ${i18nPath}`, 3, totalSteps);

    // Step 3: Read language files
    if (onProgress) onProgress('📖 Reading language files...', 3, totalSteps);

    const files = (await fs.readdir(i18nPath)).filter(f => f.endsWith('.json'));
    const results: Record<string, string[]> = {}; // key -> missing languages

    if (onProgress) onProgress(`📖 Processing ${files.length} language files`, 4, totalSteps);

    // Step 4: Validate keys across all language files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (onProgress) onProgress(`🔍 Checking ${file} (${i + 1}/${files.length})`, 4, totalSteps);

      const langPath = path.join(i18nPath, file);
      const translations = JSON.parse(await fs.readFile(langPath, 'utf-8'));

      for (const key of foundKeys) {
        if (!(key in translations)) {
          if (!results[key]) results[key] = [];
          results[key].push(file);
        }
      }
    }

    // Step 5: Generate report
    if (onProgress) onProgress('📊 Generating validation report...', 5, totalSteps);

    if (Object.keys(results).length === 0) {
      if (onProgress) onProgress('✅ All translation keys validated successfully!', totalSteps, totalSteps);
      return {
        content: [{
          type: 'text',
          text: `✅ Success! All ${foundKeys.length} keys found are present in all language files.\n(Using i18n folder: ${i18nPath})`,
        }],
      };
    }

    const missingCount = Object.keys(results).length;
    if (onProgress) onProgress(`⚠️ Found ${missingCount} missing translation keys`, totalSteps, totalSteps);

    const report = Object.entries(results)
      .map(([key, missingFiles]) => `- [ ] \`${key}\` is missing in: ${missingFiles.join(', ')}`)
      .join('\n');

    return {
      content: [{
        type: 'text',
        text: `📊 Found ${foundKeys.length} keys. ${missingCount} have missing translations:\n\n${report}\n\n(Using i18n folder: ${i18nPath})`,
      }],
    };

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (onProgress) onProgress(`❌ Error: ${errorMessage}`, totalSteps, totalSteps);

    return {
      content: [{
        type: 'text',
        text: `❌ Error reading i18n files: ${errorMessage}`,
      }],
    };
  }
}
