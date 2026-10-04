---
description: Create, isolate, register, and clean up independent Git Worktrees for parallel development tasks.
---

# /worktree-isolate — Git Worktree Isolation Workflow

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Never edit directly on main repo** — Create an isolated worktree for every independent task.
2. **Runtime Isolation Required** — Copy `.agents/templates/RUNTIME_ISOLATION.template.env` to `.env.local` inside new worktree directory.
3. **Task-Specific Coordination File** — Create `.agents/coordination/<TASK-ID>.yaml` using `.agents/templates/COORDINATION.template.yaml` (prevents Git Merge Conflicts).
4. **Clean up after merge** — Update `.agents/coordination/<TASK-ID>.yaml` to `status: released` and remove worktree directory after task PR is merged.

---

## Workflow Steps (SOP Phase 2)

```
CONTEXT:
- Task ID: $ARGUMENTS (e.g. WORK-123)

STEPS:
1. FETCH LATEST REMOTE REFS:
   git fetch --prune

2. CREATE ISOLATED WORKTREE:
   git worktree add -b feature/<TASK-ID> ../project-<TASK-ID> origin/main

3. CONFIGURE RUNTIME ISOLATION:
   - Copy `.agents/templates/RUNTIME_ISOLATION.template.env` -> `../project-<TASK-ID>/.env.local`
   - Set HTTP_PORT, DATABASE_SCHEMA, and TEMP_DIRECTORY per task.

4. REGISTER TASK COORDINATION (ZERO GIT CONFLICT MODEL):
   - Copy `.agents/templates/COORDINATION.template.yaml` -> `.agents/coordination/<TASK-ID>.yaml`
   - Fill in read_scope, write_scope, and hotspots for this task.

5. CLEANUP WORKTREE (Post-Merge):
   cd ../project-main
   git worktree remove ../project-<TASK-ID>
   git worktree prune
```

---

## Usage Examples

```
/worktree-isolate WORK-123
/worktree-isolate TASK-1
```
