---
description: Breakdown User Story or business requirements into comprehensive development tasks across all technical layers, perform coverage audit, and generate US dedicated folder + Master Tracker + Task Handoff files.
---

# /break-task — User Story Breakdown & File Generation

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load break-task-skill** — Read `.agents/skills/break-task-skill/SKILL.md` first
2. **Full Breakdown & Review Cycle** — Do not stop at initial task generation. Always perform Phase 1 (Breakdown) -> Phase 2 (Coverage Review) -> Phase 3 (Dedicated Folder & File Generation)
3. **Dedicated US Folder Structure** — For a User Story `US-N` titled `Title`:
   - Create dedicated folder `.agents/handoffs/<US-ID>_<us-title-slug>/` (e.g., `.agents/handoffs/US-01_tao-tai-khoan/`).
   - Create 1 US Master Tracker file inside folder: `.agents/handoffs/<US-ID>_<us-title-slug>/<US-ID>.md` (using `USER_STORY.template.md`).
   - Create sub-task handoff files inside folder: `.agents/handoffs/<US-ID>_<us-title-slug>/TASK-1.md`, `TASK-2.md`, ... (using `HANDOFF.template.md` with `parent_us` field).
4. **Vietnamese Output** — Write all task descriptions in clear Vietnamese (IT terms like API, DTO, Pytest, FE/BE can be retained).
5. **Max 4h per Task** — Any task estimated > 4 hours must be decomposed into smaller sub-tasks.
6. **Investigation Contract** — Before generating tasks, report current state/evidence, impact, edge-cases, assumptions and questions. A P0 question blocks task file generation until user answers.

---

## Task Workflow

```
CONTEXT:
- User Story / Requirements: $ARGUMENTS
- If incomplete: infer missing context from source code or state assumptions explicitly

WORKFLOW:
1. READ User Story input & load break-task-skill
2. INSPECT codebase via dual search:
   a) Semantic code search:
      rtk .agents/.venv/Scripts/code-review-graph.exe search "$ARGUMENTS" --limit 10
   b) Knowledge DB — tìm US/task tương tự đã làm:
      rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "$ARGUMENTS"
   c) Tổng quan kiến trúc (để hiểu các layers bị ảnh hưởng):
      rtk .agents/.venv/Scripts/code-review-graph.exe architecture
   d) Blast radius nếu đã biết file liên quan:
      rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <relevant_files>
3. GENERATE initial task breakdown grouped by technical categories
4. AUDIT COVERAGE against Acceptance Criteria (AC)
   - Map every material edge-case to a task, acceptance criterion, test, or explicit deferred decision.
   - Preserve all assumptions and non-blocking questions in the Master Tracker.
5. CREATE DEDICATED US FOLDER & GENERATE FILES:
   - Folder: `.agents/handoffs/<US-ID>_<us-name-slug>/`
   - Master US Tracker file: `.agents/handoffs/<US-ID>_<us-name-slug>/<US-ID>.md`
   - Sub-task Handoff files: `.agents/handoffs/<US-ID>_<us-name-slug>/TASK-1.md`, `TASK-2.md`, ...
   - Context Manifest files: `.agents/handoffs/<US-ID>_<us-name-slug>/TASK-1.context.yaml`, ...
6. REGENERATE HANDOFF_INDEX.md:
   - Run: `py .agents/scripts/generate_handoff_index.py`
   - Confirm `.agents/handoffs/HANDOFF_INDEX.md` updated with all new task entries.
```

---

## Expected Output

```markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Current state/evidence:** ...
- **Impact:** ...
- **Edge-cases:** ...
- **Questions:** ...

## 📋 Task Breakdown & Dedicated Folder Created

### Summary

- **User Story:** [Title] (`<US-ID>`)
- **Dedicated Folder:** `.agents/handoffs/<US-ID>_<us-name-slug>/`
- **Master Tracker File:** [.agents/handoffs/<US-ID>_<us-name-slug>/<US-ID>.md](file://./<US-ID>.md)
- **Generated Sub-task Files:**
  - [.agents/handoffs/<US-ID>_<us-name-slug>/<TASK-1>.md](file://./<TASK-1>.md)
  - [.agents/handoffs/<US-ID>_<us-name-slug>/<TASK-2>.md](file://./<TASK-2>.md)
```

---

## Usage Examples

```
/break-task US-1: Là người dùng, tôi muốn cập nhật thông tin cá nhân...
/break-task breakdown feature thanh toán từ file requirements.md
```
