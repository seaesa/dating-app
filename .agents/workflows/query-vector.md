---
description: Tìm kiếm ngữ nghĩa (Semantic Search) trong 2 CSDL: code-review-graph (code nodes với embedding) và SQLite Vector Store (docs/rules/memory).
---

# Workflow: Truy vấn Ngữ nghĩa (/query-vector)

Sử dụng workflow này để tìm kiếm thông tin theo ngữ nghĩa — không cần biết tên symbol chính xác, chỉ cần mô tả ý định hoặc khái niệm.

---

## Bảng Quyết định — Tìm gì ở đâu?

| Bạn muốn tìm                                | CSDL                                 | Lệnh                           |
| ------------------------------------------- | ------------------------------------ | ------------------------------ |
| Functions/classes liên quan đến tính năng X | **Code Graph** (AST + embedding)     | `code-review-graph search "X"` |
| Tài liệu, rules, skills về chủ đề Y         | **Knowledge DB** (docs/rules/memory) | `inspect_vector_db.py "Y"`     |
| Nhật ký công việc, handoff về Z             | **Knowledge DB**                     | `inspect_vector_db.py "Z"`     |
| Quyết định kiến trúc (ADR) về W             | **Knowledge DB**                     | `inspect_vector_db.py "W"`     |

---

## 📋 CÁC BƯỚC THỰC HIỆN:

### Luồng A: Semantic Search trong Code (code-review-graph)

> Yêu cầu: `code-review-graph embed --provider local` đã chạy ít nhất 1 lần.

```bash
# Tìm code liên quan đến một khái niệm
rtk .agents/.venv/Scripts/code-review-graph.exe search "leave approval workflow"

# Tìm theo loại node cụ thể
rtk .agents/.venv/Scripts/code-review-graph.exe search "authentication" --kind Function
rtk .agents/.venv/Scripts/code-review-graph.exe search "database query" --kind Class
rtk .agents/.venv/Scripts/code-review-graph.exe search "error handler" --limit 5
```

Kết quả trả về: danh sách Functions/Classes/Files theo điểm similarity, kèm file path và signature.

### Luồng B: Semantic Search trong Knowledge DB (vector-store.sqlite)

> Chứa: Rules, Skills, Workflows, Memory, Handoffs đã được index.

```bash
# Tìm theo từ khóa / khái niệm
rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "authentication design decision"
rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "cách xử lý lỗi API"
rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py "leave request bug fix"
```

Kết quả: top-K chunks với Cosine Similarity score + đường dẫn file source.

### Khi nào nên dùng cả 2?

Khi điều tra một tính năng phức tạp, chạy **cả 2 luồng song song**:

1. `code-review-graph search "feature X"` → Tìm code implementation
2. `inspect_vector_db.py "feature X"` → Tìm docs/decisions/history

---

## Kiểm tra Trạng thái Sẵn sàng

```bash
# Xem embeddings count của code graph
rtk .agents/.venv/Scripts/code-review-graph.exe status

# Xem số chunks trong Knowledge DB
rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py --stats
```

Nếu `Embeddings: 0` → chạy `/update-graph` trước.

---

## 3. Xuất Báo cáo Tra cứu

Hiển thị kết quả tổng hợp:

- **Code Results** (từ code-review-graph): danh sách symbols theo relevance
- **Knowledge Results** (từ vector-store.sqlite): đoạn trích dẫn khớp nhất + file path
- Tổng hợp câu trả lời ngắn gọn, trực tiếp từ cả 2 nguồn

---

## Usage Examples

```
/query-vector leave approval logic
/query-vector authentication error handling
/query-vector cách viết unit test cho service
```
