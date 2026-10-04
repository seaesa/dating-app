---
description: Đọc source và tạo lại project-context.md cùng constitution.md ở project root với evidence, luật bắt buộc và secret redaction.
---

# /constitution — Generate Project Context & Constitution

$ARGUMENTS

---

## 🔴 Critical Rules

1. Load `.agents/skills/constitution/SKILL.md` và `@[skills/investigation-contract]` trước khi đọc/generate.
2. Target luôn là project root hiện tại:
   - `project-context.md`
   - `constitution.md`
3. Đọc source, docs, config, tests, scripts, deployment và `.agents` theo phạm vi trong skill; loại trừ vendor/generated/cache/binary/secret values.
4. Không tự suy diễn luật. Fact phải có evidence; inference phải gắn `[INFERRED — NEEDS CONFIRMATION]`.
5. Render hoàn chỉnh cả hai file trong memory, validate required sections và secret redaction trước khi ghi.
6. Ghi đè toàn bộ hai file theo yêu cầu; không append/merge nội dung cũ.
7. Sau khi ghi bắt buộc re-read cả hai file và kiểm tra output thực tế. Không report success nếu write/re-read/validation fail.
8. Chỉ trả một final report sau khi hoàn tất; không emit report theo từng thư mục/file.

## Workflow

```text
[Load rules/memory]
        ↓
[Inventory + read source/docs/config/tests]
        ↓
[Graph/flow/impact analysis when available]
        ↓
[Investigation Contract: state/impact/edge-cases/unknowns]
        ↓
[Render project-context.md + constitution.md in memory]
        ↓
[Validate headings + redact secrets]
        ↓
[Overwrite both root files]
        ↓
[Re-read + cross-check + final report]
```

## Execution Steps

### 1. Baseline and scope

- Resolve project root and source revision if available.
- Check whether target files already exist; record that they will be overwritten.
- Read `.agents/memory/MEMORY.md`, and read `HANDOFF_INDEX.md` if it exists, plus relevant project rules.
- Record excluded paths and tool limitations.

### 2. Source investigation

- Inventory entry points, source directories, manifests, configs, tests, schemas, migrations, scripts and deployment files.
- Read the smallest relevant set deeply enough to explain runtime flows and module boundaries.
- Use code graph/AST for symbols, callers/callees and coupling when available; otherwise state the fallback.
- Capture evidence as `path:line`, command result or graph result.

### 3. Build Investigation Contract

Return internally:

- Current state and evidence.
- Direct/indirect technical and user/system impact.
- Edge-cases and risk gaps.
- Confirmed decisions, inferred conventions, assumptions and unknowns.
- Questions the agent cannot safely resolve.

P0 questions block generation. P1/P2 questions are written into both documents with explicit assumptions/defaults.

### 4. Render `project-context.md`

Include all required sections from `constitution/SKILL.md`. Keep technical facts separate from recommendations. Include a source index and explicit `unknown`/`not found` entries for missing artifacts.

### 5. Render `constitution.md`

Derive mandatory rules from project rules, existing conventions, tests, security constraints and verified architecture. Each rule must state:

- Rule ID and MUST/MUST NOT text.
- Why it exists.
- Evidence/source.
- How an agent/developer verifies compliance.
- Whether it is `CONFIRMED` or `[INFERRED — NEEDS CONFIRMATION]`.

### 6. Validate and overwrite

- Check both documents contain every required heading.
- Search generated content for secret-like values, tokens, private keys and raw `.env` values; redact before write.
- Write both files at project root, replacing existing content entirely.
- Re-read both files from disk.
- Verify headings, file names, evidence links, redaction and no partial/empty output.

## Final Output

```markdown
## 🏛️ Constitution Generation Report

### Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Confidence:** high | medium | low
- **Scope:** [source/docs/config/tests included and excluded]
- **Evidence gaps:** [unknown/unavailable items]

### Generated Files

- `project-context.md` — overwritten: yes/no; sections: [count/status]
- `constitution.md` — overwritten: yes/no; rules: [count/status]

### Technical Findings

- [Architecture/runtime/stack finding] — evidence: `path:line`

### Constitution Summary

- [Rule ID] [mandatory principle] — CONFIRMED/INFERRED — verification: ...

### Redactions & Exclusions

- [secret/generated/vendor/binary paths excluded or redacted]

### Questions & Risks

- P0: none, or `BLOCKED` with question
- P1/P2: [assumption/default and impact]

### Verification Evidence

- `[exact command]` → PASS/FAIL
- Re-read `project-context.md` → PASS/FAIL
- Re-read `constitution.md` → PASS/FAIL
- Required headings/redaction check → PASS/FAIL

### Next Steps

- [Follow-up question, confirmation or `/plan` task]
```

## Usage

```text
/constitution
/constitution focus on backend/API and deployment rules
```
