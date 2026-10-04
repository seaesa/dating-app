# AG Kit — Hướng dẫn Sử dụng & Danh mục Workflows

> **AG Kit** là bộ công cụ mở rộng năng lực cho AI Agent, giúp quản lý công việc lập trình, tự động hóa quy trình phân rã task, lập kế hoạch, kiểm thử và phân tích cây phụ thuộc mã nguồn (AST Code Graph).

---

## ⚙️ 1. Hướng dẫn Cài đặt (Setup Guide)

### Yêu cầu hệ thống

- Python 3.9+
- Git
- PowerShell (Windows) hoặc Bash (Linux / macOS / Git Bash)

---

### 🚀 Cách cài đặt (Khuyên dùng — Interactive Wizard)

Clone bộ AG Kit về máy, sau đó chạy **một lệnh duy nhất**:

```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

```bash
# Linux / macOS / Git Bash
bash scripts/setup.sh
```

Wizard sẽ hỏi **3 câu** rồi tự động cài đặt:

```
Step 1/3 — Target Project Path
  > Nhập đường dẫn tới project của bạn (VD: C:\projects\techeyes\api)
  > Hoặc chọn "current directory"

Step 2/3 — AI IDE
  > 1. Antigravity / Gemini CLI   ->  tạo GEMINI.md
  > 2. OpenAI Codex               ->  tạo AGENTS.md

Step 3/3 — Repository Setup
  > 1. Single repo (tiêu chuẩn)
  > 2. Multi-repo (api/ và fe/ là 2 repo riêng — tạo symlink ở Root)
```

Sau khi xác nhận, wizard sẽ tự động:

1. **Scaffold** thư mục `.agents` tại project path (chọn lọc theo IDE)
2. **Cài đặt** môi trường ảo `.venv` + `code-review-graph`
3. **Tạo file entry point** (`GEMINI.md` hoặc `AGENTS.md`) tại project root
4. **Build** AST Code Graph + Vector DB
5. _(Nếu Multi-repo)_ Tạo symlink tại workspace root trỏ vào `api/.agents`

---

### 🔄 Cách cập nhật / nâng cấp (Upgrade Guide)

Khi dự án đã có sẵn thư mục `.agents` và muốn **nâng cấp bộ AG Kit lên phiên bản mới nhất** (cập nhật rules, skills, workflows, scripts, nâng cấp `code-review-graph` package) mà **giữ nguyên toàn bộ dữ liệu dự án** (`memory/`, `handoffs/`, `docs/`, `GEMINI.md`/`AGENTS.md`):

```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\update.ps1
```

```bash
# Linux / macOS / Git Bash
bash .agents/scripts/update.sh
```

**Quy trình update sẽ tự động:**

- **Cập nhật (overwrite):** `rules/`, `skills/`, `workflows/`, `agent/`, `scripts/`, `templates/`, `ide/<IDE>/`
- **Bảo tồn (preserved):** `memory/`, `handoffs/`, `coordination/`, `indexes/`, `docs/`
- **Ghi bổ sung (append-only):** `GEMINI.md` / `AGENTS.md` (chỉ nạp các phần missing, bảo toàn các tùy biến riêng của user)
- **Nâng cấp:** `code-review-graph` pip package (`pip install --upgrade`)
- **Rebuild:** AST Code Graph & Semantic Vector DB

### 🗂️ Cấu trúc `.agents` được tạo ra

Thư mục `.agents` được scaffold **có chọn lọc theo IDE** (không copy thừa):

```
.agents/
├── rules/         ← Rules luôn được bao gồm
├── skills/        ← Skills luôn được bao gồm
├── workflows/     ← Workflows luôn được bao gồm
├── agent/         ← Agent personas
├── scripts/       ← Build & utility scripts
├── templates/     ← Handoff, coordination templates
├── ide/
│   └── <ide>/    ← Chỉ adapter của IDE đã chọn
├── mcp_config.json  ← Chỉ tạo nếu chọn Antigravity
├── memory/        ← Tạo rỗng (runtime)
├── handoffs/      ← Tạo rỗng (runtime)
└── indexes/       ← Tạo rỗng, build bởi init
```

---

### 🔹 Multi-Repo Setup (api/ + fe/ riêng)

Khi dự án có **2 repo riêng** (Backend `api/` và Frontend `fe/`) mở chung trong 1 IDE workspace:

```
workspace-root/
├── api/          ← .agents được cài tại đây (source)
│   └── .agents/
└── fe/           ← symlink .agents trỏ vào api/.agents
    └── .agents   <- (symlink tự động tạo bởi wizard)
```

Chọn **"Yes - Multi-repo"** ở Step 3 của wizard. Nếu muốn chạy thủ công:

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .agents\scripts\init-harness.ps1 -SymlinkRoot -RootPath "C:\projects\workspace-root"

# Linux / macOS
bash .agents/scripts/init-harness.sh --symlink-root --root-path "/projects/workspace-root"
```

