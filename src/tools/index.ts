import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handleSvnInfo } from './svn-info.js';
import { handleSvnStatus } from './svn-status.js';
import { handleSvnLog } from './svn-log.js';
import { handleSvnDiff } from './svn-diff.js';
import { handleSvnBlame } from './svn-blame.js';
import { handleSvnCat } from './svn-cat.js';

export function registerTools(server: McpServer) {
  // svn_info - Get repository and working copy information
  server.tool(
    'svn_info',
    'Get SVN repository and working copy information including URL, revision, branch type, and last commit details',
    {
      path: z.string().optional().describe('Path or URL to query (defaults to current working copy or configured repo)'),
    },
    async (input) => handleSvnInfo(input)
  );

  // svn_status - Show working copy status
  server.tool(
    'svn_status',
    'Show modified, added, deleted, and untracked files in the SVN working copy',
    {
      path: z.string().optional().describe('Working copy path to check (defaults to current directory)'),
      show_unversioned: z.boolean().optional().default(true).describe('Include unversioned files in output'),
    },
    async (input) => handleSvnStatus(input)
  );

  // svn_log - Show commit history
  server.tool(
    'svn_log',
    'Show SVN commit history for repository or specific file. Uses local working copy when possible to avoid network calls.',
    {
      path: z.string().optional().describe('File or directory path to show history for'),
      limit: z.number().optional().default(10).describe('Maximum number of log entries to show'),
      revision: z.string().optional().describe('Revision or revision range (e.g., "1000:HEAD", "BASE:HEAD")'),
      verbose: z.boolean().optional().default(false).describe('Include list of changed paths in each commit'),
      search: z.string().optional().describe('Search pattern to filter log messages'),
    },
    async (input) => handleSvnLog(input)
  );

  // svn_diff - Show file differences
  server.tool(
    'svn_diff',
    'Show differences between working copy and BASE, or between revisions. Returns unified diff format.',
    {
      path: z.string().optional().describe('File or directory path to diff'),
      revision: z.string().optional().describe('Revision range (e.g., "1000:1005", "BASE:HEAD")'),
      change: z.number().optional().describe('Show changes made in a specific revision number'),
    },
    async (input) => handleSvnDiff(input)
  );

  // svn_blame - Show line-by-line annotation
  server.tool(
    'svn_blame',
    'Show line-by-line annotation of a file with revision and author information for each line',
    {
      path: z.string().describe('File path to annotate (required)'),
      revision: z.string().optional().describe('Annotate up to this revision'),
      start_line: z.number().optional().describe('Start line number for output'),
      end_line: z.number().optional().describe('End line number for output'),
    },
    async (input) => handleSvnBlame(input)
  );

  // svn_cat - Show file contents at a specific revision
  server.tool(
    'svn_cat',
    'Show contents of a file at a specific revision. Useful for viewing historical versions of a file.',
    {
      path: z.string().describe('File path to show (required)'),
      revision: z.string().optional().describe('Revision to show (e.g., "1000", "HEAD", "BASE"). Defaults to working copy version.'),
      start_line: z.number().optional().describe('Start line number for output'),
      end_line: z.number().optional().describe('End line number for output'),
    },
    async (input) => handleSvnCat(input)
  );
}
