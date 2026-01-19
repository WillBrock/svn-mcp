import { executeSvnCommand, getConfig } from '../utils/svn-executor.js';
import { parseLogXml } from '../utils/xml-parser.js';
import { resolvePathForOperation } from '../utils/working-copy.js';
import { SvnError } from '../types/index.js';

export interface SvnLogInput {
  path?: string;
  limit?: number;
  revision?: string;
  verbose?: boolean;
  search?: string;
}

export async function handleSvnLog(input: SvnLogInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const limit = input.limit ?? 10;
    const verbose = input.verbose ?? false;

    let targetPath: string;
    let useCredentials = false;
    let workingDir: string | undefined;

    if (input.path) {
      const resolved = await resolvePathForOperation(input.path, 'log');
      targetPath = resolved.path;
      useCredentials = resolved.useCredentials;
      workingDir = resolved.workingDir;
    } else {
      // Default to current directory or configured repo
      const config = getConfig();
      if (config.localWorkingCopy) {
        targetPath = config.localWorkingCopy;
        workingDir = config.localWorkingCopy;
      } else if (config.trunkPath && isUrl(config.trunkPath)) {
        // SVN_TRUNK_PATH is a full URL, use it directly
        targetPath = config.trunkPath;
        useCredentials = true;
      } else if (config.repoUrl) {
        targetPath = config.trunkPath
          ? `${config.repoUrl}/${config.trunkPath}`
          : config.repoUrl;
        useCredentials = true;
      } else {
        targetPath = '.';
      }
    }

    const args = ['--xml', '-l', limit.toString()];

    if (verbose) {
      args.push('-v');
    }

    if (input.revision) {
      args.push('-r', input.revision);
    }

    if (input.search) {
      args.push('--search', input.search);
    }

    args.push(targetPath);

    const output = await executeSvnCommand('log', args, { useCredentials, workingDir });
    const entries = parseLogXml(output);

    if (entries.length === 0) {
      return {
        content: [{ type: 'text', text: 'No log entries found.' }],
      };
    }

    const lines: string[] = [];

    for (const entry of entries) {
      lines.push('─'.repeat(60));
      lines.push(`r${entry.revision} | ${entry.author} | ${formatDate(entry.date)}`);
      lines.push('');

      if (entry.message) {
        lines.push(entry.message.trim());
      } else {
        lines.push('(no message)');
      }

      if (verbose && entry.paths && entry.paths.length > 0) {
        lines.push('');
        lines.push('Changed paths:');
        for (const p of entry.paths) {
          let pathLine = `  ${p.action} ${p.path}`;
          if (p.copyfromPath) {
            pathLine += ` (from ${p.copyfromPath}:${p.copyfromRev})`;
          }
          lines.push(pathLine);
        }
      }

      lines.push('');
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

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

function isUrl(path: string): boolean {
  return path.startsWith('svn://') ||
         path.startsWith('http://') ||
         path.startsWith('https://') ||
         path.startsWith('svn+ssh://');
}
