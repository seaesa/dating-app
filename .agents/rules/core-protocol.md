---
trigger: always_on
---

# Core Protocol - AG Kit

> The highest-priority workspace rules. How the AI loads agents/skills and what it must do before any implementation.

---

## CRITICAL: AGENT & SKILL PROTOCOL (START HERE)

> **MANDATORY:** You MUST read the appropriate agent file and its skills BEFORE performing any implementation. This is the highest priority rule.

### 1. Modular Skill Loading Protocol

Agent activated → Check frontmatter "skills:" → Read SKILL.md (INDEX) → Read specific sections.

- **Selective Reading:** DO NOT read ALL files in a skill folder. Read `SKILL.md` first, then only read sections matching the user's request.
- **Rule Priority:** P0 (Workspace Rules in `.agents/rules/`) > P1 (Agent `.md`) > P2 (SKILL.md). All rules are binding.

### 1.1 Skill Announcement (MANDATORY)

**Every time you load and apply a skill, announce it BEFORE using it** — so the user can verify which knowledge is active.

```markdown
📚 **Using skill: `@[skill-name]`...**
```

- List multiple skills together: `📚 Using skills: @frontend-design + @design-spec...`
- Announce on-demand skills too (e.g. a companion skill pulled from a hub, or `app-builder` for a new app), not just frontmatter ones.
- ❌ Applying a skill without announcing it = **USER CANNOT VERIFY THE SKILL WAS USED**.

### 2. Enforcement Protocol

1. **When agent is activated:**
   - ✅ Activate: Read Rules → Check Frontmatter → Load SKILL.md → Apply All.
2. **Forbidden:** Never skip reading agent rules or skill instructions. "Read → Understand → Apply" is mandatory.

---

## File Dependency Awareness

**Before modifying ANY file:**

1. If `CODEBASE.md` exists, check its File Dependencies section.
2. Otherwise, discover dependencies with targeted search/import analysis; do not block waiting for a missing file.
3. Identify dependent files and update all affected files together.

---

## System Map & Memory Read

> **MANDATORY:** At session start, you MUST read `.agents/memory/MEMORY.md` to load persistent project conventions, user preferences, and decisions.

