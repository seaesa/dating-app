---
description: Update AST Code Graph (.code-review-graph/graph.db) và SQLite Vector Store (.agents/indexes/vector-store.sqlite). Tự động chọn incremental update hoặc full rebuild, sau đó tính lại vector embeddings cho code nodes.
---

# /update-graph — Update AST Code Graph & Vector Index

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Smart Update Strategy**:
   - Ưu tiên incremental sync: `code-review-graph update --brief` (re-parse chỉ các file thay đổi).
   - Nếu không có `.code-review-graph/graph.db` hoặc `update` thất bại → fallback full rebuild: `code-review-graph build` (hoặc `.agents/scripts/build-index.ps1`).
2. **Bắt buộc chạy `embed` sau mỗi lần build/update**:
   - Sau khi build/update xong → luôn chạy `code-review-graph embed --provider local` để cập nhật semantic vector embeddings cho code nodes.
   - Đây là bước bắt buộc — **KHÔNG BỎ QUA**.
3. **Health Check & Verification**:
   - Luôn chạy `code-review-graph status` sau khi sync để xác minh database integrity và embeddings count.
4. **Vietnamese Output**:
   - In báo cáo tiếng Việt rõ ràng với thống kê node/edge/embedding chính xác.

---

## Workflow

```
WORKFLOW:
1. EXECUTE Incremental Sync (ưu tiên tốc độ):
   rtk .agents/.venv/Scripts/code-review-graph.exe update --brief
   → Chỉ re-parse files đã thay đổi và các dependents.

2. IF FAILED / GRAPH MISSING / FULL SYNC REQUESTED:
   EXECUTE Full Rebuild:
   rtk powershell -ExecutionPolicy Bypass -File .agents/scripts/build-index.ps1
   (build-index.ps1 đã tích hợp sẵn bước embed)

   Hoặc thủ công:
   rtk .agents/.venv/Scripts/code-review-graph.exe build
   rtk .agents/.venv/Scripts/code-review-graph.exe embed --provider local

3. VERIFY Database Health & Embeddings:
   rtk .agents/.venv/Scripts/code-review-graph.exe status
   rtk .agents/.venv/Scripts/python.exe .agents/scripts/inspect_vector_db.py

4. REPORT Summary (Vietnamese):
   - AST Nodes, AST Edges, Semantic Embeddings Count
   - Knowledge Vector Chunks (vector-store.sqlite)
   - Database Paths
```

---

## Khi nào dùng lệnh nào?

| Tình huống                      | Lệnh                                        |
| ------------------------------- | ------------------------------------------- |
| Sau khi sửa 1–5 file            | `update --brief` → `embed --provider local` |
| Rebuild hoàn toàn / Đầu session | `build-index.ps1` (tích hợp sẵn embed)      |
| Kiểm tra sức khỏe DB            | `code-review-graph status`                  |
| Tìm kiếm semantic trong code    | `code-review-graph search "<query>"`        |

---

## Expected Output

```markdown
## 🌐 AST Code Graph & Vector Store Updated

### Summary

- **Status:** PASS
- **Engine:** `code-review-graph` (AST) + SQLite Vector Store (Knowledge)
- **AST Nodes:** `<N>`
- **AST Edges:** `<M>`
- **Semantic Embeddings (code nodes):** `<E>` (all-MiniLM-L6-v2, 384-dim)
- **Knowledge Vector Chunks:** `<K>` (256-dim, .agents/indexes/vector-store.sqlite)
- **Graph DB:** `.code-review-graph/graph.db`
- **Knowledge DB:** `.agents/indexes/vector-store.sqlite`
```

---

## Usage Examples

```
/update-graph
/update-graph full rebuild
```
