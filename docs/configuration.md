# Configuration Guide

## Environment Variables

The SVN MCP server is configured entirely through environment variables, passed via the MCP server configuration.

### Authentication

| Variable | Description |
|----------|-------------|
| `SVN_USERNAME` | Your SVN username for authenticated operations |
| `SVN_PASSWORD` | Your SVN password |

**Security Note:** Credentials are passed to SVN with `--non-interactive` and `--no-auth-cache` flags to prevent storing them on disk.

### Repository Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `SVN_REPO_URL` | Base URL of your SVN repository | `svn://server.com/repo` |
| `SVN_TRUNK_PATH` | Path to trunk within the repository | `trunk` or `branches/12.0/trunk` |
| `SVN_LOCAL_WORKING_COPY` | Path to local checkout for offline operations | `/home/user/project` |

### URL Protocol Support

The server supports all standard SVN protocols:
- `svn://` - Native SVN protocol
- `http://` / `https://` - WebDAV over HTTP(S)
- `svn+ssh://` - SVN over SSH tunnel
- `file://` - Local filesystem (for FSFS repositories)

## Configuration Examples

### Minimal Configuration (Local Working Copy Only)

If you only work with local checkouts:

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

The server will automatically detect SVN working copies in the current directory.

### With Remote Repository Access

```json
{
  "mcpServers": {
    "svn": {
      "command": "npx",
      "args": ["-y", "svn-mcp"],
      "env": {
        "SVN_USERNAME": "jsmith",
        "SVN_PASSWORD": "secret123",
        "SVN_REPO_URL": "https://svn.company.com/repos/project"
      }
    }
  }
}
```

### Full Configuration with Local Cache

For optimal performance with both local and remote access:

```json
{
  "mcpServers": {
    "svn": {
      "command": "npx",
      "args": ["-y", "svn-mcp"],
      "env": {
        "SVN_USERNAME": "jsmith",
        "SVN_PASSWORD": "secret123",
        "SVN_REPO_URL": "svn://svn.company.com/repos",
        "SVN_TRUNK_PATH": "branches/12.0/trunk",
        "SVN_LOCAL_WORKING_COPY": "/Users/jsmith/projects/trunk"
      }
    }
  }
}
```

### Using Environment Variable References

For sensitive credentials, you can reference environment variables:

```json
{
  "mcpServers": {
    "svn": {
      "command": "npx",
      "args": ["-y", "svn-mcp"],
      "env": {
        "SVN_USERNAME": "${SVN_USER}",
        "SVN_PASSWORD": "${SVN_PASS}",
        "SVN_REPO_URL": "svn://server.com/repo"
      }
    }
  }
}
```

## How Local/Network Selection Works

The server uses this logic to minimize network calls:

1. **If path is a URL**: Always use network with credentials
2. **If path is in a working copy**: Use local SVN commands (no network)
3. **If path exists in `SVN_LOCAL_WORKING_COPY`**: Use that local copy
4. **Otherwise**: Construct remote URL from `SVN_REPO_URL` + `SVN_TRUNK_PATH` and use network

### Operations by Type

| Operation | When Local | When Network |
|-----------|------------|--------------|
| `svn_info` | Path is in working copy | Path is URL or no working copy |
| `svn_status` | Always (requires working copy) | Never |
| `svn_log` | File exists in local working copy | Remote file or cross-revision |
| `svn_diff` | Working copy diff (no revision) | Cross-revision diffs |
| `svn_blame` | File in local working copy | Remote files |

## Troubleshooting

### "SVN command not found"

Ensure SVN is installed and in your PATH:
```bash
which svn
svn --version
```

### Authentication Failed

1. Verify credentials are correct
2. Check if repository requires specific authentication realm
3. Try accessing the repository directly: `svn info <repo-url>`

### Network Timeout

Increase timeout by modifying the command execution timeout (default: 30 seconds).

### "Not a working copy"

The `svn_status` tool requires a local SVN checkout. Either:
- Navigate to an SVN working copy
- Configure `SVN_LOCAL_WORKING_COPY` to point to one
