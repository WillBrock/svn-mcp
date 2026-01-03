# Tool Reference

## svn_info

Get repository and working copy information including branch detection.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | No | Current directory or configured repo | Path or URL to query |

### Output

Returns structured information including:
- Path and URL
- Repository root and UUID
- Current revision
- Last changed author, revision, and date
- Working copy root (if applicable)
- Detected branch type (trunk/branch/tag) and name

### Examples

```
# Get info for current working copy
svn_info

# Get info for specific path
svn_info path="src/main.php"

# Get info for remote URL
svn_info path="svn://server.com/repo/trunk"
```

### Sample Output

```
Path: .
URL: svn://server.com/repo/branches/1.0/dev/JIRA-12345
Relative URL: ^/branches/1.0/dev/JIRA-12345
Repository Root: svn://server.com/repo
Repository UUID: 12345678-1234-1234-1234-123456789abc
Revision: 98765
Node Kind: dir
Last Changed Author: jsmith
Last Changed Rev: 98760
Last Changed Date: Dec 15, 2024, 3:45 PM
Working Copy Root Path: /Users/jsmith/projects/branch
Branch Type: branch
Branch Name: 1.0/dev/JIRA-12345
```

---

## svn_status

Show modified, added, deleted, and untracked files in the working copy.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | No | Current directory | Working copy path to check |
| `show_unversioned` | boolean | No | true | Include unversioned files |

### Status Codes

| Code | Meaning |
|------|---------|
| M | Modified |
| A | Added |
| D | Deleted |
| C | Conflicted |
| ? | Unversioned |
| ! | Missing |
| R | Replaced |

### Examples

```
# Show all changes
svn_status

# Show changes in specific directory
svn_status path="src/"

# Hide unversioned files
svn_status show_unversioned=false
```

### Sample Output

```
Working copy status (5 items):

Modified:
  src/Database.php
  src/Module.php

Added:
  src/NewFeature.php

Unversioned:
  test.log
  .DS_Store
```

---

## svn_log

Show commit history for repository or specific file.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | No | Current directory | File or directory path |
| `limit` | number | No | 10 | Maximum log entries |
| `revision` | string | No | - | Revision range (e.g., "1000:HEAD") |
| `verbose` | boolean | No | false | Include changed paths |
| `search` | string | No | - | Filter by log message |

### Revision Range Formats

- `1000:1050` - Revisions 1000 through 1050
- `BASE:HEAD` - From working copy base to latest
- `{2024-01-01}:HEAD` - From date to latest
- `HEAD` - Just the latest revision

### Examples

```
# Show last 10 commits
svn_log

# Show history for specific file
svn_log path="src/Database.php" limit=5

# Show commits with changed files
svn_log verbose=true

# Search for commits mentioning "fix"
svn_log search="fix" limit=20

# Show specific revision range
svn_log revision="98000:HEAD"
```

### Sample Output

```
────────────────────────────────────────────────────────
r98765 | jsmith | Dec 15, 2024, 3:45 PM

JIRA-12345: Fix database connection timeout issue

────────────────────────────────────────────────────────
r98760 | mjones | Dec 14, 2024, 11:30 AM

JIRA-12340: Add new student import feature

Changed paths:
  A src/Import/StudentImporter.php
  M src/Module.php
```

---

## svn_diff

Show differences between working copy and BASE, or between revisions.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | No | Current directory | File or directory path |
| `revision` | string | No | - | Revision range |
| `change` | number | No | - | Show changes from specific revision |

### Examples

```
# Show working copy changes
svn_diff

# Show changes to specific file
svn_diff path="src/Database.php"

# Show changes made in revision 98765
svn_diff change=98765

# Compare two revisions
svn_diff revision="98000:98100"
```

### Sample Output

```
Working copy changes (BASE vs working copy):

Index: src/Database.php
===================================================================
--- src/Database.php    (revision 98760)
+++ src/Database.php    (working copy)
@@ -45,7 +45,8 @@
     public function connect() {
-        $timeout = 30;
+        $timeout = 60;
+        $this->logger->info("Connecting with timeout: $timeout");
         return $this->driver->connect($timeout);
     }
```

---

## svn_blame

Show line-by-line annotation with revision and author information.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | **Yes** | - | File path to annotate |
| `revision` | string | No | - | Annotate up to this revision |
| `start_line` | number | No | - | Start line number |
| `end_line` | number | No | - | End line number |

### Examples

```
# Blame entire file
svn_blame path="src/Database.php"

# Blame specific line range
svn_blame path="src/Database.php" start_line=40 end_line=60

# Blame as of specific revision
svn_blame path="src/Database.php" revision="98000"
```

### Sample Output

```
Blame for: src/Database.php
Lines 40 to 50

98760 jsmith 40: class Database {
98100 mjones 41:     private $driver;
98100 mjones 42:     private $logger;
98100 mjones 43:
98760 jsmith 44:     public function connect() {
98765 jsmith 45:         $timeout = 60;
98765 jsmith 46:         $this->logger->info("Connecting...");
98100 mjones 47:         return $this->driver->connect($timeout);
98100 mjones 48:     }
98100 mjones 49: }
```
