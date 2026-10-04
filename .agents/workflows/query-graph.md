---
description: Tra cứu cây phụ thuộc AST, bán kính tác động (Blast Radius), và tìm kiếm semantic trong code graph qua code-review-graph CLI & MCP Server.
---

# Workflow: Tra cứu Code Review Graph (/query-graph)

Sử dụng workflow này để truy vấn sơ đồ phụ thuộc AST, đo lường bán kính tác động, hoặc tìm code liên quan theo ngữ nghĩa — khi chuẩn bị refactor, điều tra bug, hoặc hiểu kiến trúc.

---

## Bảng Quyết định — Chọn Công cụ Đúng

| Bạn muốn gì?                       | Công cụ                  | Lệnh                                 |
| ---------------------------------- | ------------------------ | ------------------------------------ |
| Xem callers/callees của hàm X      | **Structural Query**     | `code-review-graph query X`          |
| Blast radius khi sửa file Y        | **Impact Analysis**      | `code-review-graph impact --files Y` |
| Tìm code liên quan đến tính năng Z | **Semantic Code Search** | `code-review-graph search "Z"`       |
| Tìm dead code (hàm không ai gọi)   | **Dead Code Scan**       | `code-review-graph dead-code`        |
| Tổng quan kiến trúc codebase       | **Architecture View**    | `code-review-graph architecture`     |
| Tìm docs/rules/memory về chủ đề W  | **Knowledge Search**     | `inspect_vector_db.py "W"`           |

> ⚠️ `code-review-graph search` cần đã chạy `embed --provider local` trước. Nếu chưa, chạy `/update-graph` trước.

---

## 📋 CÁC BƯỚC THỰC HIỆN:

### 1. Kiểm tra Trạng thái CSDL Graph

Xác minh CSDL tồn tại và đã có embeddings:

```bash
rtk .agents/.venv/Scripts/code-review-graph.exe status
```

- Nếu chưa có CSDL → chạy `/update-graph` để khởi tạo.
- Nếu `Embeddings: 0` → chạy `code-review-graph embed --provider local`.

### 2a. Structural Query (Tìm quan hệ gọi hàm)

```bash
# Xem tất cả callers và callees của symbol
rtk .agents/.venv/Scripts/code-review-graph.exe query <symbol_name>

# Blast radius khi thay đổi file cụ thể
rtk .agents/.venv/Scripts/code-review-graph.exe impact --files <filepath>

# Kiến trúc tổng quan
rtk .agents/.venv/Scripts/code-review-graph.exe architecture
```

### 2b. Semantic Code Search (Tìm code theo ngữ nghĩa)

```bash
# Tìm functions/classes liên quan đến một khái niệm
rtk .agents/.venv/Scripts/code-review-graph.exe search "authentication logic"
rtk .agents/.venv/Scripts/code-review-graph.exe search "database connection" --kind Function
rtk .agents/.venv/Scripts/code-review-graph.exe search "error handling" --limit 10
```

### 2c. Dead Code & Quality Checks

```bash
# Tìm hàm không có callers
rtk .agents/.venv/Scripts/code-review-graph.exe dead-code
```

### 3. Xuất Báo cáo Tác động (Blast Radius Report)

Trình bày kết quả phân tích theo format chuẩn:

- **Current state:** graph scope, indexed revision, evidence and confidence
- **Mức độ rủi ro:** High / Medium / Low
- **Danh sách tệp bị ảnh hưởng trực tiếp**
- **Ảnh hưởng gián tiếp:** callers, callees, flows, consumers, tests, data/config
- **Các Symbol liên quan (semantic)**
- **Edge-cases/risk gaps:** untested paths, missing nodes, stale graph, dynamic imports
- **Câu hỏi chưa quyết định:** P0/P1/P2, trade-offs, default, blocking
- **Khuyến nghị khoanh vùng phạm vi ghi (`write_scope`)**

Nếu graph không đủ dữ liệu hoặc stale, trả `Status: PARTIAL`, ghi rõ giới hạn và không khẳng định impact chưa có evidence.

---

## Usage Examples

```
/query-graph
/query-graph impact src/services/auth.ts
/query-graph search "leave request approval"
/query-graph dead-code
/query-graph architecture
```
