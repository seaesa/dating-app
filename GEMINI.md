# Entry Point cho AI Agent - Project Context

@.agents/rules/core-protocol.md
@.agents/rules/coding-standards.md
@.agents/rules/request-routing.md
@.agents/rules/universal-rules.md
@.agents/rules/code-rules.md
@.agents/rules/design-rules.md
@.agents/memory/MEMORY.md

## 🚨 MANDATORY SESSION START PROTOCOL

Khi khởi tạo session mới, Agent BẮT BUỘC thực hiện các bước sau trước khi tiếp nhận và xử lý yêu cầu người dùng:

1. **Nạp Tri thức Dự án & Memory:** Đọc `.agents/memory/MEMORY.md` để nắm bối cảnh dự án, quy chuẩn kỹ thuật và các quyết định quá khứ.
2. **Kiểm tra Handoff:** Kiểm tra tệp `.agents/handoffs/HANDOFF_INDEX.md` xem có công việc dở dang hoặc task cần tiếp quản hay không.
3. **Đăng ký Điều phối (Coordination Check):** Nếu chuẩn bị sửa mã nguồn, đọc hoặc tạo `.agents/coordination/<TASK-ID>.yaml` để khai báo `write_scope`, tránh xung đột với các Agent/Dev khác.
4. **Kiểm tra Baseline & Đăng ký Skill:** Kiểm tra Git status, test baseline và thông báo Skill/Agent đang sử dụng (`📚 Using skill: @...` / `🤖 Applying knowledge of @...`).
5. **Đồng bộ Chỉ mục:** Chạy `.agents/scripts/build-index.ps1` (hoặc `detect-changes`) sau khi hoàn thành công việc.

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool                             | Use when                                               |
| -------------------------------- | ------------------------------------------------------ |
| `detect_changes_tool`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context_tool`        | Need source snippets for review — token-efficient      |
| `get_impact_radius_tool`         | Understanding blast radius of a change                 |
| `get_affected_flows_tool`        | Finding which execution paths are impacted             |
| `query_graph_tool`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview_tool` | Understanding high-level codebase structure            |
| `refactor_tool`                  | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.

<!-- /code-review-graph MCP tools -->
