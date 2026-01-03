# Claude Code Integration Guide

This guide explains how to integrate the SVN MCP server with Claude Code.

## Setup

### 1. Add MCP Server Configuration

Create or edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "svn": {
      "command": "npx",
      "args": ["-y", "svn-mcp"],
      "env": {
        "SVN_USERNAME": "your-username",
        "SVN_PASSWORD": "your-password",
        "SVN_REPO_URL": "svn://your-server.com/repo",
        "SVN_TRUNK_PATH": "trunk",
        "SVN_LOCAL_WORKING_COPY": "/path/to/local/checkout"
      }
    }
  }
}
```

### 2. Document in CLAUDE.md (Optional but Recommended)

Add a section to your project's `CLAUDE.md` or `.claude/CLAUDE.md`:

```markdown
## Version Control

This project uses SVN for version control. Use the SVN MCP tools instead of git commands:

### Available SVN Tools
- `svn_info` - Get current branch, revision, and repository info
- `svn_status` - Show modified/added/deleted files
- `svn_log` - View commit history
- `svn_diff` - Show file differences
- `svn_blame` - Line-by-line annotation

### Example Queries
- "What files have I changed?" → Use `svn_status`
- "Show me the last 5 commits" → Use `svn_log` with limit=5
- "Who wrote this code?" → Use `svn_blame` with the file path
- "What branch am I on?" → Use `svn_info`
```

## Usage Examples

### Checking What's Changed

Ask Claude:
> "What files have I modified?"

Claude will use `svn_status` and respond with something like:
```
You have 3 modified files in your working copy:

Modified:
  src/Database.php
  src/Module.php

Added:
  src/NewFeature.php
```

### Viewing Commit History

Ask Claude:
> "Show me the recent commits on this file"

Claude will use `svn_log` with the file path:
```
Here are the recent commits for src/Database.php:

r98765 | jsmith | Dec 15, 2024
FOCUS-12345: Fix connection timeout

r98700 | mjones | Dec 10, 2024
FOCUS-12300: Add retry logic
```

### Understanding Code Authorship

Ask Claude:
> "Who wrote the connect() function in Database.php?"

Claude will use `svn_blame` with line range filtering:
```
The connect() function (lines 44-48) was primarily written by:
- jsmith (r98765, r98760) - Most recent changes
- mjones (r98100) - Original implementation
```

### Checking Branch Information

Ask Claude:
> "What branch am I on and what's the current revision?"

Claude will use `svn_info`:
```
You're on branch: 12.0/dev/FOCUS-12345
Current revision: 98765
Last commit by: jsmith on Dec 15, 2024
```

## Comparison with Git Equivalents

If you're familiar with git commands, here's how SVN tools map:

| Git Command | SVN MCP Tool | Notes |
|-------------|--------------|-------|
| `git status` | `svn_status` | Similar output format |
| `git log` | `svn_log` | Use `verbose=true` for changed files |
| `git diff` | `svn_diff` | Supports revision ranges |
| `git blame` | `svn_blame` | Line range filtering available |
| `git branch` | `svn_info` | Branch detected from URL |

## Best Practices

### 1. Configure Local Working Copy

Setting `SVN_LOCAL_WORKING_COPY` allows file history lookups without network calls:

```json
"SVN_LOCAL_WORKING_COPY": "/Users/you/projects/trunk"
```

This is especially useful when:
- Viewing file history frequently
- Working offline
- Reducing network latency

### 2. Use Verbose Log for Context

When investigating changes, use verbose mode:
```
svn_log verbose=true limit=5
```

This shows which files changed in each commit.

### 3. Blame with Line Ranges

For large files, narrow down with line ranges:
```
svn_blame path="file.php" start_line=100 end_line=150
```

## Troubleshooting

### "Not a working copy" Error

The `svn_status` and some operations require being in an SVN checkout:
- Ensure your project directory has a `.svn` folder
- Or configure `SVN_LOCAL_WORKING_COPY`

### Slow Operations

If operations are slow:
1. Check if `SVN_LOCAL_WORKING_COPY` is configured
2. Reduce `limit` parameter for log operations
3. Narrow file paths instead of querying entire repository

### Authentication Issues

If you see auth errors:
1. Verify username/password in `.mcp.json`
2. Check if repository requires specific auth realm
3. Try running `svn info <repo-url>` directly to test
