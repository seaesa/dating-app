---
description: Summarize today's work from Git log, Antigravity session transcripts, and Handoff files, save daily memory markdown, and index into Vector DB for semantic retrieval.
---

# /daily-summary — End of Day Work Summarizer & Vector Indexer

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load daily-work-summarizer skill** — Read `.agents/skills/daily-work-summarizer/SKILL.md` first.
2. **Triple-Source Distillation** — Must query Git log, Antigravity session transcripts (`USER_INPUT` steps), and Handoff files.
3. **No Secret / Raw Log Leakage** — Sanitize output, exclude raw dumps, API keys, and internal thinking.
4. **Vector Indexing with Provenance** — Save daily memory to `.agents/memory/daily/YYYY-MM-DD.md` and append vector chunk to `.agents/indexes/daily-work-vector.json`.

---

## Workflow Steps

```
CONTEXT:
- Date: $ARGUMENTS (Default: Today YYYY-MM-DD)

STEPS:
1. GATHER TRIPLE-SOURCE DATA:
   - Run `git log --since="00:00:00" --oneline` to fetch today's commits & modified files.
   - Read Antigravity session transcripts (filter `USER_INPUT` & key decisions from `transcript.jsonl`).
   - Scan `.agents/handoffs/` for tasks updated today.

2. DISTILL DAILY WORK DIGEST:
   - Summarize business goals accomplished today.
   - List completed tasks (`[x]`) and key files/symbols modified.
   - Record technical decisions, bug root causes, and verification evidence.

3. WRITE DAILY MEMORY MARKDOWN:
   - Save file to `.agents/memory/daily/YYYY-MM-DD.md`.

4. INDEX TO LOCAL VECTOR STORE:
   - Package content with Provenance Metadata (`commit_shas`, `session_ids`, `date`).
   - Append to `.agents/memory/daily/YYYY-MM-DD.md`.

5. REBUILD INDEX & SYNC VECTOR DB:
   - Execute `rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/build-index.ps1` to rebuild SQLite Vector DB & AST Graph.
   - Verify indexing: `rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py`
```

---

## Expected Output

```markdown
## 📝 Daily Work Summary & Vector Indexing Completed

- **Date:** YYYY-MM-DD
- **Daily Memory File:** [.agents/memory/daily/YYYY-MM-DD.md](file://./YYYY-MM-DD.md)
- **Vector Index Updated:** `.agents/indexes/daily-work-vector.json`
- **Commits Processed:** [N] commits
- **Tasks Completed:** [List of tasks]

### Key Highlights Today:

- [x] Business feature / bug fix summary 1
- [x] Business feature / bug fix summary 2
```

---

## Usage Examples

```
/daily-summary
/daily-summary 2026-08-03
```
