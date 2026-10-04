---
description: Automatically generate or update task handoff file inside dedicated US folder (.agents/handoffs/<US-ID>_<us-name-slug>/<TASK-ID>.md) with commit SHA, verification evidence, distilled progress, and clear next steps.
---

# /handoff — Create or Update Task Handoff

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Dedicated US Folder** — Store handoff files inside dedicated User Story folder `.agents/handoffs/<US-ID>_<us-name-slug>/`.
2. **No Raw Transcripts** — Never include raw chat logs, terminal dumps, or Chain-of-Thought thinking in handoff files.
3. **Real Evidence Only** — Must run linter/test runner commands and record actual output + commit SHA.
4. **Template Conformance** — Must use the exact structure defined in `.agents/templates/HANDOFF.template.md`.
5. **Update Master Tracker** — Update corresponding task status checklist `[x]` in parent `.agents/handoffs/<US-ID>_<us-name-slug>/<US-ID>.md`.

---

## Workflow Steps

```
CONTEXT:
- Task ID / US Folder: $ARGUMENTS (e.g. US-01_tao-tai-khoan / TASK-1)
- If empty: Infer Task ID and US folder from git branch, active context manifest, or recent commits.

STEPS:
1. GATHER GIT STATE:
   git status
   git log -n 1 --format="%H"

2. VERIFY CODE QUALITY:
   python .agents/scripts/checklist.py .
   → Record test pass/fail count, commit SHA, timestamp.

3. AUTO-SYNC GRAPH & EMBEDDINGS (incremental):
   rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
   rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local
   → Cập nhật AST graph + semantic embeddings cho code đã thay đổi.

4. DISTILL PROGRESS & CHANGES:
   git diff --name-only HEAD~1 HEAD
   → Identify modified files and key symbols changed.
   → Summarize progress against Acceptance Criteria (checked vs unchecked).
   → Formulate clear, actionable "Next Steps" for takeover.

5. WRITE HANDOFF & UPDATE MASTER TRACKER:
   - Create or update `.agents/handoffs/<US-ID>_<us-name-slug>/<TASK-ID>.md` using `HANDOFF.template.md`.
   - Update checklist `[x]` for `<TASK-ID>` in parent `.agents/handoffs/<US-ID>_<us-name-slug>/<US-ID>.md`.

6. REGENERATE INDEXES & VECTOR DB:
   py .agents/scripts/generate_handoff_index.py
   rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/build-index.ps1
   → Vectorize new handoff into `vector-store.sqlite` + update HANDOFF_INDEX.md.
```

---

## Expected Output

```markdown
## Task Handoff Completed

- **US Folder:** `.agents/handoffs/<US-ID>_<us-name-slug>/`
- **Handoff File:** [.agents/handoffs/<US-ID>_<us-name-slug>/<TASK-ID>.md](file://./<TASK-ID>.md)
- **Master Tracker Updated:** [.agents/handoffs/<US-ID>_<us-name-slug>/<US-ID>.md](file://./<US-ID>.md)
- **Branch:** `feature/<TASK-ID>`
- **Head SHA:** `<SHA>`
- **Pipeline Result:** Passed / Failed
- **Graph Sync:** `update --brief` ✅ | `embed --provider local` ✅
```

---

## Usage Examples

```
/handoff TASK-1
/handoff US-01_tao-tai-khoan TASK-1
/handoff
```
