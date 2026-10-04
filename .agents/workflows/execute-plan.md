---
description: Execute implementation plan step-by-step, verify per-step changes, and automatically sync AST Code Graph + Semantic Embeddings upon completion.
---

# /execute-plan — Execute Implementation Plan & Auto-Sync Graph

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load Skill `plan-execution`** — Read `.agents/skills/plan-execution/SKILL.md` before starting.
2. **Step-by-step Execution** — Execute tasks sequentially, verify each step via tests/linters, and check off completed items.
3. **Pre-write Investigation Contract** — Đọc contract trong plan trước lần write đầu tiên. Xác nhận current state, impact, edge-cases và assumptions vẫn đúng; nếu xuất hiện P0 mới, dừng và hỏi user.
4. **Mandatory AST + Embedding Auto-Sync** — Sau khi implementation xong, **PHẢI** chạy cả 2:
   ```bash
   rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
   rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local
   ```
   Thiếu bước `embed` → semantic search lỗi thời, không phản ánh code mới.
5. **Vietnamese Output** — Provide clear Vietnamese progress and summary reports.
6. **Final-Only Detailed Change Reporting** — Không report theo từng step; chỉ xuất một report cuối, gồm baseline, thay đổi theo từng file/symbol, before → after, actual impact, edge-cases, verification evidence, rollback và câu hỏi còn mở.

---

## Task Workflow

```
CONTEXT:
- Plan Target: $ARGUMENTS (or default implementation_plan.md / {task-slug}.md)

WORKFLOW:
1. READ Plan File & Load Skill `plan-execution`
2. CAPTURE BASELINE:
   - Plan status, Investigation Contract, acceptance criteria, planned write scope, impacted files/symbols/flows, assumptions and open questions.
   - Check git/worktree or file snapshot when available; record `unavailable` instead of guessing.
3. PARSE Task Steps & Acceptance Criteria
4. EXECUTE Step-by-Step:
   - Before each step: record expected state and write scope.
   - Apply code modifications → capture exact changed files/symbols and before → after summary → run checklist/tests → update tracker.
   - Ghi step ledger nội bộ theo `plan-execution/SKILL.md`; không emit report ra chat ở bước này.
   - python .agents/scripts/checklist.py .

5. AUTO-SYNC AST Code Graph & Semantic Embeddings:
   Option A (Incremental, ưu tiên):
     rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
     rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local

   Option B (Full rebuild nếu có nhiều thay đổi lớn):
     rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/build-index.ps1
     (build-index.ps1 đã tích hợp sẵn embed)

6. VERIFY Status:
   rtk .agents/.venv/Scripts/code-review-graph.exe status
   → Xác nhận Nodes, Edges, Embeddings count đã cập nhật.

7. REPORT ONE Detailed Execution Change Report at the end:
   - Executive summary and overall status.
   - Step ledger and detailed file/symbol inventory.
   - Planned vs actual impact and unexpected impact.
   - Edge-case matrix with covered/unverified/deferred status.
   - Exact verification commands/results, graph/embedding status.
   - Remaining assumptions/questions, rollback/recovery and next steps.
```

---

## Expected Output

```markdown
## 🚀 Plan Execution Report

### 1. Executive Summary

- **Status:** READY | PARTIAL | BLOCKED
- **Plan File:** [Plan Path]
- **Objective:** [What the plan intended to change]
- **Result:** [What actually changed]
- **Steps Completed:** `<N>/<N>`

### 2. Baseline

- **Current state/evidence:** [Before snapshot]
- **Planned write scope:** [Paths/symbols]
- **Planned impact:** [Direct/indirect flows]
- **Assumptions/open questions:** [List]

### 3. Step Change Ledger

| Step | Status              | Files/Symbols | Before → After | Actual Impact | Verification    |
| ---- | ------------------- | ------------- | -------------- | ------------- | --------------- |
| 1    | PASS/FAILED/BLOCKED | ...           | ...            | ...           | `command` → ... |

### 4. Detailed File Changes

- `<path>` — added/modified/deleted/renamed
  - **Symbols/sections:** ...
  - **Before → After:** ...
  - **Why:** ...

### 5. Edge-case Matrix

| Scenario | Expected | Evidence/Test | Status                      |
| -------- | -------- | ------------- | --------------------------- |
| ...      | ...      | ...           | covered/unverified/deferred |

### 6. Verification Evidence

- `[exact command]` → PASS/FAIL; [quantified result]
- AST graph: [nodes/edges/status]
- Embeddings: [count/status]

### 7. Remaining Risk & Recovery

- **P1/P2 questions/assumptions:** ...
- **P0:** none, or `BLOCKED` with question
- **Rollback/recovery:** ...
- **Next steps:** ...

### 8. Completion Gate

- [ ] All steps PASS
- [ ] Verification commands executed and evidence captured
- [ ] Actual impact reviewed against planned impact
- [ ] Edge-cases classified
- [ ] No unresolved P0
- [ ] Graph/embedding sync completed when code changed
```

---

## Usage Examples

```
/execute-plan
/execute-plan auth-feature.md
/execute-plan .agents/handoffs/US-01_tao-tai-khoan/TASK-1.md
```
