---
name: bash-linux
description: Linux Bash scripting patterns. Posix compliance, shell traps, file permissions, string manipulation, and process control.
when_to_use: "When working on Linux/macOS systems, writing Bash scripts, or using POSIX shell commands. NOT for Windows PowerShell."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Bash & Linux Scripting Patterns

> Best practices and safety patterns for Linux and Bash scripting.

---

## 1. Safety Flags (Strict Mode)

### CRITICAL: Header Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Flag          | Purpose                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `-e`          | Exit immediately if a command exits with a non-zero status.                                  |
| `-u`          | Treat unset variables as an error when expanding.                                            |
| `-o pipefail` | Return value of a pipeline is the status of the last command to exit with a non-zero status. |

---

## 2. Variable Handling & Quoting

### CRITICAL: Quote All Variables

| ❌ Wrong                | ✅ Correct                    |
| ----------------------- | ----------------------------- |
| `rm -rf $DIR/$FILE`     | `rm -rf "${DIR}/${FILE}"`     |
| `if [ $VAR == "test" ]` | `if [[ "${VAR}" == "test" ]]` |

---

## 3. Temporary Files & Traps

### Cleanup Pattern

```bash
TMPFILE=$(mktemp)
trap 'rm -f "${TMPFILE}"' EXIT
```

---

## 4. Path Resolution

### Script Directory Resolution

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
```

---

## 5. Portability Rules

- Use `#!/usr/bin/env bash` instead of `#!/bin/bash`.
- Prefer `[[ ... ]]` for Bash conditionals.
- Always check exit status of critical operations.