---

### 🎛️ CLI Options của `init-harness` (Advanced)

| PowerShell                | Bash                       | Công dụng                               |
| ------------------------- | -------------------------- | --------------------------------------- |
| `-IDE antigravity\|codex` | `--ide antigravity\|codex` | Chọn IDE (default: `antigravity`)       |
| `-InstallPath "<Path>"`   | `--install-path "<Path>"`  | Project root để scaffold entry point    |
| `-SymlinkRoot`            | `--symlink-root`           | Tạo symlink tại workspace root          |
| `-RootPath "<Path>"`      | `--root-path "<Path>"`     | Chỉ định workspace root path            |
| `-SkipGraphBuild`         | `--skip-graph-build`       | Bỏ qua bước build AST Graph (nhanh hơn) |

---

## 🚀 2. Quy trình Làm việc Chuẩn (Standard Lifecycle)

Mọi công việc lập trình nên tuân theo luồng khép kín 4 bước sau:

```plaintext
[Lập Kế hoạch]               [Thực thi & Kiểm thử]          [Cập nhật Đồ thị]           [Bàn giao & Lưu Tri thức]
   /plan                        /execute-plan                   /update-graph                  /handoff
   /break-task       ───►       /verify              ───►       (Tự động build      ───►       /daily-summary
   /add-task                    /test                           CSDL AST Graph)                /remember
```

1. **Bước 1: Lên Kế hoạch (`/plan` / `/break-task` / `/add-task`):**
   Agent nạp rules dự án, tra cứu Vector DB (`inspect_vector_db.py`) lấy bối cảnh quá khứ và dùng `code-review-graph` quét bán kính tác động (Blast Radius), sau đó xuất file Kế hoạch (`{task-slug}.md` hoặc tệp Task Handoff).
2. **Bước 2: Thực thi & Kiểm thử (`/execute-plan` / `/verify`):**
   Agent thực thi tuần tự từng bước trong plan, chạy `checklist.py` chứng minh code đạt Quality Gates thực tế.
3. **Bước 3: Cập nhật Đồ thị Mã nguồn & Vector DB (`/update-graph`):**
   Tự động rebuild CSDL đồ thị AST (`.code-review-graph/graph.db`) và SQLite Vector Store (`vector-store.sqlite`) bằng `build-index.ps1`.
4. **Bước 4: Bàn giao & Lưu Tri thức (`/handoff` / `/daily-summary` / `/remember`):**
   Lưu vết bàn giao công việc và tự động đồng bộ nhật ký vào SQLite Vector DB.

---

## 📚 3. Bảng Công dụng 25 Workflows (Slash Commands)

Gõ `/tên-lệnh` trong chat để kích hoạt quy trình tương ứng:

### 🎯 Nhóm 1: Quản lý Task & Lập Kế hoạch

| Slash Command   | Công dụng chính                                                                                  | Khi nào nên dùng?                                              |
| --------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `/constitution` | Đọc source và tạo lại `project-context.md` cùng `constitution.md` ở project root.                | Khi cần source-of-truth kỹ thuật và luật bắt buộc cho project. |
| `/plan`         | Lập kế hoạch theo quy trình 4 bước (Nạp Rule → Quét AST Graph → Hỏi Socratic → Xuất Plan).       | Khi bắt đầu tính năng mới hoặc refactor phức tạp.              |
| `/break-task`   | Phân rã 1 User Story/Yêu cầu thành các sub-task kỹ thuật (FE, BE, DB, Test), tạo Master Tracker. | Khi nhận User Story mới cần chia nhỏ cho team.                 |
| `/add-task`     | Thêm 1 task riêng lẻ (Standalone) hoặc bổ sung 1 sub-task vào User Story có sẵn.                 | Khi phát sinh công việc lẻ (bugfix, refactor, infra).          |
| `/brainstorm`   | Thảo luận Socratic, phỏng vấn câu hỏi để làm rõ yêu cầu còn mơ hồ.                               | Khi yêu cầu của người dùng chưa rõ ràng.                       |
| `/grill-me`     | Phỏng vấn chuyên sâu từng nhánh quyết định thiết kế cho đến khi chốt phương án.                  | Khi cần chốt kiến trúc/thiết kế trước khi làm.                 |

### ⚡ Nhóm 2: Thực thi & Xây dựng Mã nguồn

