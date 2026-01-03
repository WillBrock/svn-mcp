import { executeSvnCommand } from '../utils/svn-executor.js';
import { parseStatusXml } from '../utils/xml-parser.js';
import { findWorkingCopyRoot } from '../utils/working-copy.js';
import { SvnError, SVN_ERROR_CODES } from '../types/index.js';
import { resolve } from 'path';

export interface SvnStatusInput {
  path?: string;
  show_unversioned?: boolean;
}

export async function handleSvnStatus(input: SvnStatusInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const targetPath = input.path ? resolve(input.path) : process.cwd();

    // Status only works on working copies
    const wcRoot = await findWorkingCopyRoot(targetPath);
    if (!wcRoot) {
      throw new SvnError(
        'The specified path is not within an SVN working copy',
        SVN_ERROR_CODES.NOT_WORKING_COPY
      );
    }

    const args = ['--xml', targetPath];

    const output = await executeSvnCommand('status', args, { workingDir: wcRoot });
    const entries = parseStatusXml(output);

    if (entries.length === 0) {
      return {
        content: [{ type: 'text', text: 'No changes in working copy.' }],
      };
    }

    // Filter unversioned if requested
    const filteredEntries = input.show_unversioned === false
      ? entries.filter(e => e.statusCode !== '?')
      : entries;

    if (filteredEntries.length === 0) {
      return {
        content: [{ type: 'text', text: 'No changes in working copy (unversioned files hidden).' }],
      };
    }

    // Group by status
    const grouped: Record<string, string[]> = {};
    for (const entry of filteredEntries) {
      const key = getStatusLabel(entry.statusCode);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry.path);
    }

    const lines: string[] = [];
    const order = ['Modified', 'Added', 'Deleted', 'Conflicted', 'Missing', 'Unversioned', 'Other'];

    for (const label of order) {
      if (grouped[label]) {
        lines.push(`\n${label}:`);
        for (const path of grouped[label]) {
          lines.push(`  ${path}`);
        }
      }
    }

    // Summary
    lines.unshift(`Working copy status (${filteredEntries.length} item${filteredEntries.length !== 1 ? 's' : ''}):`);

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

function getStatusLabel(code: string): string {
  const labels: Record<string, string> = {
    'M': 'Modified',
    'A': 'Added',
    'D': 'Deleted',
    'C': 'Conflicted',
    '?': 'Unversioned',
    '!': 'Missing',
    'R': 'Replaced',
    'X': 'External',
    'I': 'Ignored',
    '~': 'Obstructed',
    'G': 'Merged',
  };

  return labels[code] || 'Other';
}