> **Catalog lookup (on-demand, NOT every session):** Need the full list of Agents / Skills / Scripts? The `quick-reference` rule has the essentials. For the complete catalog, read `.agents/ARCHITECTURE.md` only when you actually need it (e.g. orchestration, or discovering a skill you're unsure exists) — do NOT load it on every request.

**Path Awareness (Note: the project directory name is `.agents` plural):**

- Agents: `.agents/agent/` (Project)
- Skills: `.agents/skills/` (Project)
- Memory: `.agents/memory/` (Project)
- Runtime Scripts: `.agents/skills/<skill>/scripts/`

---

## Read → Understand → Apply

```
❌ WRONG: Read agent file → Start coding
✅ CORRECT: Read → Understand WHY → Apply PRINCIPLES → Code
```

**Before coding, answer:**

1. What is the GOAL of this agent/skill?
2. What PRINCIPLES must I apply?
3. How does this DIFFER from generic output?

## Investigation Output Contract (MANDATORY)

For any request that explores the codebase, plans a change, debugs, reviews, traces impact, or coordinates agents, load and apply `@[skills/investigation-contract]`.

The agent MUST return one contract containing:

1. Current state with evidence and confidence.
2. Direct/indirect impact and affected flows.
3. Relevant edge cases and their verification status.
4. Confirmed decisions, evidence-backed inferences, assumptions, and unknowns.
5. Questions the agent cannot safely decide, with priority, trade-offs, default, and blocking status.
6. Next action, write scope, and verification method.

If any question is `P0`/blocking, set `Status: BLOCKED`, do not write files, and do not dispatch implementation agents until the user answers. `P1`/`P2` questions may proceed only with an explicit assumption. Domain-specific reports may keep extra sections, but may not omit the contract.

---

## Data Classification & Security Policy

### Phân loại Dữ liệu:

- **Public / Internal:** Mã nguồn nội bộ, tài liệu kĩ thuật không chứa secret -> Được phép đưa vào prompt cho các Agent Model đã được cấp phép.
- **Confidential / Restricted:** Passwords, API Keys, Private Keys, Session Cookies, OAuth Tokens, dữ liệu cá nhân (PII), dữ liệu thanh toán, dữ liệu khách hàng thật -> **Tuyệt đối CẤM đưa vào prompt, log, memory, handoff hay index**.

---

## Handoff Protocol & Context Management

1. **Cấu trúc Thư mục theo User Story:**
   - Mỗi User Story có một thư mục riêng đặt tên theo định dạng `.agents/handoffs/<US-ID>_<US-NAME-SLUG>/` (ví dụ: `.agents/handoffs/US-01_cap-nhat-thong-tin-ca-nhan/`).
   - File Master Tracker của US nằm tại: `.agents/handoffs/<US-ID>_<US-NAME-SLUG>/<US-ID>.md`.
   - Các file Task con và Context Manifest nằm tại cùng thư mục US đó: `.agents/handoffs/<US-ID>_<US-NAME-SLUG>/<TASK-ID>.md` và `<TASK-ID>.context.yaml`.
2. **Trước khi thực hiện Task:**
   - Agent kiểm tra tệp bàn giao trong thư mục US tương ứng: `.agents/handoffs/<US-ID>_<US-NAME-SLUG>/<TASK-ID>.md` và `<TASK-ID>.context.yaml`.
   - Nếu tồn tại file handoff, Agent MUST tuân thủ đúng `head_sha`, kiểm tra lại test baseline và làm tiếp theo danh sách "Bước tiếp theo dành cho người tiếp quản".
3. **Trước khi kết thúc Session (Nếu công việc chưa xong):**
   - Tạo/cập nhật file handoff của task trong thư mục US theo đúng template [HANDOFF.template.md](file:///c:/Users/intern-quantlm/projects/production/harness-engineering/.agents/templates/HANDOFF.template.md) và cập nhật trạng thái checklist tương ứng trong file Master Tracker `<US-ID>.md`.
   - Đảm bảo ghi lại Commit SHA, kết quả test thực tế và bước tiếp theo rõ ràng.
4. **Quy tắc Distill:**
   - KHÔNG bao giờ đưa raw chat, transcript dài dòng hay Chain-of-Thought vào file handoff. Chỉ lưu thông tin kỹ thuật được chắt lọc ngắn gọn.
5. **HANDOFF_INDEX.md — Bảng Điều phối Tập trung (BẮT BUỘC):**
   - **Trước khi bắt đầu Task mới:** Agent PHẢI đọc `.agents/handoffs/HANDOFF_INDEX.md` để kiểm tra task nào đang in-progress, ai đang giữ, và task nào bị blocked — tránh xung đột.
   - **Sau khi tạo hoặc đóng handoff** (`/handoff`, `/add-task`, `/break-task`): Agent PHẢI cập nhật frontmatter `status` trong file `.md` của task tương ứng, sau đó chạy `py .agents/scripts/generate_handoff_index.py` để tự động tái sinh `HANDOFF_INDEX.md`.
   - `HANDOFF_INDEX.md` được tự động tái sinh trong mỗi lần chạy `build-index.ps1`.

---

## Code Review Graph AST Protocol

> **CÂY QUYẾT ĐỊNH KÍCH HOẠT VÀ NGUYÊN TẮC THỰC THI AST GRAPH:**

1. **Cây Quyết định Tư duy (Agent Decision Matrix):**
   Trước khi thực hiện tác vụ liên quan đến mã nguồn, Agent tự kiểm tra:
   - ❓ **Tác vụ có cần tìm quan hệ gọi hàm/lớp, bán kính tác động khi refactor hay điều tra bug đa tệp không?**
     - **CÓ:** Kích hoạt MCP Server `code-review-graph` (sử dụng tool `get_blast_radius` hoặc `query_symbol` trên Symbol nghi vấn).
     - **KHÔNG (Tìm chuỗi văn bản, tổng quan README, sửa 1 file độc lập):** Dùng `view_file` / `grep_search` trực tiếp, KHÔNG gọi `code-review-graph`.
2. **Khai thác Đúng MCP Tools Chuyên sâu:**
   - Khi điều tra bug/refactor, Agent **BẮT BUỘC gọi MCP Tools cụ thể** (`code-review-graph/get_blast_radius`, `code-review-graph/query_symbol`) để lấy danh sách Nút (Nodes) và Cạnh (Edges) thực sự.
3. **Phân định Vai trò Lệnh `status` (CẤM Hình thức hóa - No Status Fallacy):**
   - Lệnh `code-review-graph status` CHỈ DÙNG ĐỂ KIỂM TRA SỨC KHỎE CSDL (Healthcheck). Lệnh `status` **KHÔNG CHỨA CHI TIẾT NGHIỆP VỤ HAY CẤU TRÚC HÀM**.
   - CẤM TUYỆT ĐỐI việc gọi lệnh `status` suông rồi tự ghi log _"Đã phân tích X tệp..."_ trong khi thông tin thu thập được là từ đọc tệp thủ công.
4. **Tự động Cập nhật Đồ thị sau khi Sửa Code (Mandatory Auto-Sync Protocol):**
   - **BẮT BUỘC:** Sau KHI BẤT KỲ LẦN CHỈNH SỬA HOẶC TẠO MỚI MÃ NGUỒN NÀO (hoặc trước khi chạy `/review-code` / `/handoff`), Agent **BẮT BUỘC PHẢI PHÁT RA LỆNH `run_command`** thực thi `rtk .agents/.venv/Scripts/code-review-graph.exe build` (hoặc `rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/build-index.ps1`) để cập nhật tức thì các nút/cạnh AST mới vào CSDL `.code-review-graph/graph.db` trước khi thông báo hoàn tất công việc cho người dùng.

---

## SQLite Vector Store & Memory Retrieval Protocol

> **BẮT BUỘC KHI TRUY XUẤT TRI THỨC VÀ NHẬT KÝ CÔNG VIỆC:**

1. **Cưỡng chế Tự động Kích hoạt Tool Call (Mandatory Tool Execution):**
   - Khi nhận được các câu hỏi về tiến độ/nhật ký công việc (ví dụ: _"Hôm nay làm được gì rồi?"_, _"Tiến độ dự án"_, _"Nhật ký quá khứ"_), Agent **TUYỆT ĐỐI CẤM TRẢ LỜI NGAY BẰNG TEXT THUẦN TÚY**.
   - Agent **BẮT BUỘC PHẢI PHÁT RA LỆNH TOOL CALL `run_command`** chạy script `py .agents/scripts/inspect_vector_db.py` để truy vấn CSDL vật lý `.agents/indexes/vector-store.sqlite` trước khi tổng hợp kết quả trả về cho người dùng.
2. **Tự động Đồng bộ Chỉ mục (Auto Index Sync):**
   - Sau khi hoàn thành báo cáo ngày `/daily-summary`, Agent kích hoạt kịch bản `.agents/scripts/build-index.ps1` để tự dọn cache và nạp dữ liệu mới vào Vector DB.

---

## Explicit Execution Traceability Protocol (STRICT NO-FALSE-LOG RULE)

> **BẮT BUỘC CHỈ IN DẤU VẾT KHI THỰC SỰ PHÁT RA TOOL CALL:**

1. **Điều kiện Cưỡng chế:** Agent **CHỈ ĐƯỢC PHÉP IN KHỐI LOG `🔍 [DATA TRACEABILITY LOG]` KHI VÀ CHỈ KHI TRONG CHÍNH LƯỢT ĐÓ AGENT THỰC SỰ PHÁT RA TOOL CALL** (`run_command` chạy SQL/CLI hoặc gọi MCP Server).
2. **Cấm Log Ảo:** Nếu lượt phản hồi chỉ là giải thích thuần văn bản (text-only) mà không gọi Tool Call vật lý -> **TUYỆT ĐỐI CẤM IN KHỐI LOG DẤU VẾT NÀY**.
3. **Format Log Chuẩn (Chỉ dùng khi có Tool Call trong cùng lượt):**

```markdown
🔍 **[DATA TRACEABILITY LOG]**

- **Tool Call Executed:** `run_command` / MCP Server `code-review-graph`
- **Target DB:** `.agents/indexes/vector-store.sqlite` / `.code-review-graph/graph.db`
- **Empirical Result:** [Output thực tế trả về từ OS Terminal Process]
```
