import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

// Enhanced progress callback type
type ProgressCallback = (message: string, currentStep?: number, totalSteps?: number) => void;

export async function updateDependencies(
  projectPath: string,
  onProgress?: ProgressCallback,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Verify the project path exists
    if (onProgress) onProgress('🔍 Verifying project path...', 1, 3);
    await fs.access(projectPath);

    if (onProgress) onProgress('🚀 Starting npm run sync...', 2, 3);

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'sync'], {
        cwd: projectPath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (onProgress) {
          onProgress(chunk, 2, 3);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        if (onProgress) {
          onProgress(chunk, 2, 3);
        }
      });

      child.on('error', (error: Error) => {
        if (onProgress) onProgress(`❌ Process error: ${error.message}`, 3, 3);
        reject(error);
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          if (onProgress) onProgress('✅ Dependencies updated successfully!', 3, 3);
          resolve({
            content: [{
              type: 'text',
              text: `✅ Successfully ran 'npm run sync' in ${projectPath}\n\n${stdout}${stderr ? '\n' + stderr : ''}`,
            }],
          });
        } else {
          if (onProgress) onProgress(`❌ npm run sync failed (exit code ${code})`, 3, 3);
          resolve({
            content: [{
              type: 'text',
              text: `❌ Error running 'npm run sync' (exit code ${code}): \n\n${stdout}${stderr ? '\n' + stderr : ''}`,
            }],
          });
        }
      });
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (onProgress) onProgress(`❌ Error: ${errorMessage}`, 3, 3);

    return {
      content: [{
        type: 'text',
        text: `❌ Error running 'npm run sync': ${errorMessage}`,
      }],
    };
  }
}
