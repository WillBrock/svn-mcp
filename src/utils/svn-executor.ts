import { spawn } from 'child_process';
import { SvnConfig, SvnError, SVN_ERROR_CODES, SvnExecuteOptions } from '../types/index.js';

let cachedConfig: SvnConfig | null = null;

export function getConfig(): SvnConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    username: process.env.SVN_USERNAME,
    password: process.env.SVN_PASSWORD,
    repoUrl: process.env.SVN_REPO_URL,
    trunkPath: process.env.SVN_TRUNK_PATH,
    localWorkingCopy: process.env.SVN_LOCAL_WORKING_COPY,
  };

  return cachedConfig;
}

export async function executeSvnCommand(
  command: string,
  args: string[] = [],
  options: SvnExecuteOptions = {}
): Promise<string> {
  const { useCredentials = false, workingDir, timeout = 30000 } = options;
  const config = getConfig();

  const fullArgs = [command, ...args];

  // Add credentials if requested and available
  if (useCredentials && config.username && config.password) {
    fullArgs.push('--username', config.username);
    fullArgs.push('--password', config.password);
    fullArgs.push('--non-interactive');
    fullArgs.push('--no-auth-cache');
  }

  // Always add non-interactive for any network operations
  if (!fullArgs.includes('--non-interactive')) {
    fullArgs.push('--non-interactive');
  }

  return new Promise((resolve, reject) => {
    const svn = spawn('svn', fullArgs, {
      cwd: workingDir,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    const timeoutId = setTimeout(() => {
      svn.kill();
      reject(new SvnError(
        `SVN command timed out after ${timeout}ms`,
        SVN_ERROR_CODES.COMMAND_FAILED,
        `Command: svn ${fullArgs.join(' ')}`
      ));
    }, timeout);

    svn.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    svn.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    svn.on('error', (error) => {
      clearTimeout(timeoutId);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new SvnError(
          'SVN command not found. Please ensure SVN is installed and in your PATH.',
          SVN_ERROR_CODES.NOT_INSTALLED
        ));
      } else {
        reject(new SvnError(
          `Failed to execute SVN command: ${error.message}`,
          SVN_ERROR_CODES.COMMAND_FAILED
        ));
      }
    });

    svn.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        resolve(stdout);
      } else {
        // Parse common SVN errors
        const errorMessage = stderr || stdout;

        if (errorMessage.includes('is not a working copy')) {
          reject(new SvnError(
            'The specified path is not an SVN working copy',
            SVN_ERROR_CODES.NOT_WORKING_COPY,
            errorMessage
          ));
        } else if (errorMessage.includes('authorization failed') ||
                   errorMessage.includes('Authentication failed')) {
          reject(new SvnError(
            'SVN authentication failed. Check your credentials.',
            SVN_ERROR_CODES.AUTH_FAILED,
            errorMessage
          ));
        } else if (errorMessage.includes('Unable to connect') ||
                   errorMessage.includes('Network is unreachable')) {
          reject(new SvnError(
            'Unable to connect to SVN server',
            SVN_ERROR_CODES.NETWORK_ERROR,
            errorMessage
          ));
        } else if (errorMessage.includes('non-existent') ||
                   errorMessage.includes('not found')) {
          reject(new SvnError(
            'The specified path or revision was not found',
            SVN_ERROR_CODES.FILE_NOT_FOUND,
            errorMessage
          ));
        } else if (errorMessage.includes('No such revision')) {
          reject(new SvnError(
            'Invalid revision specified',
            SVN_ERROR_CODES.INVALID_REVISION,
            errorMessage
          ));
        } else {
          reject(new SvnError(
            `SVN command failed with exit code ${code}`,
            SVN_ERROR_CODES.COMMAND_FAILED,
            errorMessage
          ));
        }
      }
    });
  });
}

export async function isSvnInstalled(): Promise<boolean> {
  try {
    await executeSvnCommand('--version', [], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
