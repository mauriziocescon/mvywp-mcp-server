import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

export async function updateDependencies(
  projectPath: string,
  onProgress?: (chunk: string) => void
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Verify the project path exists
    await fs.access(projectPath);

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'sync'], {
        cwd: projectPath,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (onProgress) {
          onProgress(chunk);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        if (onProgress) {
          onProgress(chunk);
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({
            content: [{
              type: 'text',
              text: `Successfully ran 'npm run sync' in ${projectPath}\n\n${stdout}${stderr ? '\n' + stderr : ''}`,
            }],
          });
        } else {
          resolve({
            content: [{
              type: 'text',
              text: `Error running 'npm run sync' (exit code ${code}): \n\n${stdout}${stderr ? '\n' + stderr : ''}`,
            }],
          });
        }
      });
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Error running 'npm run sync': ${errorMessage}`,
      }],
    };
  }
}
