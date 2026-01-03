import { executeSvnCommand } from '../utils/svn-executor.js';
import { resolvePathForOperation, findWorkingCopyRoot } from '../utils/working-copy.js';
import { SvnError } from '../types/index.js';
import { resolve } from 'path';

export interface SvnDiffInput {
  path?: string;
  revision?: string;
  change?: number;
}

export async function handleSvnDiff(input: SvnDiffInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const args: string[] = [];
    let useCredentials = false;
    let workingDir: string | undefined;
    let targetPath: string;

    if (input.path) {
      const resolved = await resolvePathForOperation(input.path, 'diff');
      targetPath = resolved.path;
      useCredentials = resolved.useCredentials;
      workingDir = resolved.workingDir;
    } else {
      // Default to current directory
      targetPath = process.cwd();
      const wcRoot = await findWorkingCopyRoot(targetPath);
      if (wcRoot) {
        workingDir = wcRoot;
      }
    }

    // Add revision options
    if (input.change) {
      // Show changes made in a specific revision
      args.push('-c', input.change.toString());
      useCredentials = true; // Cross-revision diff typically needs network
    } else if (input.revision) {
      // Revision range (e.g., "1000:1005" or "HEAD")
      args.push('-r', input.revision);
      if (input.revision.includes(':') || input.revision !== 'BASE') {
        useCredentials = true;
      }
    }

    args.push(targetPath);

    const output = await executeSvnCommand('diff', args, { useCredentials, workingDir });

    if (!output.trim()) {
      return {
        content: [{ type: 'text', text: 'No differences found.' }],
      };
    }

    // Add some context about what we're diffing
    let header = 'Diff output:\n';
    if (input.change) {
      header = `Changes in revision ${input.change}:\n`;
    } else if (input.revision) {
      header = `Diff for revision range ${input.revision}:\n`;
    } else {
      header = 'Working copy changes (BASE vs working copy):\n';
    }

    return {
      content: [{ type: 'text', text: header + '\n' + output }],
    };
  } catch (error) {
    if (error instanceof SvnError) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}\nCode: ${error.code}${error.details ? `\nDetails: ${error.details}` : ''}` }],
      };
    }
    throw error;
  }
}
