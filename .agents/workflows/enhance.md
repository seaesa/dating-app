---
description: Add or update features in existing application. Used for iterative development.
---

# /enhance - Update Application

$ARGUMENTS

---

## Task

This command adds features or makes updates to existing application.

### Steps:

1. **Understand Current State**
   - Load project state with `python .agents/scripts/session_manager.py info`
   - Understand existing features, tech stack

2. **Plan Changes & Analyze Impact**
   - Semantic code search — tìm code liên quan:
     ```bash
     rtk .agents/.venv/Scripts/code-review-graph.exe search "$ARGUMENTS" --limit 10
     ```
   - Blast radius chính xác theo file:
     ```bash
     rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <relevant_files>
     ```
   - Xác định what will be added/changed.
   - Detect affected downstream files and symbols.
   - Return the Investigation Contract: current state/evidence, impact, edge-cases, assumptions, confidence, and unresolved questions.
   - If a question is P0/blocking, stop before applying changes and ask the user.

3. **Present Plan to User** (for major changes)

   ```
   "To add admin panel:
   - New files: admin routes, components, and access control
   - Updates: navigation, auth middleware
   - Scope: moderate (touches auth + routing)

   Should I start?"
   ```

4. **Apply & Auto-Sync Graph**
   - Call relevant agents
   - Make changes
   - Test
   - Auto-sync graph + re-embed:
     ```bash
     rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
     rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local
     ```

5. **Update Preview**
   - Hot reload or restart

## Required Pre-Change Report

No change may start without:

- **Status:** `READY` or `PARTIAL` with no P0;
- current state and evidence;
- direct/indirect impact;
- edge-cases and verification status;
- decisions, assumptions, unknowns and user questions;
- explicit write scope and verification command.

---

## Usage Examples

```
/enhance add dark mode
/enhance build admin panel
/enhance integrate payment system
/enhance add search feature
/enhance edit profile page
/enhance make responsive
```

---

## Caution

- Get approval for major changes
- Warn on conflicting requests (e.g., "use Firebase" when project uses PostgreSQL)
- Commit each change with git
