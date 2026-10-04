---
description: Debugging command. Activates DEBUG mode for systematic problem investigation with AST Code Graph blast radius analysis and semantic code search.
---

# /debug - Systematic Problem Investigation & AST Graph Tracing

$ARGUMENTS

---

## 🔴 CRITICAL RULES & PIPELINE

1. **DUAL SEARCH INVESTIGATION** — Dùng song song 2 nguồn để tìm context:
   - `code-review-graph search "<symptom>"` → Tìm code liên quan theo ngữ nghĩa.
   - `inspect_vector_db.py "<symptom>"` → Tìm handoff/memory về bug tương tự đã gặp.
2. **STRICT 4-STEP PIPELINE**:
   - **Step 1 (Gather & Dual Search):** Thu thập triệu chứng, reproduction steps. Chạy cả 2 search song song.
   - **Step 2 (Structural AST Tracing):** Dùng `impact --files` / `query <symbol>` truy tìm caller/callee chains.
   - **Step 3 (Hypothesis & Elimination):** Xác minh logs, test các call paths.
   - **Step 4 (Surgical Fix & Graph Sync):** Chỉ apply fix khi Investigation Contract không còn P0 → `update --brief` → `embed --provider local`.
3. **INVESTIGATION CONTRACT GATE** — Trước khi sửa, bắt buộc báo cáo hiện trạng, impact, edge-cases, evidence/confidence và câu hỏi. Nếu có P0, dừng ở `BLOCKED`.
4. **MANDATORY POST-FIX GRAPH SYNC** — Sau mọi code fix phải sync lại graph + re-embed:
   ```bash
   rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
   rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local
   ```

---

## Task Execution Flow

```
WORKFLOW:
1. GATHER Context & Dual Search:
   a) Semantic code search:
      rtk .agents/.venv/Scripts/code-review-graph.exe search "$ARGUMENTS"
   b) Knowledge/memory search:
      rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "$ARGUMENTS"
   c) Structural blast radius of suspected files:
      rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <suspect_file>

2. FORM Hypotheses:
   - Map potential failure points across AST dependency nodes
   - Cross-reference with past bug patterns from memory/handoffs

3. INVESTIGATE & Isolate:
   - Trace callers: rtk .agents/.venv/Scripts/code-review-graph.exe query <symbol>
   - Test hypotheses systematically using empirical evidence

4. FIX & AUTO-SYNC Graph + Embeddings:
   - Apply minimal fix
   - rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/checklist.py .
   - rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
   - rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local
```

---

## Output Format

````markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Current state/evidence:** ...
- **Impact:** direct/indirect callers, callees, flows, users, data, security, performance
- **Edge-cases:** covered / unverified / deferred
- **Questions:** P0/P1/P2 with trade-offs and blocking flag
- **Assumptions/confidence:** ...

## 🔍 Debug: [Issue]

### 1. Symptom & Reproduction

[What's happening, error message, reproduction steps]

### 2. Dual Search Results

#### Code Graph (Semantic)

- `code-review-graph search "<symptom>"` → [Top matching symbols]

#### Knowledge DB (Memory/Handoffs)

- `inspect_vector_db.py "<symptom>"` → [Relevant past findings]

### 3. AST Code Graph Investigation

- **Target Symbol:** `[symbol_name]` (`[filepath]`)
- **Impact Radius:** `code-review-graph impact --files [file]` → [affected files]
- **Callers:** [from code-review-graph query]
- **Callees:** [from code-review-graph query]

### 4. Hypotheses

1. ❓ [Most likely cause based on AST graph + semantic context]
2. ❓ [Second possibility]

### 5. Root Cause Analysis

🎯 **[Explanation of root cause]**

### 6. Fix & Code Verification

```[language]
// Before
[broken code]

// After
[fixed code]
```
````

### 7. Graph Sync Status

- [x] `update --brief` ✅
- [x] `embed --provider local` ✅ (Embeddings refreshed)
- 🛡️ [Prevention measure / regression test]

```

---

## Key Principles

- **Trace with AST Graph** — dùng `impact` + `query` + `search` để hiểu toàn bộ blast radius
- **Semantic first** — `search` tìm code liên quan mà không cần biết tên chính xác
- **Memory recall** — `inspect_vector_db` tìm bug tương tự đã fix trong quá khứ
- **Always re-embed** — sau code fix phải `update --brief` → `embed` để sync semantic index
```
