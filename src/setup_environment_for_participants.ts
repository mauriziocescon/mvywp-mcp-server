import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

// Enhanced progress callback type
type ProgressCallback = (message: string, currentStep?: number, totalSteps?: number) => void;

// Helper to run a command and capture output
function runCommand(
  command: string,
  args: string[],
  cwd: string,
  onProgress?: ProgressCallback,
  currentStep?: number,
  totalSteps?: number,
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
        onProgress(chunk, currentStep, totalSteps);
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      if (onProgress) {
        onProgress(chunk, currentStep, totalSteps);
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
  onProgress?: ProgressCallback,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Verify the project path exists
    if (onProgress) onProgress('🔍 Verifying project path...', 0, 4);
    await fs.access(projectPath);

    let allOutput = '';
    const totalSteps = 4;

    // Step 1: cc-participants-ui
    const args1 = ['run', 'init', '--', '--pkg', 'cc-participants-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg1 = `🚀 [1/3] Setting up cc-participants-ui...`;
    if (onProgress) onProgress(msg1, 1, totalSteps);
    allOutput += msg1 + '\n';

    allOutput += await runCommand('npm', args1, projectPath, onProgress, 1, totalSteps);
    allOutput += '\n\n';

    // Step 2: cc-shared-ui
    const args2 = ['run', 'init', '--', '--pkg', 'cc-shared-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg2 = `🚀 [2/3] Setting up cc-shared-ui...`;
    if (onProgress) onProgress(msg2, 2, totalSteps);
    allOutput += msg2 + '\n';

    allOutput += await runCommand('npm', args2, projectPath, onProgress, 2, totalSteps);
    allOutput += '\n\n';

    // Step 3: cc-task-details-ui
    const args3 = ['run', 'init', '--', '--pkg', 'cc-task-details-ui', '--pkgOnly', '--git', 'local', '--skipInstall'];
    const msg3 = `🚀 [3/3] Setting up cc-task-details-ui...`;
    if (onProgress) onProgress(msg3, 3, totalSteps);
    allOutput += msg3 + '\n';

    allOutput += await runCommand('npm', args3, projectPath, onProgress, 3, totalSteps);

    // Final step
    if (onProgress) onProgress('✅ Setup completed successfully!', 4, totalSteps);

    return {
      content: [{
        type: 'text',
        text: `✅ Successfully executed setup participants scripts in ${projectPath}\n\n${allOutput}`,
      }],
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (onProgress) onProgress(`❌ Error: ${errorMessage}`);

    return {
      content: [{
        type: 'text',
        text: `❌ Error running setup participants: ${errorMessage}`,
      }],
    };
  }
}
