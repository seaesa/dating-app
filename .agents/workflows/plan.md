---
description: Create project plan using strict 4-stage pipeline (Context/Rules -> Dual Search (semantic code + knowledge) -> AST Impact -> Plan generation). No code writing.
---

# /plan - Project Planning Mode

$ARGUMENTS

---

## 🔴 CRITICAL RULES & PIPELINE

1. **NO CODE WRITING** - This command creates plan file only.
2. **STRICT 4-STAGE PIPELINE**:
   - **Stage 1 (Context & Memory):** Parse `$ARGUMENTS`, đọc rules cốt lõi, query knowledge DB để tìm quyết định và bối cảnh liên quan.
   - **Stage 2 (Dual Code Investigation):** Tìm semantic code liên quan + trace AST blast radius.
   - **Stage 3 (Socratic Gate):** Làm rõ ambiguities, confirm scope.
   - **Stage 4 (Author Plan File):** Viết plan với đầy đủ Investigation Contract, impacted symbols, task breakdown, verification criteria.
3. **Dynamic Naming** — Plan file lưu tại `.agents/docs/plan/{task-slug}.md`.

4. **INVESTIGATION CONTRACT GATE** — Trước khi viết plan, phải báo cáo hiện trạng có evidence/confidence, impact, edge-cases, assumptions và câu hỏi quyết định. Có P0/blocking thì dừng, không tạo implementation plan.

---

## Task Execution Flow

```
WORKFLOW:
1. RECEIVE Task: Parse request $ARGUMENTS

2. QUERY KNOWLEDGE DB & MEMORY:
   rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "$ARGUMENTS"
   → Tìm: past decisions, ADRs, conventions, similar handoffs đã làm.

3. SEMANTIC CODE SEARCH:
   rtk .agents/.venv/Scripts/code-review-graph.exe search "$ARGUMENTS" --limit 15
   → Tìm: code nodes liên quan đến tính năng/task theo ngữ nghĩa.
   rtk .agents/.venv/Scripts/code-review-graph.exe architecture
   → Hiểu tổng quan kiến trúc hiện tại trước khi plan.

4. AST BLAST RADIUS (sau khi biết files liên quan từ bước 3):
   rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <relevant_files>
   → Xác định chính xác files bị ảnh hưởng, liệt kê trong plan.

5. SOCRATIC GATE:
   - Nếu còn ambiguity → đặt câu hỏi làm rõ cho user.

6. AUTHOR PLAN:
   Create .agents/docs/plan/{task-slug}.md với:
   - Investigation Contract (current state, evidence, impact, edge-cases, questions)
   - Objectives, Past Context (từ Knowledge DB)
   - Related Code Symbols (từ code-review-graph search)
   - Impacted Files (từ code-review-graph impact)
   - Task Breakdown, Verification Plan

7. REPORT Plan Creation với link file và hướng dẫn /execute-plan
```

---

## Expected Output

| Deliverable          | Location                                        |
| -------------------- | ----------------------------------------------- |
| Project Plan         | `.agents/docs/plan/{task-slug}.md`              |
| Related Code Symbols | Trong plan file (từ `code-review-graph search`) |
| Impacted Files       | Trong plan file (từ `code-review-graph impact`) |
| Past Context         | Trong plan file (từ `inspect_vector_db.py`)     |
| Task Breakdown       | Trong plan file                                 |
| Verification Plan    | Trong plan file                                 |

## Investigation Contract (BẮT BUỘC TRƯỚC KHI AUTHOR PLAN)

```markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Current state:** facts + evidence + confidence
- **Impact:** direct/indirect files, symbols, flows, users, data, security, performance
- **Edge-cases:** covered / unverified / deferred
- **Decisions:** confirmed / inferred / assumptions / unknowns
- **Questions:** P0/P1/P2, trade-offs, default, blocking
- **Next action:** plan or ask user
```

Nếu `Status: BLOCKED`, output chỉ gồm contract và câu hỏi cần user trả lời; không gọi `/execute-plan` và không dispatch implementation agent.

---

## After Planning

Tell user:

```
[OK] Plan created: .agents/docs/plan/{slug}.md

Next steps:
- Review the plan
- Run `/execute-plan .agents/docs/plan/{slug}.md` to start step-by-step implementation
```

---

## Usage

```
/plan e-commerce site with cart
/plan refactor authentication service
/plan add dark mode feature
```
