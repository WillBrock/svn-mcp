import { executeSvnCommand } from '../utils/svn-executor.js';
import { resolvePathForOperation } from '../utils/working-copy.js';
import { SvnError, SVN_ERROR_CODES } from '../types/index.js';

export interface SvnCatInput {
  path: string;
  revision?: string;
  start_line?: number;
  end_line?: number;
}

export async function handleSvnCat(input: SvnCatInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    if (!input.path) {
      throw new SvnError(
        'Path is required for cat operation',
        SVN_ERROR_CODES.FILE_NOT_FOUND
      );
    }

    const resolved = await resolvePathForOperation(input.path, 'info');
    const args: string[] = [];

    if (input.revision) {
      args.push('-r', input.revision);
    }

    args.push(resolved.path);

    const output = await executeSvnCommand('cat', args, {
      useCredentials: resolved.useCredentials,
      workingDir: resolved.workingDir,
    });

    if (!output) {
      return {
        content: [{ type: 'text', text: 'File is empty or binary.' }],
      };
    }

    // Split into lines for potential filtering
    const allLines = output.split('\n');

    // Apply line range filter if specified
    let lines = allLines;
    let startLine = 1;
    let endLine = allLines.length;

    if (input.start_line || input.end_line) {
      startLine = input.start_line ?? 1;
      endLine = input.end_line ?? allLines.length;
      // Convert to 0-indexed for slice
      lines = allLines.slice(startLine - 1, endLine);
    }

    // Format output with line numbers
    const header: string[] = [];
    header.push(`File: ${input.path}`);
    if (input.revision) {
      header.push(`Revision: ${input.revision}`);
    }
    if (input.start_line || input.end_line) {
      header.push(`Lines ${startLine} to ${Math.min(endLine, allLines.length)} of ${allLines.length}`);
    }
    header.push('');

    // Add line numbers
    const maxLineNum = (startLine + lines.length - 1).toString().length;
    const numberedLines = lines.map((line, idx) => {
      const lineNum = (startLine + idx).toString().padStart(maxLineNum);
      return `${lineNum}: ${line}`;
    });

    return {
      content: [{ type: 'text', text: header.join('\n') + numberedLines.join('\n') }],
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
