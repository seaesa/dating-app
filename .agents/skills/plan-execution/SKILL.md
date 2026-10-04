---
name: plan-execution
description: Skill for executing implementation plans step-by-step, running per-step verifications, handling rollbacks on failure, and triggering mandatory post-sync code-review-graph builds.
when_to_use: "When executing an implementation plan (e.g. via /execute-plan), running step-by-step changes, verifying plan progress, and auto-syncing the AST code graph."
allowed-tools: Read, Grep, Glob, Write, Edit, Run
---

# Plan Execution Skill — Quy trình Thực thi Plan & Auto-Sync AST Graph

## Overview

Skill này định nghĩa toàn bộ quy trình và nguyên tắc cho AI Agent khi thực thi một file Kế hoạch (Implementation Plan) từ `/plan` hoặc `implementation_plan.md`.

## Detailed Change Reporting Contract

Execute-plan không được chỉ báo `N/N steps completed`. Agent chỉ xuất **một detailed execution report ở cuối**, có baseline, toàn bộ thay đổi, impact và evidence. Trong lúc chạy, agent có thể ghi nhận step ledger nội bộ để tổng hợp; không emit report theo từng step ra chat. Báo cáo dùng contract này cùng `@[skills/investigation-contract]`; không đưa raw log dài, chỉ tóm tắt kết quả và giữ command/error quan trọng.

### Baseline trước khi execute

Ghi nhận:

- Plan path, plan status, task/acceptance criteria đang thực thi.
- Current state và evidence trước thay đổi.
- Planned write scope, impacted files/symbols/flows và assumptions.
- Open questions; nếu có P0 thì `BLOCKED`, không write.
- Git/worktree hoặc file snapshot nếu công cụ hỗ trợ; nếu không hỗ trợ phải ghi rõ `unavailable`, không tự suy diễn.

### Step ledger nội bộ (không report ra chat)

```markdown
### Step <N>: <title> — PASS | FAILED | BLOCKED

- **Goal/AC:** [step đang chứng minh điều gì]
- **Before:** [state, files/symbols và evidence trước step]
- **Changes:**
  - `<path>` — added | modified | deleted | renamed
  - **Symbols/sections:** [tên cụ thể hoặc `N/A`]
  - **Before → After:** [behavior/config/contract thay đổi thế nào]
  - **Why:** [lý do kỹ thuật/business]
- **Actual impact:** [direct/indirect impact so với plan; unexpected impact nếu có]
- **Edge-cases:** [scenario — test/evidence — covered/unverified/deferred]
- **Verification:** `[exact command]` → PASS/FAIL + kết quả định lượng nếu có
- **Scope check:** [in-scope/out-of-scope; file ngoài scope nếu có]
- **Rollback:** [cách hoàn tác hoặc `not needed`]
- **Open questions/assumptions:** [P1/P2 và assumption; P0 thì BLOCKED]
- **Tracker:** [task status/checklist đã cập nhật thế nào]
```

Sau mỗi step vẫn phải ghi nhận path, symbol/section, before → after, impact và verification vào ledger nội bộ để final report không bị thiếu chi tiết. Không cần emit nội dung này ra chat. Nếu step fail, giữ trạng thái FAILED, ghi error evidence, dừng step kế tiếp và không báo completed.

### Báo cáo cuối execute-plan

Final report phải có:

1. Executive summary: mục tiêu, kết quả và status (`READY`/`PARTIAL`/`BLOCKED`).
2. Step ledger: mọi step, files changed, actual outcome và verification.
3. Detailed file change inventory: added/modified/deleted/renamed, symbols/sections, before → after, rationale.
4. Planned vs actual impact: direct/indirect flows, downstream consumers, user/data/security/performance/compatibility.
5. Edge-case matrix: covered, unverified, deferred và lý do.
6. Verification evidence: exact commands, pass/fail, test count, build/lint/runtime/graph sync output.
7. Remaining assumptions/questions: P1/P2; xác nhận không còn P0 trước implementation completion.
8. Rollback/recovery và next steps.

