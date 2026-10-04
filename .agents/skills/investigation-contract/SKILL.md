---
name: investigation-contract
description: Chuẩn hóa output điều tra và lập kế hoạch của agent với hiện trạng có bằng chứng, ảnh hưởng, edge-case, quyết định và câu hỏi blocking.
when_to_use: "Bắt buộc khi agent khám phá codebase, lập plan, debug, phân tích impact, review, điều phối worker hoặc chuẩn bị thay đổi có rủi ro. Không cần cho câu hỏi kiến thức thuần túy không đụng đến workspace."
allowed-tools: Read, Grep, Glob, Bash
version: 1.0.0
---

# Investigation Output Contract

Mục tiêu của skill này là để mọi agent trả về cùng một bức tranh có thể kiểm chứng trước khi người dùng hoặc agent khác quyết định. Giữ các phần domain-specific nếu cần, nhưng luôn có đủ các phần bắt buộc bên dưới.

## Quy trình bắt buộc

1. Xác định phạm vi: request, workspace/commit/config đang xét và phần ngoài phạm vi.
2. Thu thập bằng chứng thực tế từ source, graph, test, log hoặc command. Không biến suy đoán thành fact.
3. Ghi nhận hiện trạng trước khi đề xuất thay đổi.
4. Tracing ảnh hưởng: trực tiếp, gián tiếp, execution flow, người dùng, dữ liệu, bảo mật, hiệu năng và compatibility.
5. Liệt kê edge-case theo domain; đánh dấu đã kiểm tra, chưa kiểm tra hoặc không áp dụng.
6. Tách quyết định đã xác nhận, suy luận có bằng chứng, giả định và câu hỏi chưa quyết định được.
7. Nếu có câu hỏi **blocking**, dừng trước mọi write/implementation/subagent implementation và hỏi người dùng. Nếu chỉ có câu hỏi non-blocking, được tiếp tục với assumption rõ ràng.

## Trạng thái báo cáo

- `READY`: đủ thông tin để thực hiện bước tiếp theo.
- `PARTIAL`: có thể tiếp tục nhưng còn unknown/non-blocking risk.
- `BLOCKED`: có ít nhất một quyết định blocking chưa được user xác nhận.

Mỗi claim quan trọng phải có `evidence` và `confidence` (`high`, `medium`, `low`). Nếu công cụ/graph không khả dụng, ghi rõ giới hạn và hạ confidence; không tự suy diễn kết quả.

## Output contract bắt buộc

```markdown
## Investigation Contract

- **Status:** READY | PARTIAL | BLOCKED
- **Confidence:** high | medium | low
- **Request:** [Yêu cầu đang điều tra]
- **Scope:** [Trong phạm vi] / [Ngoài phạm vi]

### 1. Hiện trạng hiện tại

| ID  | Finding | Evidence (file:line, graph, test, command) | Type                       | Confidence      |
| --- | ------- | ------------------------------------------ | -------------------------- | --------------- |
| S-1 | ...     | ...                                        | fact / inference / unknown | high/medium/low |

### 2. Ảnh hưởng

- **Direct:** [file, symbol, flow hoặc behavior bị tác động trực tiếp]
- **Indirect:** [caller/callee, downstream consumer, data/config]
- **User/system impact:** [user journey, API contract, security, performance, compatibility]
- **Evidence gaps:** [phần chưa trace được]

### 3. Edge-cases và rủi ro

| ID  | Scenario | Expected/Concern | Evidence/Test | Status                     |
| --- | -------- | ---------------- | ------------- | -------------------------- |
| E-1 | ...      | ...              | ...           | covered / unverified / n/a |

### 4. Quyết định và giả định

- **Confirmed by user:** ...
- **Supported by evidence:** ...
- **Assumptions:** ...
- **Unknowns:** ...

### 5. Câu hỏi cần user quyết định

| ID  | Priority | Question | Why it matters | Options/trade-off | Default | Blocking |
| --- | -------- | -------- | -------------- | ----------------- | ------- | -------- |
| Q-1 | P0/P1/P2 | ...      | ...            | ...               | ...     | yes/no   |

### 6. Bước tiếp theo và verification

- **Next action:** [read / ask / plan / implement / verify]
- **Write scope:** [file/path được phép sửa, hoặc `none` nếu BLOCKED]
- **Verification:** [command, test, graph query hoặc acceptance check]
```

## Quy tắc cho câu hỏi

- Chỉ hỏi câu hỏi mà agent không thể quyết định an toàn từ evidence, project convention hoặc câu trả lời đã có.
- P0 là blocking: không tạo code, không dispatch implementation worker, không báo `READY`.
- P1/P2 không blocking: tiếp tục với default chỉ khi ghi rõ trade-off và assumption.
- Không dùng câu hỏi chung chung như “có muốn làm tốt hơn không?”; câu hỏi phải chỉ ra quyết định, tác động và lựa chọn.

## Quy tắc cho worker và coordinator

- Worker trả về contract này, không chỉ trả raw notes.
- Worker phải nêu rõ file/symbol đã xem, phần chưa xem và confidence.
- Coordinator không copy nguyên văn nhiều báo cáo; phải hợp nhất findings, deduplicate edge-case và nâng `BLOCKED` nếu bất kỳ worker nào có P0.
- Coordinator chỉ dispatch implementation sau khi synthesis có `Status: READY` hoặc `PARTIAL` mà không còn P0.
- Output cuối cùng luôn trả một contract hợp nhất và danh sách agent đóng góp.
