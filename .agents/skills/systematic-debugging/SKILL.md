---
name: systematic-debugging
description: 4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.
when_to_use: "When debugging complex issues, performing root cause analysis, or using evidence-based problem solving. Use with /debug workflow."
allowed-tools: Read, Glob, Grep
---

# Systematic Debugging

> Source: obra/superpowers

## Overview

This skill provides a structured approach to debugging that prevents random guessing and ensures problems are properly understood before solving.

## Required Investigation Output

Apply `@[skills/investigation-contract]` throughout debugging. Before proposing a fix, return current symptom/state with evidence, caller/callee and downstream impact, relevant edge-cases, confidence, assumptions, and unresolved questions. If reproducing or isolating the issue requires a user decision (P0), stop before editing and set `Status: BLOCKED`.

## 4-Phase Debugging Process

### Phase 1: Reproduce

Before fixing, reliably reproduce the issue.

```markdown
## Reproduction Steps

1. [Exact step to reproduce]
2. [Next step]
3. [Expected vs actual result]

## Reproduction Rate

- [ ] Always (100%)
- [ ] Often (50-90%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)
```

### Phase 2: Isolate (AST Code Graph Tracing)

Narrow down the source using AST dependencies and blast radius.

```markdown
## Isolation & AST Tracing

- Query `code-review-graph` (`query_symbol`, `get_blast_radius`) for suspect functions/classes.
- Trace caller chain (Inbound Edges) and callee dependencies (Outbound Edges).
- Check git log and recent AST changes.
- Can we reproduce with minimal code?
```

### Phase 3: Understand

Find the root cause using AST graph node evidence.

```markdown
## Root Cause Analysis

### The 5 Whys & AST Call Graph

1. Why: [First observation]
2. Why: [Deeper reason in AST caller/callee path]
3. Why: [Still deeper]
4. Why: [Getting closer]
5. Why: [Root cause]
```

### Phase 4: Fix, Auto-Sync & Verify

Fix, rebuild AST graph, and verify it's truly fixed.

```markdown
## Fix Verification & Auto-Sync

- [ ] Bug no longer reproduces
- [ ] Related functionality still works
- [ ] AST Graph Rebuilt (`rtk .agents/.venv/Scripts/code-review-graph.exe build`)
- [ ] No new issues introduced
- [ ] Test added to prevent regression
```

## Debugging Checklist

```markdown
## Before Starting

- [ ] Can reproduce consistently
- [ ] Have minimal reproduction case
- [ ] Understand expected behavior

## During Investigation

- [ ] Query `code-review-graph` for AST caller/callee dependencies
- [ ] Check recent changes (git log)
- [ ] Check logs for errors
- [ ] Add logging if needed

## After Fix

- [ ] Root cause documented
- [ ] Fix verified
- [ ] AST Graph auto-synced (`code-review-graph build`)
- [ ] Regression test added
- [ ] Similar code checked
```

## Common Debugging Commands

```bash
# Recent changes
git log --oneline -20
git diff HEAD~5

# Search for pattern
grep -r "errorPattern" --include="*.ts"

# Check logs
pm2 logs app-name --err --lines 100
```

## Anti-Patterns

❌ **Random changes** - "Maybe if I change this..."
❌ **Ignoring evidence** - "That can't be the cause"
❌ **Assuming** - "It must be X" without proof
❌ **Not reproducing first** - Fixing blindly
❌ **Stopping at symptoms** - Not finding root cause

The final debug report must include the Investigation Contract even when the root cause is unknown or the fix is deferred.
