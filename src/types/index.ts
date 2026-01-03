export interface SvnConfig {
  username?: string;
  password?: string;
  repoUrl?: string;
  trunkPath?: string;
  localWorkingCopy?: string;
}

export interface SvnInfoResult {
  path: string;
  url: string;
  relativeUrl: string;
  repositoryRoot: string;
  repositoryUuid: string;
  revision: number;
  nodeKind: string;
  lastChangedAuthor: string;
  lastChangedRev: number;
  lastChangedDate: string;
  wcRoot?: string;
  branchType?: 'trunk' | 'branch' | 'tag' | 'unknown';
  branchName?: string;
}

export interface SvnStatusEntry {
  path: string;
  status: string;
  statusCode: string;
  props: string;
  revision?: number;
  commit?: {
    revision: number;
    author: string;
    date: string;
  };
}

export interface SvnLogEntry {
  revision: number;
  author: string;
  date: string;
  message: string;
  paths?: SvnLogPath[];
}

export interface SvnLogPath {
  action: string;
  kind: string;
  path: string;
  copyfromPath?: string;
  copyfromRev?: number;
}

export interface SvnBlameEntry {
  lineNumber: number;
  revision: number;
  author: string;
  date?: string;
  content: string;
}

export interface SvnExecuteOptions {
  useCredentials?: boolean;
  workingDir?: string;
  timeout?: number;
}

export class SvnError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'SvnError';
  }
}

export const SVN_ERROR_CODES = {
  NOT_INSTALLED: 'SVN_NOT_INSTALLED',
  NOT_WORKING_COPY: 'NOT_WORKING_COPY',
  AUTH_FAILED: 'AUTH_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_REVISION: 'INVALID_REVISION',
  COMMAND_FAILED: 'COMMAND_FAILED',
} as const;
