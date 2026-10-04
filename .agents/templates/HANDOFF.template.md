---
schema_version: 1
task_id: <TASK-ID>
parent_us: <US-ID>
status: in-progress
owner: <dev-or-agent-name>
next_owner: unassigned
branch: feature/<TASK-ID>
base_sha: <BASE-SHA>
head_sha: <HEAD-SHA>
last_pipeline_result: passed
updated_at: 2026-08-03T00:00:00Z
classification: internal
context_manifest: .agents/handoffs/<US-ID>_<us-name-slug>/<TASK-ID>.context.yaml
---

# <TASK-ID> — <Tên Task / Mô tả Ngắn gọn>

> **Parent User Story:** [<US-ID>](file://./<US-ID>.md)

## Acceptance Criteria

- [x] <Tiêu chí đã xong 1>
- [ ] <Tiêu chí chưa xong 2>

## Tiến độ đã hoàn thành

- <Mô tả tóm tắt các việc đã triển khai>
- Unit test đã pass trên commit `<HEAD-SHA>`.

## Các file/symbol đã thay đổi

| File Path / Symbol               | Mục đích thay đổi   | Owner cần review |
| -------------------------------- | ------------------- | ---------------- |
| `src/path/to/file.ts#symbolName` | <Mục đích thay đổi> | `@tech-lead`     |

## Bằng chứng Kiểm thử (Verification Evidence)

| Lệnh kiểm thử | Commit SHA   | Kết quả | Thời gian         |
| ------------- | ------------ | ------- | ----------------- |
| `npm test`    | `<HEAD-SHA>` | PASS    | 2026-08-03 00:00Z |

## Bước tiếp theo dành cho người tiếp quản

1. Checkout đúng branch `feature/<TASK-ID>` tại commit `<HEAD-SHA>`.
2. <Bước tiếp theo 2>
3. Chạy lệnh `<test-command>` để xác nhận.
