---
description: Verify code changes work by running them. Proves through execution, not just inspection.
---

# /verify — Prove Code Works

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load verify-changes skill** — Read `.agents/skills/verify-changes/SKILL.md` first
2. **Execute, don't inspect** — Run the code, don't just read it
3. **Report evidence** — Show actual output, not assumptions
4. **Cover edge cases** — Test error paths, not just happy path

---

## Task

Use the `verify-changes` skill to prove code works:

```
CONTEXT:
- What to verify: $ARGUMENTS
- If empty: verify the most recent code changes in this session

WORKFLOW:
1. IDENTIFY what changed (files, functions, behavior)
2. EXECUTE master validation script:
   - Run: `python .agents/scripts/checklist.py .` (for priority-based static & test verification)
   - If runtime URL is available: `python .agents/scripts/verify_all.py . --url <URL>`
3. EXECUTE target-specific verification commands (build, pytest, Playwright, curl)
4. REPORT evidence of success or failure with actual terminal outputs
5. FLAG anything that couldn't be verified automatically

RULES:
1. Follow verify-changes/SKILL.md protocol
2. "It should work" is NOT verification — run it
3. Test error paths, not just success paths
4. Report with actual command output as evidence
5. Include the Investigation Contract: current state, affected behavior, edge-cases verified/unverified, assumptions, unresolved questions, and overall status.
```

---

## Expected Output

```
## Verification Report

### Changes Verified
- [file/change 1]: ✅ Pass
- [file/change 2]: ✅ Pass

### Evidence
- Build: ✅ Compiled without errors
- Tests: ✅ [N]/[N] passing
- Runtime: ✅ [specific verification result]

### Not Verified
- [anything that needs manual testing]
```

---

## Usage Examples

```
/verify
/verify the login endpoint handles expired tokens
/verify build passes after refactoring
/verify the new component renders correctly
```
