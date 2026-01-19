import { access, constants } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { executeSvnCommand, getConfig } from './svn-executor.js';
import { parseInfoXml } from './xml-parser.js';
import { SvnInfoResult, SvnError, SVN_ERROR_CODES } from '../types/index.js';

function isUrl(path: string): boolean {
  return path.startsWith('svn://') ||
         path.startsWith('http://') ||
         path.startsWith('https://') ||
         path.startsWith('svn+ssh://');
}

export interface WorkingCopyInfo {
  isWorkingCopy: boolean;
  rootPath: string | null;
  url: string | null;
  revision: number | null;
}

export async function isWorkingCopy(path: string): Promise<boolean> {
  try {
    const svnDir = join(path, '.svn');
    await access(svnDir, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findWorkingCopyRoot(startPath: string): Promise<string | null> {
  let currentPath = resolve(startPath);
  const root = '/';

  while (currentPath !== root) {
    if (await isWorkingCopy(currentPath)) {
      return currentPath;
    }
    const parent = dirname(currentPath);
    if (parent === currentPath) break;
    currentPath = parent;
  }

  return null;
}

export async function getWorkingCopyInfo(path: string): Promise<WorkingCopyInfo> {
  const wcRoot = await findWorkingCopyRoot(path);

  if (!wcRoot) {
    return {
      isWorkingCopy: false,
      rootPath: null,
      url: null,
      revision: null,
    };
  }

  try {
    const output = await executeSvnCommand('info', ['--xml', wcRoot]);
    const info = parseInfoXml(output);

    return {
      isWorkingCopy: true,
      rootPath: info.wcRoot || wcRoot,
      url: info.url,
      revision: info.revision,
    };
  } catch {
    return {
      isWorkingCopy: true,
      rootPath: wcRoot,
      url: null,
      revision: null,
    };
  }
}

export async function resolvePathForOperation(
  filePath: string,
  operation: 'log' | 'diff' | 'blame' | 'info' | 'status'
): Promise<{ path: string; useCredentials: boolean; workingDir?: string }> {
  const config = getConfig();

  // If it's a URL, always use credentials
  if (filePath.startsWith('svn://') ||
      filePath.startsWith('http://') ||
      filePath.startsWith('https://') ||
      filePath.startsWith('svn+ssh://')) {
    return { path: filePath, useCredentials: true };
  }

  // Try to resolve as absolute or relative path
  const absolutePath = resolve(filePath);

  // Check if path is in a working copy
  const wcRoot = await findWorkingCopyRoot(absolutePath);
  if (wcRoot) {
    // Local operation
    return { path: absolutePath, useCredentials: false, workingDir: wcRoot };
  }

  // Check if there's a configured local working copy we can use
  if (config.localWorkingCopy) {
    const localPath = join(config.localWorkingCopy, filePath);
    try {
      await access(localPath, constants.F_OK);
      return { path: localPath, useCredentials: false, workingDir: config.localWorkingCopy };
    } catch {
      // File doesn't exist in local working copy
    }
  }

  // Fall back to network operation with repo URL
  if (config.trunkPath && isUrl(config.trunkPath)) {
    // SVN_TRUNK_PATH is a full URL, use it directly
    const remotePath = filePath ? `${config.trunkPath}/${filePath}` : config.trunkPath;
    return { path: remotePath, useCredentials: true };
  } else if (config.repoUrl) {
    const remotePath = config.trunkPath
      ? `${config.repoUrl}/${config.trunkPath}/${filePath}`
      : `${config.repoUrl}/${filePath}`;
    return { path: remotePath, useCredentials: true };
  }

  // No remote configured, try local path anyway (will fail if not in working copy)
  return { path: absolutePath, useCredentials: false };
}

export async function getRepoInfo(path?: string): Promise<SvnInfoResult> {
  const config = getConfig();

  // If path provided, use it
  if (path) {
    const resolved = await resolvePathForOperation(path, 'info');
    const output = await executeSvnCommand(
      'info',
      ['--xml', resolved.path],
      { useCredentials: resolved.useCredentials, workingDir: resolved.workingDir }
    );
    return parseInfoXml(output);
  }

  // Try local working copy first
  if (config.localWorkingCopy) {
    try {
      const output = await executeSvnCommand('info', ['--xml', config.localWorkingCopy]);
      return parseInfoXml(output);
    } catch {
      // Continue to try other methods
    }
  }

  // Try current directory
  try {
    const output = await executeSvnCommand('info', ['--xml', '.']);
    return parseInfoXml(output);
  } catch {
    // Not in a working copy
  }

  // Try remote repo URL
  if (config.trunkPath && isUrl(config.trunkPath)) {
    // SVN_TRUNK_PATH is a full URL, use it directly
    const output = await executeSvnCommand(
      'info',
      ['--xml', config.trunkPath],
      { useCredentials: true }
    );
    return parseInfoXml(output);
  } else if (config.repoUrl) {
    const repoPath = config.trunkPath
      ? `${config.repoUrl}/${config.trunkPath}`
      : config.repoUrl;

    const output = await executeSvnCommand(
      'info',
      ['--xml', repoPath],
      { useCredentials: true }
    );
    return parseInfoXml(output);
  }

  throw new SvnError(
    'No SVN working copy found and no repository URL configured',
    SVN_ERROR_CODES.NOT_WORKING_COPY
  );
}
