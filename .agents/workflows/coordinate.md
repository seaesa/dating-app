---
description: Advanced multi-agent coordination with parallel dispatch and synthesis. Use for complex tasks requiring multiple specialist perspectives.
---

# /coordinate — Advanced Multi-Agent Coordination

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load coordinator-mode skill** — Read `.agents/skills/coordinator-mode/SKILL.md` first
2. **Phase-based execution** — Research → Synthesis → Implementation → Verification
3. **Never delegate understanding** — Write specific prompts, not vague instructions
4. **Parallel reads, sequential writes** — Read-only tasks can run in parallel
5. **Investigation Contract** — Every worker returns current state/evidence, impact, edge-cases, assumptions, unresolved questions, confidence, and verification. A P0 question blocks implementation dispatch.

---

## Task

Use the `orchestrator` agent with this context:

```
CONTEXT:
- User Request: $ARGUMENTS
- Mode: COORDINATOR (advanced orchestration)
- Skill: Load coordinator-mode skill for patterns

WORKFLOW:
1. DECOMPOSE the request:
   a) Semantic code search — tìm code liên quan:
      rtk .agents/.venv/Scripts/code-review-graph.exe search "$ARGUMENTS" --limit 10
   b) Impact analysis — xác định scope để phân rã tasks, tránh write conflicts:
      rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <key_files>
   c) Knowledge context — tìm quyết định kiến trúc liên quan:
      rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "$ARGUMENTS"
   d) Phân định subtask rõ ràng dựa trên kết quả trên.
2. CLASSIFY each subtask: Research | Implementation | Verification
3. DISPATCH workers (parallel for reads, sequential for writes)
4. SYNTHESIZE results — don't copy-paste, add insight
5. VERIFY completeness before reporting to user
   - Merge worker contracts into one status; preserve evidence and mark `BLOCKED` if any P0 remains.

RULES:
1. Follow coordinator-mode/SKILL.md protocol
2. Brief workers like smart colleagues — full context, specific scope
3. Never write "based on your findings, fix it" — prove YOU understood
4. Start with 2-3 workers, add more after synthesis if needed
5. Research before implementation — ALWAYS
```

---

## Expected Output

| Deliverable      | Description                                   |
| ---------------- | --------------------------------------------- |
| Worker Dispatch  | List of agents invoked with task descriptions |
| Synthesis Report | Consolidated findings with YOUR analysis      |
| Action Items     | Specific next steps with file paths           |

## Required Synthesis Contract

The final synthesis must contain current state/evidence, direct/indirect impact, edge-cases with coverage status, confirmed decisions, assumptions/unknowns, P0/P1/P2 questions with trade-offs/default/blocking, overall status, and verification evidence.

---

## After Coordination

```
[OK] Coordination complete

Agents dispatched: [count]
Phases completed: Research → Synthesis → [Implementation] → [Verification]

Key findings:
- [Finding 1]
- [Finding 2]

Next steps:
- [ ] [Action item 1]
- [ ] [Action item 2]
```
