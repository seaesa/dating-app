---
name: daily-work-summarizer
description: Quy trình chắt lọc báo cáo công việc cuối ngày từ Git Log, Antigravity Session Transcripts và Handoff Files, lập chỉ mục Vector DB cục bộ cá nhân (Zero Git Conflict).
when_to_use: "When running daily summaries, creating end-of-day reports, or executing /daily-summary."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Daily Work Summarizer & Vector Indexer Skill

> **Mục tiêu:** Tự động hóa quá trình tổng hợp công việc trong ngày cho cá nhân Developer từ 3 nguồn dữ liệu (Git Log, Antigravity Session Log, Handoff Files), lưu tại phạm vi Cục bộ Cá nhân (Personal Local Scope) để không gây xung đột Git (Zero Git Conflict) khi làm việc nhóm.

---

## 1. Phạm vi Cục bộ Cá nhân (Personal Local Scope — Zero Git Conflict)

- **Cấu hình Git Ignore:**
  - Thư mục `.agents/indexes/*` (lưu `vector-store.sqlite`, `code-graph.json`, `daily-work-vector.json`) được bỏ qua trong `.gitignore`.
  - Thư mục `.agents/memory/daily/*` (lưu các tệp nhật ký ngày cá nhân `YYYY-MM-DD.md`) được bỏ qua trong `.gitignore`.
- **Lợi ích Team:** Mỗi Developer thoải mái tổng hợp nhật ký công việc và lập chỉ mục Vector DB trên máy cá nhân mà **hoàn toàn không làm ảnh hưởng hay gây ra Git Merge Conflict** với các thành viên khác trong team.

---

## 2. Quy tắc Chắt lọc 3 Nguồn (Triple-Source Distillation Rules)

Khi tổng hợp công việc trong ngày, Agent thu thập và kết hợp thông tin từ 3 nguồn:

1. **Nguồn 1: Git Log (`git log --since="00:00:00"`)**
   - Lấy danh sách Commit SHAs, commit messages và danh sách file đã thay đổi thực tế.
2. **Nguồn 2: Antigravity Session Logs (`transcript.jsonl`)**
   - Đọc các dòng `"type": "USER_INPUT"` để trích xuất mục tiêu nghiệp vụ, nguyên nhân sửa bug và mong muốn của người dùng.
   - Đọc các quyết định kỹ thuật chính trong `"type": "PLANNER_RESPONSE"`.
3. **Nguồn 3: Task Handoff Files (`.agents/handoffs/`)**
   - Lấy danh sách các task đã đổi trạng thái sang `[x] Completed` và bằng chứng test PASS.

---

## 3. Quy tắc "Bảo mật & Loại bỏ Nhiễu" (Sanitization & No Noise)

- **ĐƯỢC LƯU VÀO DIGEST & VECTOR DB CỤC BỘ:**
  - Mục tiêu nghiệp vụ (User Intent).
  - Lý do tại sao phải sửa bug/thêm tính năng.
  - Các file/hàm chính đã thay đổi kèm Commit SHA.
  - Kết quả kiểm thử thực tế và các quyết định kiến trúc rút ra.
- **TUYỆT ĐỐI CẤM LƯU:**
  - Raw Chat Log, Terminal Output nguyên khối.
  - Chuỗi suy luận nội bộ (Chain-of-Thought).
  - Secret, Passwords, API Keys, Session Tokens, PII.

---

## 4. Provenance Metadata Schema cho Vector Chunk Cục bộ

Mỗi đoạn tóm tắt công việc ngày khi đưa vào SQLite Vector Store (`.agents/indexes/vector-store.sqlite`) bắt buộc chứa metadata:

```yaml
schema_version: 1
entry_type: daily_work_digest
scope: personal_local
date: 2026-08-03
git_shas: ["e5f6g7h8", "a1b2c3d4"]
session_ids: ["8b3c41a5-024e-4e71-941c-32f8903f9587"]
tasks_completed: ["US-01-TASK-1", "US-02-TASK-3"]
impacted_files:
  - src/services/payment-service.ts
  - .agents/coordination.md
indexed_at: 2026-08-03T18:00:00Z
expires_at: 2026-09-03T18:00:00Z
```
