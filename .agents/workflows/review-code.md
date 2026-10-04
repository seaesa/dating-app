---
description: Perform thorough code review assessing code quality, logic correctness, security (OWASP), performance, and maintainability. Uses code-review-graph impact analysis and dead-code detection.
---

# /review-code — Code Quality & Security Audit

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load code-review skill** — Read `.agents/skills/code-review/SKILL.md` and `.agents/skills/code-review-checklist/SKILL.md` first.
2. **Actionable Feedback** — Every finding must include exact file location, issue explanation, and code fix.
3. **Strict Prioritization** — Categorize findings clearly (🔴 BLOCKING, 🟡 SUGGESTION, 🟢 NIT, ❓ QUESTION).
4. **No Phantom Bugs** — Verify syntax and logic against actual codebase context before reporting.

---

## Task

Conduct an end-to-end code review on specified files or recent changes:

```
CONTEXT:
- Target files/PR: $ARGUMENTS
- If empty: review recent git diff or code modifications in this session

WORKFLOW:
1. IDENTIFY modified or target files:
   git diff --name-only HEAD~1 HEAD
   (hoặc dùng $ARGUMENTS)

2. LOAD skills: code-review, code-review-checklist

3. RUN IMPACT ANALYSIS (thay thế cho generic blast radius):
   rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <modified_files>
   → Xác định danh sách files bị ảnh hưởng chính xác.

4. SEMANTIC SEARCH — Tìm patterns liên quan trong codebase:
   rtk .agents/.venv/Scripts/code-review-graph.exe search "<feature_name>" --kind Function
   → Tìm implementation patterns cùng loại để so sánh consistency.

5. RUN AUTOMATED AUDIT:
   python .agents/scripts/checklist.py .
   (covers Security Scan, Lint, Type Check, Schema Validation)

6. DEAD CODE CHECK (nếu review file lớn hoặc refactor):
   rtk .agents/.venv/Scripts/code-review-graph.exe dead-code
   → Tìm hàm/class không còn được gọi sau khi thay đổi.

7. AUDIT Correctness & Edge Cases (null checks, race conditions, error boundaries)
8. Return the Investigation Contract with current state/evidence, direct/indirect impact, edge-case coverage, assumptions, confidence, and questions the reviewer cannot decide. A P0 blocks merge/fix recommendations that require user policy.

8. AUDIT Security (OWASP Top 10, prompt injection, hardcoded secrets, input sanitization)

9. AUDIT Performance (N+1 queries, async handling, memory leaks, unindexed queries)

10. AUDIT Architecture & Code Quality (SOLID, DRY, type safety, modularity)

11. REPORT structured code review feedback with concrete code snippets
```

---

## Expected Output

````markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Current state/evidence:** ...
- **Impact:** direct/indirect callers, flows, users, data, security, performance
- **Edge-cases:** covered / unverified / deferred
- **Questions/assumptions:** P0/P1/P2 with trade-offs and blocking flag

## 🔍 Code Review Report

### Target: [Files / Diff Audited]

### Impact Radius

- **Files Changed:** `[N]`
- **Files Affected (downstream):** `[M]` (từ `code-review-graph impact`)
- **Semantic Matches:** `[patterns tương tự trong codebase]`

### Overview

- 🔴 Blocking Issues: [N]
- 🟡 Suggestions: [N]
- 🟢 Nits: [N]
- ❓ Questions: [N]

---

### Findings

🔴 **BLOCKING**: [Issue Title]

- **File**: `src/path/to/file.ts#L12-L25`
- **Problem**: [Technical explanation]
- **Fix**:
  ```ts
  // Fixed code implementation
  ```
````

🟡 **SUGGESTION**: [Issue Title]

- **File**: `src/path/to/file.ts#L40`
- **Recommendation**: [Improvement code/pattern]

🟢 **NIT**: [Formatting / Minor refactor]

- **File**: `src/path/to/file.ts#L55`

❓ **QUESTION**: [Ambiguous requirement or edge case assumption]

---

### Audit Summary

- [ ] Impact Radius Analyzed (code-review-graph impact)
- [ ] Correctness & Edge Case Handling
- [ ] Security & Data Validation
- [ ] Performance & Resource Management
- [ ] Maintainability & Type Safety
- [ ] Test Coverage & Verifiability
- [ ] Dead Code Check (code-review-graph dead-code)

```

---

## Usage Examples

```

/review-code
/review-code src/services/auth.ts
/review-code check API endpoints for security vulnerabilities

```

```