| Slash Command   | Công dụng chính                                                                               | Khi nào nên dùng?                                |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `/execute-plan` | Thực thi tuần tự các bước trong Plan, kiểm thử từng bước và tự động sync Code Graph khi xong. | Khi đã có file plan và muốn AI bắt tay vào code. |
| `/create`       | Khởi tạo ứng dụng mới từ đầu hoặc tạo bộ khung (scaffold) tính năng lớn.                      | Khi tạo project mới hoặc module lớn.             |
| `/enhance`      | Nâng cấp, bổ sung hoặc cải tiến tính năng sẵn có trong ứng dụng.                              | Khi sửa đổi/thêm options cho tính năng cũ.       |
| `/debug`        | Chẩn đoán lỗi hệ thống theo quy trình Root Cause Analysis (phân tích nguyên nhân gốc).        | Khi ứng dụng gặp bug, crash hoặc lỗi test.       |

### 🧪 Nhóm 3: Kiểm thử, Review & Chất lượng Code

| Slash Command   | Công dụng chính                                                                          | Khi nào nên dùng?                                    |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/verify`       | Chứng minh code hoạt động thực tế bằng việc thực thi test/build (không chỉ xem file).    | Sau khi sửa code, trước khi hoàn thành công việc.    |
| `/test`         | Tự động sinh test case mới và chạy bộ test suite của dự án.                              | Khi cần tăng độ phủ test hoặc viết pytest/unit test. |
| `/review-code`  | Review chuyên sâu chất lượng mã nguồn: Logic, OWASP Security, Performance, Type Safety.  | Trước khi tạo Pull Request hoặc merge code.          |
| `/review-ui-ux` | Review toàn diện giao diện Web/Mobile: Usability, WCAG Accessibility, Responsive layout. | Sau khi dựng xong giao diện UI.                      |

### 🔍 Nhóm 4: Đồ thị Mã nguồn AST & Tri thức Dự án

| Slash Command    | Công dụng chính                                                                          | Khi nào nên dùng?                                   |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/update-graph`  | Cập nhật CSDL AST Graph (`.code-review-graph/graph.db`) và SQLite Vector DB.             | Chủ động đồng bộ cây mã nguồn sau khi sửa code.     |
| `/query-graph`   | Tra cứu bán kính tác động (Blast Radius) và mối quan hệ gọi hàm/lớp giữa các file.       | Khi cần điều tra ảnh hưởng trước khi refactor.      |
| `/query-vector`  | Tìm kiếm ngữ nghĩa (Semantic Search) lịch sử làm việc và tri thức từ SQLite Vector DB.   | Khi muốn tìm lại các công việc/quyết định quá khứ.  |
| `/remember`      | Lưu trữ quy chuẩn, cấu hình, sở thích người dùng vào bộ nhớ lâu dài (`MEMORY.md`).       | Khi muốn Agent nhớ một quy tắc cho các session sau. |
| `/daily-summary` | Tổng hợp nhật ký công việc cuối ngày từ Git log & Session transcript, nạp vào Vector DB. | Cuối ngày làm việc trước khi đóng máy.              |

### 🛠️ Nhóm 5: Điều phối, Triển khai & Môi trường

| Slash Command       | Công dụng chính                                                                          | Khi nào nên dùng?                                   |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/orchestrate`      | Điều phối nhiều Agent chuyên gia làm việc cùng nhau cho tác vụ phức tạp.                 | Khi tác vụ chạm nhiều mảng (FE + BE + Security).    |
| `/coordinate`       | Điều phối nâng cao chạy song song nhiều worker agents.                                   | Khi có nhiều sub-task độc lập có thể làm song song. |
| `/handoff`          | Tạo/cập nhật file bàn giao công việc (`.agents/handoffs/`) kèm SHA commit & bối cảnh.    | Khi tạm dừng công việc hoặc chuyển giao agent khác. |
| `/worktree-isolate` | Tạo Git Worktree độc lập để làm việc không ảnh hưởng thư mục chính.                      | Khi muốn thử nghiệm code trên branch cách ly.       |
| `/preview`          | Quản lý Dev Server cục bộ (Start, Stop, Check status preview server).                    | Khi cần xem trước sản phẩm trên trình duyệt.        |
| `/deploy`           | Thực hiện quy trình phát hành sản phẩm (Pre-flight checks, build release).               | Khi chuẩn bị đưa ứng dụng lên Production/Staging.   |
| `/status`           | Hiển thị bảng tổng quan trạng thái dự án, agent đang chạy và kiểm tra sức khỏe hệ thống. | Khi muốn xem tiến độ công việc tổng thể.            |

---

## 🛠️ 4. Lệnh Kiểm tra Tự động (Cheat Sheet)

```bash
# Kiểm tra nhanh chất lượng code dự án (Security -> Lint -> Tests -> UX)
python .agents/scripts/checklist.py .

# Kiểm tra toàn bộ dự án trước khi release
python .agents/scripts/verify_all.py . --url http://localhost:3000

# Tự kiểm tra tính toàn vẹn của bộ công cụ AG Kit
python .agents/scripts/validate_kit.py
```
