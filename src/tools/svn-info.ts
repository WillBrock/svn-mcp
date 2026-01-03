import { getRepoInfo, resolvePathForOperation } from '../utils/working-copy.js';
import { executeSvnCommand } from '../utils/svn-executor.js';
import { parseInfoXml } from '../utils/xml-parser.js';
import { SvnError } from '../types/index.js';

export interface SvnInfoInput {
  path?: string;
}

export async function handleSvnInfo(input: SvnInfoInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    let info;

    if (input.path) {
      const resolved = await resolvePathForOperation(input.path, 'info');
      const output = await executeSvnCommand(
        'info',
        ['--xml', resolved.path],
        { useCredentials: resolved.useCredentials, workingDir: resolved.workingDir }
      );
      info = parseInfoXml(output);
    } else {
      info = await getRepoInfo();
    }

    const lines = [
      `Path: ${info.path}`,
      `URL: ${info.url}`,
      `Relative URL: ${info.relativeUrl}`,
      `Repository Root: ${info.repositoryRoot}`,
      `Repository UUID: ${info.repositoryUuid}`,
      `Revision: ${info.revision}`,
      `Node Kind: ${info.nodeKind}`,
      `Last Changed Author: ${info.lastChangedAuthor}`,
      `Last Changed Rev: ${info.lastChangedRev}`,
      `Last Changed Date: ${info.lastChangedDate}`,
    ];

    if (info.wcRoot) {
      lines.push(`Working Copy Root Path: ${info.wcRoot}`);
    }

    if (info.branchType) {
      lines.push(`Branch Type: ${info.branchType}`);
    }

    if (info.branchName) {
      lines.push(`Branch Name: ${info.branchName}`);
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
