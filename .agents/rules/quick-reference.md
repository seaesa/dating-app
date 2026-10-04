---
trigger: model_decision
description: Apply when you need a fast lookup of which agents, skills, or validation scripts exist — for routing decisions or recalling the master/key components of the kit.
---

# Quick Reference - AG Kit

> A fast index of the most-used agents, skills, and scripts.

## Agents & Skills

- **Masters**: `orchestrator`, `project-planner`, `security-auditor` (Cyber/Audit), `backend-specialist` (API/DB), `frontend-specialist` (UI/UX), `mobile-developer`, `debugger`, `game-developer`
- **Key Skills**: `clean-code`, `brainstorming`, `investigation-contract`, `constitution`, `app-builder`, `frontend-design`, `mobile-design`, `plan-writing`, `behavioral-modes`

## Key Scripts

- **Phase 3 Setup, Indexing & Vector Query**:
  - `.agents/scripts/init-harness.ps1` (Khởi tạo 1-click venv cục bộ .agents/.venv + build DB chỉ mục trên Windows)
  - `.agents/scripts/init-harness.sh` (Khởi tạo 1-click venv cục bộ .agents/.venv + build DB chỉ mục trên Linux/macOS)
  - `.agents/scripts/build-index.ps1` (Tự động rebuild CSDL SQLite Vector Store & AST Code Graph)
  - `.agents/scripts/inspect_vector_db.py` (Engine tra cứu SQL & tìm kiếm ngữ nghĩa trong `vector-store.sqlite`)
  - `.agents/scripts/test_mcp_db.js` (Smoke test kiểm tra kết nối MCP và CSDL)
- **Verify**: `.agents/scripts/verify_all.py`, `.agents/scripts/checklist.py`
- **Scanners**: `security_scan.py`
- **Audits**: `ux_audit.py`, `mobile_audit.py`, `lighthouse_audit.py`, `seo_checker.py`
- **Test**: `playwright_runner.py`, `test_runner.py`

## MCP Servers & Workflows

- **MCP Servers**: `code-review-graph` (Tools: `get_blast_radius`, `query_symbol`, `search_nodes` - Tra cứu AST graph & Blast Radius từ `.code-review-graph/graph.db`)
- **Slash Commands**: `/constitution`, `/query-graph`, `/update-graph`, `/execute-plan`, `/query-vector`, `/review-code`, `/daily-summary`, `/break-task`, `/add-task`, `/debug`

---
