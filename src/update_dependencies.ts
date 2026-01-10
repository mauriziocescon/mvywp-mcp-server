import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function updateDependencies(projectPath: string) {
  try {
    // Verify the project path exists
    await fs.access(projectPath);

    // Run npm run sync
    const { stdout, stderr } = await execAsync('npm run sync', { cwd: projectPath });

    return {
      content: [{
        type: 'text',
        text: `Successfully ran 'npm run sync' in ${projectPath}\n\n${stdout}${stderr ? '\n' + stderr : ''}`,
      }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error running 'npm run sync': ${error.message}${error.stdout ? '\n\n' + error.stdout : ''}${error.stderr ? '\n' + error.stderr : ''}`,
      }],
    };
  }
}
