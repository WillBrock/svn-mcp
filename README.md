# svn-mcp

An MCP (Model Context Protocol) server that provides SVN repository information to Claude Code and other AI assistants.

## Features

- **svn_info** - Get repository/working copy information including branch detection
- **svn_status** - Show modified, added, deleted, and untracked files
- **svn_log** - View commit history with optional path details
- **svn_diff** - Show file differences (working copy or between revisions)
- **svn_blame** - Line-by-line annotation with revision and author

### Hybrid Local/Network Approach

The server intelligently chooses between local and network operations:
- **Local operations** (no network): When files exist in a local SVN working copy
- **Network operations**: When accessing remote repository data or cross-revision comparisons

This minimizes network calls for common operations like viewing file history.

## Installation

### Prerequisites

- Node.js 18+
- SVN command-line client (`svn`) installed and in PATH

### Via npx (Recommended)

No installation required - use directly with npx:

```json
{
  "mcpServers": {
    "svn": {
      "command": "npx",
      "args": ["-y", "svn-mcp"]
    }
  }
}
```

### Global Installation

```bash
npm install -g svn-mcp
```

## Configuration

Configure via environment variables in your MCP settings:

| Variable | Required | Description |
|----------|----------|-------------|
| `SVN_USERNAME` | No | SVN authentication username |
| `SVN_PASSWORD` | No | SVN authentication password |
| `SVN_REPO_URL` | No | Base repository URL (svn://, https://, svn+ssh://) |
| `SVN_TRUNK_PATH` | No | Path to trunk within repo (e.g., `trunk` or `foobar/trunk`) |
| `SVN_LOCAL_WORKING_COPY` | No | Local working copy path for file history without network |

### Example Configuration

Add to your Claude Code MCP settings (`.mcp.json` or Claude Desktop config):

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

## Tools

### svn_info

Get repository and working copy information.

**Parameters:**
- `path` (optional): Path or URL to query

**Returns:** URL, revision, branch type, last commit details

### svn_status

Show working copy status.

**Parameters:**
- `path` (optional): Working copy path
- `show_unversioned` (optional, default: true): Include unversioned files

**Returns:** List of modified/added/deleted files grouped by status

### svn_log

Show commit history.

**Parameters:**
- `path` (optional): File or directory path
- `limit` (optional, default: 10): Maximum entries
- `revision` (optional): Revision range (e.g., "1000:HEAD")
- `verbose` (optional, default: false): Include changed paths
- `search` (optional): Filter by log message

**Returns:** List of commits with revision, author, date, message

### svn_diff

Show file differences.

**Parameters:**
- `path` (optional): File or directory path
- `revision` (optional): Revision range
- `change` (optional): Show changes from specific revision

**Returns:** Unified diff output

### svn_blame

Show line-by-line annotation.

**Parameters:**
- `path` (required): File path to annotate
- `revision` (optional): Annotate up to this revision
- `start_line` (optional): Start line number
- `end_line` (optional): End line number

**Returns:** Each line with revision, author, and content

## Development

```bash
# Clone the repository
git clone https://github.com/willbrock/svn-mcp.git
cd svn-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