## Investigation Contract Gate

Trước write đầu tiên, đọc Investigation Contract trong plan và xác nhận current state, impact, edge-cases, assumptions và verification vẫn còn hiệu lực. Nếu phát sinh P0/blocking question, dừng execution, chuyển `Status: BLOCKED` và hỏi user; không tự sửa plan để né quyết định.

---

## 🔴 CRITICAL RULES

1. **Plan Resolution Strategy**:
   - Nếu có tham số `$ARGUMENTS` (ví dụ `/execute-plan auth-feature.md`), ưu tiên đọc file plan được chỉ định.
   - Nếu không có tham số, tự động tìm file plan mặc định (`implementation_plan.md` trong `brain/artifacts` hoặc `{task-slug}.md` gần nhất).
2. **Step-by-step Execution (Thực thi Tuần tự)**:
   - Đọc danh sách công việc (Tasks/Checklist) trong Plan.
   - Thực thi từng bước một theo đúng thứ tự phụ thuộc.
   - Không bỏ qua bước hoặc làm gộp nhiều bước phức tạp khi chưa được kiểm thử.
3. **Per-Step Verification (Kiểm thử Từng bước)**:
   - Sau khi hoàn thành mỗi bước (hoặc nhóm chỉnh sửa nhỏ), phát ra lệnh kiểm thử (`verify-changes` hoặc `npm test` / `pytest` / linter).
   - Đánh dấu `[x]` vào checklist của file plan hoặc báo cáo tiến độ.
4. **Mandatory Post-Implementation Auto-Sync**:
   - **BẮT BUỘC:** Sau khi hoàn thành BẤT KỲ bước sửa code nào (và đặc biệt sau khi xong toàn bộ Plan), Agent **BẮT BUỘC phát ra lệnh `run_command`** chạy workflow `/update-graph` hoặc lệnh:
     ```powershell
     rtk .agents/.venv/Scripts/code-review-graph.exe build
     ```
   - Đảm bảo CSDL AST Code Graph (`.code-review-graph/graph.db`) và Vector Store luôn phản ánh chính xác cấu trúc code mới nhất.
5. **Detailed Change Report**:
   - Ghi baseline trước execute.
   - Ghi step ledger nội bộ sau từng step, không gửi report từng bước cho user.
   - Chỉ gửi một final report theo planned-vs-actual impact và evidence.
   - Không báo `Completed` nếu có step FAILED/BLOCKED hoặc verification chưa chạy.

---

## Lifecycle Phases

```text
[READ PLAN FILE]
      ↓
[LOOP: FOR EACH STEP IN PLAN]
      ├── 1. Apply Surgical Code Changes (Clean Code & Surgical Edges)
      ├── 2. Run Step Verification (Tests / Linters / Syntax)
      └── 3. Check off Step in Tracker
      ↓
[MANDATORY AUTO-SYNC AST GRAPH]
      ├── Run `rtk .agents/.venv/Scripts/code-review-graph.exe build`
      └── Run `rtk .agents/.venv/Scripts/code-review-graph.exe status`
      ↓
[FINAL SUMMARY REPORT TO USER]
```

Final summary phải nêu status contract, detailed file/symbol changes, before → after, impact thực tế so với dự kiến, edge-cases đã/chưa verify, câu hỏi còn mở, rollback và command evidence.

---

## Error & Failure Handling

- Nếu một bước bị lỗi (Build fail / Test fail):
  1. Dừng ngay việc chuyển bước tiếp theo.
  2. Phân tích log lỗi thực tế.
  3. Thực hiện sửa lỗi cho đến khi bước đó chuyển trạng thái PASS trước khi tiếp tục.
  4. Nếu không thể sửa lỗi sau nhiều lần thử, thông báo cho người dùng kèm trạng thái chính xác.
