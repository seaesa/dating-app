---
description: Add an individual development task (standalone or appended to an existing User Story), inspect codebase AST impact using code-review-graph impact & semantic search, generate Task Handoff + Context Manifest files, and update Master Tracker if applicable.
---

# /add-task — Add Individual Task (Standalone or US Sub-task)

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Task Scope & Ownership** — Generate surgical, actionable tasks with unambiguous Acceptance Criteria (AC) and clear owner role (FE, BE, QA, DevOps, etc.).
2. **Support Two Modes**:
   - **Mode A: Sub-task for Existing US** (when `$ARGUMENTS` contains `parent_us: <US-ID>` or mentions `US-N`):
     - Locate US folder `.agents/handoffs/<US-ID>_<us-name-slug>/`.
     - Find next task number (e.g. `TASK-4` if `TASK-1..3` exist).
     - Create `.agents/handoffs/<US-ID>_<us-name-slug>/TASK-<N>.md` using `HANDOFF.template.md` with `parent_us: <US-ID>`.
     - Create `.agents/handoffs/<US-ID>_<us-name-slug>/TASK-<N>.context.yaml` using `CONTEXT_MANIFEST.template.yaml`.
     - Update Master Tracker `<US-ID>.md` (add to `child_tasks` in frontmatter and add new row in Task Breakdown table).
   - **Mode B: Standalone Task** (when no `parent_us` is provided):
     - Allocate a new Task ID: `TASK-<ID>` (e.g., `TASK-101`).
     - Create dedicated folder `.agents/handoffs/TASK-<ID>_<task-name-slug>/`.
     - Create `.agents/handoffs/TASK-<ID>_<task-name-slug>/TASK-<ID>.md` using `HANDOFF.template.md` with `parent_us: standalone`.
     - Create `.agents/handoffs/TASK-<ID>_<task-name-slug>/TASK-<ID>.context.yaml` using `CONTEXT_MANIFEST.template.yaml`.
3. **Dual Codebase Inspection** — Dùng **cả 2** để xác định scope code chính xác:
   - `code-review-graph search "<task>"` → tìm code liên quan theo ngữ nghĩa.
   - `code-review-graph impact --files <relevant_file>` → blast radius chính xác.
4. **Vietnamese Output** — Write task descriptions, steps, and handoff details in clear Vietnamese.
5. **Max 4h Estimate** — Single task estimate must be ≤ 4 hours. If larger, recommend `/break-task`.
6. **Investigation Contract** — Before creating files, report current state, impact, edge-cases, assumptions and unresolved questions. Any P0 blocks file creation.

---

## Task Workflow

```
CONTEXT:
- Task Details / Requirements: $ARGUMENTS
- If incomplete: ask clarifying questions or state explicit assumptions

WORKFLOW:
1. PARSE Input parameters ($ARGUMENTS):
   - Title, Description, Acceptance Criteria, Role, Estimate, Parent US (if any)

2. SEMANTIC SEARCH — Tìm code liên quan & kiểm tra duplicate:
   a) Tìm code liên quan:
      rtk .agents/.venv/Scripts/code-review-graph.exe search "<task_title>" --limit 10
   b) Kiểm tra task/work đã làm tương tự:
      rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "<task_title>"

3. INSPECT Codebase Impact (sau khi biết files từ bước 2):
   rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <relevant_files>
   → Điền danh sách impacted files vào Context Manifest.
   → Hoàn tất Investigation Contract và xác định write scope; nếu `BLOCKED`, dừng.

4. DETERMINE Execution Mode:
   - MODE A (Has Parent US):
     1. Locate `.agents/handoffs/<US-ID>_<us-name-slug>/`
     2. Identify next task index `TASK-<N>`
     3. Generate `TASK-<N>.md` & `TASK-<N>.context.yaml` inside US folder
     4. Update Master Tracker `<US-ID>.md` checklist & frontmatter
   - MODE B (Standalone Task):
     1. Generate Task ID (e.g., `TASK-101`) & folder `.agents/handoffs/TASK-<ID>_<task-name-slug>/`
     2. Generate `TASK-<ID>.md` & `TASK-<ID>.context.yaml` inside folder

5. REGENERATE HANDOFF_INDEX.md:
   py .agents/scripts/generate_handoff_index.py
   → Confirm `.agents/handoffs/HANDOFF_INDEX.md` updated.

6. REPORT completion with direct file links
```

---

## Expected Output

```markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Current state/evidence:** ...
- **Impact:** ...
- **Edge-cases:** ...
- **Questions/assumptions:** ...

## 📋 Task Added Successfully

### Summary

- **Task ID:** `TASK-<ID>`
- **Title:** [Task Title]
- **Type:** Sub-task of `<US-ID>` | Standalone Task
- **Related Code (semantic):** [Top symbols từ code-review-graph search]
- **Impact Radius:** [Files affected từ code-review-graph impact]
- **Handoff File:** `.agents/handoffs/.../TASK-<ID>.md`
- **Context Manifest:** `.agents/handoffs/.../TASK-<ID>.context.yaml`
- **Updated Master Tracker:** `.agents/handoffs/.../US-ID.md` (if Mode A)
```

---

## Usage Examples

```
/add-task US-01: Bổ sung task viết Unit test cho API cập nhật profile (BE, 2h)
/add-task Standalone: Refactor module authentication sang OAuth2 JWT middleware (BE, 3h)
```
