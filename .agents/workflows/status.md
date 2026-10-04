---
description: Display agent and project status. Progress tracking and status board.
---

# /status - Show Status

$ARGUMENTS

---

## Task

Show current project and agent status.

### What It Shows

1. **Handoff Index Board (Bảng Điều phối Tập trung)**
   - Read `.agents/handoffs/HANDOFF_INDEX.md` for live task status.
   - Show: In-Progress 🔄 | Pending 🟡 | Completed ✅
   - If `HANDOFF_INDEX.md` is stale (>1h), auto-regenerate: `py .agents/scripts/generate_handoff_index.py`

2. **Project Info**
   - Project name and path
   - Tech stack
   - Current features

3. **Agent Status Board**
   - Which agents are running
   - Which tasks are completed
   - Pending work

4. **File Statistics**
   - Files created count
   - Files modified count

5. **Preview Status**
   - Is server running
   - URL
   - Health check

---

## Example Output

```
=== Project Status ===

📁 Project: harness-engineering
📂 Path: C:/projects/production/harness-engineering
📊 Status: active

=== 📋 Handoff Index Board ===
(source: .agents/handoffs/HANDOFF_INDEX.md)

🔄 In-Progress (1):
   • TASK-3 [US-01] Refactor LeaveService — owner: agent-A

🟡 Pending (2):
   • TASK-5 [US-02] Add Notification — unassigned
   • TASK-6 [US-02] Fix Cancel Bug — unassigned

✅ Done (1):
   • TASK-1 [US-01] Setup Auth — SHA: abc123f

=== Agent Status ===

✅ backend-specialist → Completed
🔄 orchestrator → In-Progress (TASK-3)
⏳ frontend-specialist → Waiting

=== Preview ===

=== 🌐 Code Graph & Semantic Index ===
(source: code-review-graph status + .agents/indexes/code-graph.json)

AST Nodes:          222
AST Edges:          3,624
Semantic Embeddings: 188  (all-MiniLM-L6-v2, 384-dim)
Knowledge Chunks:   2,965 (vector-store.sqlite, 256-dim)

💡 Run `/update-graph` to refresh. Run `/query-graph search <topic>` to search code semantically.
```

---

## Technical

Status uses these scripts:

- `python .agents/scripts/session_manager.py status`
- `python .agents/scripts/generate_handoff_index.py` (refresh handoff board)
- `rtk .agents/.venv/Scripts/code-review-graph.exe status` (AST Graph health check)
- `rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py` (Vector Store inspection)
- `python .agents/scripts/auto_preview.py status`
