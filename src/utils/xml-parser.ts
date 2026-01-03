import { XMLParser } from 'fast-xml-parser';
import {
  SvnInfoResult,
  SvnStatusEntry,
  SvnLogEntry,
  SvnLogPath,
  SvnBlameEntry
} from '../types/index.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
});

export function parseInfoXml(xml: string): SvnInfoResult {
  const result = parser.parse(xml);
  const entry = result.info?.entry;

  if (!entry) {
    throw new Error('Invalid SVN info XML output');
  }

  const url = entry.url || '';
  const { branchType, branchName } = parseBranchFromUrl(url);

  return {
    path: entry['@_path'] || '',
    url,
    relativeUrl: entry['relative-url'] || '',
    repositoryRoot: entry.repository?.root || '',
    repositoryUuid: entry.repository?.uuid || '',
    revision: entry['@_revision'] || 0,
    nodeKind: entry['@_kind'] || '',
    lastChangedAuthor: entry.commit?.author || '',
    lastChangedRev: entry.commit?.['@_revision'] || 0,
    lastChangedDate: entry.commit?.date || '',
    wcRoot: entry['wc-info']?.['wcroot-abspath'],
    branchType,
    branchName,
  };
}

export function parseStatusXml(xml: string): SvnStatusEntry[] {
  const result = parser.parse(xml);
  const target = result.status?.target;

  if (!target) {
    return [];
  }

  const entries = target.entry;
  if (!entries) {
    return [];
  }

  // Normalize to array
  const entryList = Array.isArray(entries) ? entries : [entries];

  return entryList.map((entry: Record<string, unknown>): SvnStatusEntry => {
    const wcStatus = entry['wc-status'] as Record<string, unknown> | undefined;
    const commit = wcStatus?.commit as Record<string, unknown> | undefined;

    const statusItem = (wcStatus?.['@_item'] as string) || 'normal';

    return {
      path: (entry['@_path'] as string) || '',
      status: statusItem,
      statusCode: getStatusCode(statusItem),
      props: (wcStatus?.['@_props'] as string) || 'none',
      revision: wcStatus?.['@_revision'] as number | undefined,
      commit: commit ? {
        revision: (commit['@_revision'] as number) || 0,
        author: (commit.author as string) || '',
        date: (commit.date as string) || '',
      } : undefined,
    };
  });
}

export function parseLogXml(xml: string): SvnLogEntry[] {
  const result = parser.parse(xml);
  const log = result.log;

  if (!log || !log.logentry) {
    return [];
  }

  const entries = Array.isArray(log.logentry) ? log.logentry : [log.logentry];

  return entries.map((entry: Record<string, unknown>): SvnLogEntry => {
    const paths = (entry.paths as Record<string, unknown>)?.path;
    let parsedPaths: SvnLogPath[] | undefined;

    if (paths) {
      const pathList = Array.isArray(paths) ? paths : [paths];
      parsedPaths = pathList.map((p: Record<string, unknown> | string): SvnLogPath => {
        if (typeof p === 'string') {
          return {
            action: 'M',
            kind: 'file',
            path: p,
          };
        }
        return {
          action: (p['@_action'] as string) || '',
          kind: (p['@_kind'] as string) || '',
          path: (p['#text'] as string) || '',
          copyfromPath: p['@_copyfrom-path'] as string | undefined,
          copyfromRev: p['@_copyfrom-rev'] as number | undefined,
        };
      });
    }

    return {
      revision: (entry['@_revision'] as number) || 0,
      author: (entry.author as string) || '',
      date: (entry.date as string) || '',
      message: (entry.msg as string) || '',
      paths: parsedPaths,
    };
  });
}

export function parseBlameOutput(output: string): SvnBlameEntry[] {
  const lines = output.split('\n');
  const entries: SvnBlameEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // SVN blame format: "  12345    author content"
    // Match: optional spaces, revision, spaces, author, space, content
    const match = line.match(/^\s*(\d+)\s+(\S+)\s(.*)$/);

    if (match) {
      entries.push({
        lineNumber: i + 1,
        revision: parseInt(match[1], 10),
        author: match[2],
        content: match[3],
      });
    } else {
      // Line doesn't match expected format, include as-is
      entries.push({
        lineNumber: i + 1,
        revision: 0,
        author: '',
        content: line,
      });
    }
  }

  return entries;
}

function getStatusCode(status: string): string {
  const statusMap: Record<string, string> = {
    'added': 'A',
    'conflicted': 'C',
    'deleted': 'D',
    'ignored': 'I',
    'modified': 'M',
    'replaced': 'R',
    'external': 'X',
    'unversioned': '?',
    'missing': '!',
    'obstructed': '~',
    'normal': ' ',
    'incomplete': '!',
    'merged': 'G',
  };

  return statusMap[status] || status.charAt(0).toUpperCase();
}

function parseBranchFromUrl(url: string): { branchType: 'trunk' | 'branch' | 'tag' | 'unknown'; branchName?: string } {
  // Common SVN URL patterns:
  // .../trunk
  // .../branches/feature-name
  // .../branches/1.0/trunk
  // .../branches/1.0/dev/FOCUS-12345
  // .../tags/1.0.0

  const lowerUrl = url.toLowerCase();

  // Check for trunk
  if (lowerUrl.endsWith('/trunk') || lowerUrl.includes('/trunk/')) {
    return { branchType: 'trunk', branchName: 'trunk' };
  }

  // Check for tags
  const tagMatch = url.match(/\/tags\/([^/]+)\/?$/i);
  if (tagMatch) {
    return { branchType: 'tag', branchName: tagMatch[1] };
  }

  // Check for branches
  const branchPatterns = [
    // .../branches/X.X/dev/FOCUS-XXXXX
    /\/branches\/([^/]+\/dev\/[^/]+)\/?$/i,
    // .../branches/X.X/trunk
    /\/branches\/([^/]+\/trunk)\/?$/i,
    // .../branches/feature-name
    /\/branches\/([^/]+)\/?$/i,
  ];

  for (const pattern of branchPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { branchType: 'branch', branchName: match[1] };
    }
  }

  return { branchType: 'unknown' };
}
