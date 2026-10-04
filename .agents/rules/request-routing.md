---
trigger: always_on
---

# Request Routing - AG Kit

> Always-active. Classify every request, then auto-route to the best specialist agent(s) before responding.

---

## 📥 REQUEST CLASSIFIER (STEP 1)

**Before ANY action, classify the request:**

| Request Type         | Trigger Keywords                                                                                | Active Tiers                                             | Result                                                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QUESTION**         | "what is", "how does", "explain"                                                                | TIER 0 only                                              | Text Response                                                                                                                                                                                               |
| **STATUS/PROGRESS**  | "hôm nay làm", "tiến độ", "nhật ký", "đã làm gì", "progress"                                    | Vector DB Query Protocol                                 | **MUST execute Tool Call (`py .agents/scripts/inspect_vector_db.py`) to query `vector-store.sqlite` FIRST**                                                                                                 |
| **CODE_GRAPH / AST** | "blast radius", "phụ thuộc code", "refactor multi-file", "dùng code-review-graph", /query-graph | `code-review-graph` Protocol                             | Execute official `code-review-graph` CLI (`& ".agents/.venv/Scripts/code-review-graph.exe" status / detect-changes / build`) or call MCP Server `code-review-graph` when analyzing multi-file dependencies. |
| **SURVEY/INTEL**     | "đọc source", "hệ thống làm gì", "chi tiết nghiệp vụ", "analyze", "list files", "overview"      | TIER 0 + Explorer                                        | Read `README.md`, `ARCHITECTURE.md`, and directory structure directly.                                                                                                                                      |
| **SIMPLE CODE**      | "fix", "add", "change" (single file)                                                            | TIER 0 + TIER 1 (lite)                                   | Inline Edit                                                                                                                                                                                                 |
| **COMPLEX CODE**     | "build", "create", "implement", "refactor"                                                      | TIER 0 + TIER 1 (full) + Agent                           | **{task-slug}.md Required**                                                                                                                                                                                 |
| **NEW APP**          | "new app", "from scratch", "build me a/an", multi-page                                          | `project-planner` (loads `app-builder`) → `orchestrator` | **{task-slug}.md + app-builder**                                                                                                                                                                            |
| **DESIGN/UI**        | "design", "UI", "page", "dashboard"                                                             | TIER 0 + TIER 1 + Agent                                  | **{task-slug}.md Required**                                                                                                                                                                                 |
| **CONSTITUTION**     | `/constitution`, "project context", "project constitution", "technical rules"                   | `constitution` + `explorer-agent`                        | `project-context.md` + `constitution.md` at project root                                                                                                                                                    |
| **SLASH CMD**        | /constitution, /create, /orchestrate, /debug                                                    | Command-specific flow                                    | Variable                                                                                                                                                                                                    |

> 🔴 **CODE-REVIEW-GRAPH ROUTING RULE:** Use `code-review-graph` on-demand for multi-file AST dependency tracing, refactoring impact analysis, or `/query-graph`. For general system overview questions ("đọc source tìm hiểu hệ thống"), read `README.md` and codebase docs directly without unnecessary status tool calls!
> 🔴 **STATUS/PROGRESS QUERY RULE:** When asked "hôm nay làm được gì", "tiến độ", or past memory, Agent MUST NOT output text immediately. Agent MUST issue a `run_command` Tool Call to query `vector-store.sqlite` via `inspect_vector_db.py` first!
> 🔴 **NEW APP / scaffold from scratch:** route through `project-planner` or `orchestrator` (both load `app-builder`), NOT a lone specialist like `frontend-specialist`. A specialist alone has no project-detection, tech-stack selection, or template knowledge — `app-builder` does. Or run `/create`.

> 🔴 **INVESTIGATION CONTRACT RULE:** Any `SURVEY/INTEL`, `CODE_GRAPH / AST`, `COMPLEX CODE`, `DEBUG`, `PLAN`, `REVIEW`, `ORCHESTRATE`, or `COORDINATE` request MUST load `@[skills/investigation-contract]` and return its six required sections. A `P0`/blocking question changes the response status to `BLOCKED` and stops writes/implementation dispatch.

---

## 🤖 INTELLIGENT AGENT ROUTING (STEP 2 - AUTO)

**ALWAYS ACTIVE: Before responding to ANY request, automatically analyze and select the best agent(s).**

> 🔴 **MANDATORY:** You MUST follow the protocol defined in `@[skills/intelligent-routing]`.

### Auto-Selection Protocol

1. **Analyze (Silent)**: Detect domains (Frontend, Backend, Security, etc.) from user request.
2. **Select Agent(s)**: Choose the most appropriate specialist(s).
3. **Inform User**: Concisely state which expertise is being applied.
4. **Apply**: Generate response using the selected agent's persona and rules.

5. **Normalize output**: Require every selected agent to return current state, impact, edge-cases, unresolved decisions, assumptions, confidence, and verification evidence. The coordinator must merge these sections before responding.

### Response Format (MANDATORY)

When auto-applying an agent, inform the user:

```markdown
🤖 **Applying knowledge of `@[agent-name]`...**

[Continue with specialized response]
```

**Rules:**

1. **Silent Analysis**: No verbose meta-commentary ("I am analyzing...").
2. **Respect Overrides**: If user mentions `@agent`, use it.
3. **Complex Tasks**: For multi-domain requests, use `orchestrator` and ask Socratic questions first.

### ⚠️ AGENT ROUTING CHECKLIST (MANDATORY BEFORE EVERY CODE/DESIGN RESPONSE)

**Before ANY code or design work, you MUST complete this mental checklist:**

| Step | Check                                                    | If Unchecked                                 |
| ---- | -------------------------------------------------------- | -------------------------------------------- |
| 1    | Did I identify the correct agent for this domain?        | → STOP. Analyze request domain first.        |
| 2    | Did I READ the agent's `.md` file (or recall its rules)? | → STOP. Open `.agents/agent/{agent}.md`      |
| 3    | Did I announce `🤖 Applying knowledge of @[agent]...`?   | → STOP. Add announcement before response.    |
| 4    | Did I load required skills from agent's frontmatter?     | → STOP. Check `skills:` field and read them. |

**Failure Conditions:**

- ❌ Writing code without identifying an agent = **PROTOCOL VIOLATION**
- ❌ Skipping the announcement = **USER CANNOT VERIFY AGENT WAS USED**
- ❌ Ignoring agent-specific rules (e.g., Purple Ban) = **QUALITY FAILURE**

> 🔴 **Self-Check Trigger:** Every time you are about to write code or create UI, ask yourself:
> "Have I completed the Agent Routing Checklist?" If NO → Complete it first.

---

## 🎭 Gemini Mode Mapping

| Mode     | Agent             | Behavior                                     |
| -------- | ----------------- | -------------------------------------------- |
| **plan** | `project-planner` | 4-phase methodology. NO CODE before Phase 4. |
| **ask**  | -                 | Focus on understanding. Ask questions.       |
| **edit** | `orchestrator`    | Execute. Check `{task-slug}.md` first.       |

> 🔴 **Edit mode:** If multi-file or structural change → Offer to create `.agents/docs/plan/{task-slug}.md`. For single-file fixes → Proceed directly.
> Full Plan Mode (4-Phase) protocol lives in `code-rules.md`.

---
