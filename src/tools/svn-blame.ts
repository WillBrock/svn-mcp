import { executeSvnCommand } from '../utils/svn-executor.js';
import { resolvePathForOperation } from '../utils/working-copy.js';
import { parseBlameOutput } from '../utils/xml-parser.js';
import { SvnError, SVN_ERROR_CODES } from '../types/index.js';

export interface SvnBlameInput {
  path: string;
  revision?: string;
  start_line?: number;
  end_line?: number;
}

export async function handleSvnBlame(input: SvnBlameInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    if (!input.path) {
      throw new SvnError(
        'Path is required for blame operation',
        SVN_ERROR_CODES.FILE_NOT_FOUND
      );
    }

    const resolved = await resolvePathForOperation(input.path, 'blame');
    const args: string[] = [];

    if (input.revision) {
      args.push('-r', input.revision);
    }

    args.push(resolved.path);

    const output = await executeSvnCommand('blame', args, {
      useCredentials: resolved.useCredentials,
      workingDir: resolved.workingDir,
    });

    if (!output.trim()) {
      return {
        content: [{ type: 'text', text: 'No blame output (file may be empty or binary).' }],
      };
    }

    const entries = parseBlameOutput(output);

    // Apply line range filter if specified
    let filteredEntries = entries;
    if (input.start_line || input.end_line) {
      const start = input.start_line ?? 1;
      const end = input.end_line ?? entries.length;
      filteredEntries = entries.filter(e => e.lineNumber >= start && e.lineNumber <= end);
    }

    if (filteredEntries.length === 0) {
      return {
        content: [{ type: 'text', text: 'No lines found in specified range.' }],
      };
    }

    // Format output
    const lines: string[] = [];
    lines.push(`Blame for: ${input.path}`);
    if (input.start_line || input.end_line) {
      lines.push(`Lines ${input.start_line ?? 1} to ${input.end_line ?? entries.length}`);
    }
    lines.push('');

    // Calculate column widths
    const maxRev = Math.max(...filteredEntries.map(e => e.revision.toString().length));
    const maxAuthor = Math.max(...filteredEntries.map(e => e.author.length));
    const maxLine = Math.max(...filteredEntries.map(e => e.lineNumber.toString().length));

    for (const entry of filteredEntries) {
      const rev = entry.revision.toString().padStart(maxRev);
      const author = entry.author.padEnd(maxAuthor);
      const lineNum = entry.lineNumber.toString().padStart(maxLine);
      lines.push(`${rev} ${author} ${lineNum}: ${entry.content}`);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
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
