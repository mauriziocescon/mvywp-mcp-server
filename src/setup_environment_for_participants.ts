import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

// Helper to run a command and capture output
function runCommand(
  command: string,
  args: string[],
  cwd: string,
  onProgress?: (chunk: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true,
    });

    let output = '';

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      if (onProgress) {
        onProgress(chunk);
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      if (onProgress) {
        onProgress(chunk);
      }
    });

    child.on('error', (error: Error) => {
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command '${command} ${args.join(' ')}' failed with exit code ${code}`));
      }
    });
  });
}

export async function setupEnvironmentForParticipants(
  projectPath: string,
  onProgress?: (chunk: string) => void,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Verify the project path exists
    await fs.access(projectPath);

    let allOutput = '';

    // 1. Run init for cc-participants-ui
    const args1 = ['run', 'init', '--', '--pkg', 'cc-participants-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg1 = `Running: npm ${args1.join(' ')}\n`;
    if (onProgress) onProgress(msg1);
    allOutput += msg1;

    allOutput += await runCommand('npm', args1, projectPath, onProgress);
    allOutput += '\n\n';

    // 2. Run init for cc-shared-ui
    const args2 = ['run', 'init', '--', '--pkg', 'cc-shared-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg2 = `Running: npm ${args2.join(' ')}\n`;
    if (onProgress) onProgress(msg2);
    allOutput += msg2;

    allOutput += await runCommand('npm', args2, projectPath, onProgress);

    // 3. Run init for cc-task-details-ui
    const args3 = ['run', 'init', '--', '--pkg', 'cc-task-details-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg3 = `Running: npm ${args3.join(' ')}\n`;
    if (onProgress) onProgress(msg3);
    allOutput += msg3;

    allOutput += await runCommand('npm', args3, projectPath, onProgress);

    return {
      content: [{
        type: 'text',
        text: `Successfully executed setup participants scripts in ${projectPath}\n\n${allOutput}`,
      }],
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Error running setup participants: ${errorMessage}`,
      }],
    };
  }
}
