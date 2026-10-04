---
name: break-task-skill
description: Use when receiving a User Story or business requirement and needing to break it down into implementation tasks, then review for completeness — covers full cycle from breakdown to coverage review, estimate validation, and final task list generation
when_to_use: "When receiving a User Story or business requirement needing breakdown into technical implementation tasks and coverage review."
allowed-tools: Read, Grep, Glob
---

# Break Task Skill — Phân tách & Review Task từ User Story

## Overview

Skill hướng dẫn AI thực hiện **toàn bộ chu trình** phân tách User Story thành task list triển khai cho team dev, bao gồm cả bước review coverage để đảm bảo không bỏ sót.

**Nguyên tắc cốt lõi:** Không chỉ sinh task rồi dừng lại. Luôn phải thực hiện đầy đủ chu trình:

```
Phân tích → Hỏi lại user nếu không rõ → Breakdown ban đầu → Review coverage → Bổ sung task còn thiếu → Xuất danh sách cuối cùng → Báo cáo review
```

Trước breakdown, áp dụng `@[skills/investigation-contract]`: ghi hiện trạng/evidence, impacted components, edge-cases, assumptions và câu hỏi. Câu hỏi P0/blocking phải được hỏi user trước khi tạo task files; câu hỏi P1/P2 được giữ lại trong report và gắn assumption/default.

## When to Use

- Nhận được User Story / business requirement cần chia thành task cho team dev
- Cần đảm bảo không bỏ sót task ở bất kỳ layer nào (FE, BE, DB, Test, DevOps...)
- Cần output dạng task list có thể copy thẳng sang Jira/Excel
- Cần estimate thời gian cho từng task
- Cần review bộ task đã có để kiểm tra coverage, estimate, mô tả

**Không dùng khi:**

- Task đã rõ ràng, chỉ cần code thẳng
- Chỉ cần fix bug nhỏ không cần breakdown

---

## Phase 1: Break Task — Phân tách User Story

### Input tối thiểu

```
- Title
- Description
- Main Flow
- Acceptance Criteria
```

AI tự suy ra phần còn lại:

```
User Story Input
    ↓
AI chạy code-review-graph (`& ".agents/.venv/Scripts/code-review-graph.exe" status`) để quét AST Graph & Blast Radius
    ↓
Detect impacted components & downstream symbol dependencies
    ↓
Suy ra validation / permission / logging / testing
    ↓
Breakdown tasks
```

### Prompt viewpoint cho AI

> You are a senior software architect and tech lead.
>
> Your task is to break down the following User Story into implementation tasks for a development team.
>
> Requirements:
>
> 1. Ensure ALL acceptance criteria are covered.
> 2. Ensure business logic and edge cases are covered.
> 3. Ensure technical tasks are included (testing, logging, monitoring, validation, permission, deployment).
> 4. Each task must map to at least one acceptance criteria when applicable.
>
> Break tasks into the following categories:
>
> - Business Analysis
> - Frontend
> - Backend
> - Database
> - Integration
> - Validation & Business Rules
> - Security & Permission
> - Error Handling
> - Logging & Analytics
> - Pytest
> - Integration Test
> - Deployment / Configuration
> - Documentation
>
> For each task include:
>
> - Task title
> - Short description
> - Related acceptance criteria
> - Dependency (if any)
> - Suggested role (FE, BE, QA, DevOps)
>
> Also provide:
>
> 1. Edge cases discovered
> 2. Missing information from the story
> 3. Coverage check (which AC is covered by which tasks)

### User Story Template chuẩn

```
Tiêu đề:

User Story:
Vai trò (là) <actor>
Mục tiêu (Tôi muốn) <action>
Giá trị/Lợi ích (để) <business value>

Business Context:
Business goal:
Problem we are solving:
Business rules:

Main Flow:
1. User performs action A
2. System validates data
3. System processes request
4. System returns result

Edge Cases / Exception Flow:
- Invalid input
- Permission denied
- External service failure
- Data conflict
- Timeout

Acceptance Criteria:
AC1:
AC2:
AC3:

Impacted Components:
Frontend:
Backend:
Database:
External services:

Non Functional Requirements:
Performance:
Security:
Audit / logging:
Monitoring:

Definition of Done:
- Code implemented
- Pytest
- Integration tests
- Documentation
- Monitoring setup
```

---

## 11 Rules — Quy tắc bắt buộc

### 1. Ngôn ngữ output

- Tất cả task breakdown phải viết bằng **tiếng Việt**.
- Được giữ nguyên thuật ngữ chuyên ngành IT: `API`, `Backend`, `Frontend`, `Database`, `Pytest`, `Integration test`, `Logging`, `Monitoring`, `Deployment`, `Config`, `Migration`, `DevOps`, `UI`, `UX`, `validation`, `service`, `controller`, `repository`.
- Tên task phải ngắn gọn, rõ nghĩa, dễ copy sang Jira/Excel.

### 2. Bắt buộc có bước review sau khi breakdown

Sau khi sinh danh sách task ban đầu, **luôn luôn** phải thực hiện bước review:

- Kiểm tra task đã cover toàn bộ **Acceptance Criteria** chưa.
- Kiểm tra đã cover **main flow** và **edge cases** chưa.
- Kiểm tra có thiếu nhóm task phổ biến không: Frontend, Backend, Database, Validation, Security/Permission, Error handling, Logging/Audit log, Pytest, Integration test, Deployment/Configuration, Documentation.
- Kiểm tra thiếu task liên quan impacted components.
- Kiểm tra task trùng lặp, quá nhỏ hoặc quá chung chung.

Nếu phát hiện thiếu:

1. Bổ sung task còn thiếu.
2. Cập nhật danh sách task cuối cùng.
3. Xuất **báo cáo review**.

### 3. Bắt buộc có báo cáo review

Output phải có phần **Báo cáo review** gồm:

- **Kết quả review**: Đã review AC nào, impacted components nào, nhóm task nào.
- **Task bổ sung sau review**: Liệt kê task thêm mới + lý do.
- **Kết luận review**: Task breakdown cuối cùng đã đủ coverage chưa. Nếu chưa rõ, liệt kê ở **Thông tin còn thiếu / Assumptions**.

Báo cáo review phải bắt đầu bằng `Status: READY | PARTIAL | BLOCKED` và Investigation Contract hợp nhất; không ghi `Good` nếu còn P0 hoặc evidence gap chưa được nêu.

### 4. Định dạng file output

- File task breakdown phải dưới dạng `.md`.
- Format rõ ràng, dễ copy sang Excel, Jira, Git, Confluence.
- Mỗi task nằm trên một dòng hoặc block rõ ràng.

### 5. Cấu trúc output chuẩn

Xem template tại: `resources/task-break-template.md`

### 6. Quy tắc đặt tên task

- Task title bắt đầu bằng **động từ rõ ràng**.
- ✅ `Tạo form cập nhật profile`, `Implement API cập nhật thông tin`, `Viết pytest cho service`
- ❌ `Profile`, `API`, `Test`

### 7. Quy tắc coverage tối thiểu

Mọi task breakdown phải cover tối thiểu (nếu liên quan):

- Phân tích nghiệp vụ, Frontend, Backend, Database, Validation, Permission/Security, Error handling, Logging/Audit, Testing, Deployment/Config, Documentation.

Nếu một nhóm không áp dụng, ghi rõ: `Không áp dụng` hoặc `Không bị ảnh hưởng trong User Story này`.

### 8. Quy tắc xử lý thiếu thông tin

- Vẫn breakdown theo thông tin hiện có.
- Gắn rõ **Assumptions** và **Thông tin còn thiếu**.
- Không bỏ qua review chỉ vì thiếu thông tin.

### 9. Nguyên tắc input tối thiểu

Input tối thiểu: Title, Description, Main Flow, Acceptance Criteria. AI tự suy ra phần còn lại từ source code.

### 10. Nguyên tắc về thời gian estimate

- Mỗi task phải có thời gian dự kiến (estimate dựa trên có sử dụng AI để code) + giải thích.
- Task không quá 4h. Nếu lớn hơn → chia nhỏ.

### 11. Nguyên tắc cuối cùng

- Nếu input chưa rõ → hỏi lại user.
- Impacted Components: AI tự quét source API, FE, và file SQL schema để xác định.
- Format luôn theo template `resources/task-break-template.md`.

---

## Phase 2: Review Task Coverage

Sau khi breakdown xong, bắt buộc review theo hướng dẫn chi tiết tại `references/review-task-coverage.md`.

### Vai trò AI Reviewer

Bạn là **AI Reviewer cho Task Breakdown và Estimation**. Không chỉ kiểm tra câu chữ — phải review dựa trên:

- Phạm vi user story, luồng nghiệp vụ suy ra
- Ảnh hưởng kỹ thuật từ API/FE/DB
- Ràng buộc validation, permission, error handling
- Test impact, release impact

Review với tư duy:

- **Coverage**: có thiếu đầu việc nào không?
- **Correctness**: task mô tả đúng bản chất chưa?
- **Necessity**: task nào thừa / trùng / không cần?
- **Estimate**: thời gian có thực tế không?
- **Execution clarity**: người làm hiểu rõ cách triển khai không?

### Nguyên tắc review

**A. Không review hời hợt** — Suy luận từ code để phát hiện đầu việc ẩn: sửa DTO, mapping data, validation, permission check, query/repository/index/migration, FE form/state/display, integration FE ↔ API, test bị ảnh hưởng, backfill data, analytics/audit log.

**B. Không tự bịa task** — Mọi task thêm phải có căn cứ: có trong requirement, suy ra từ source, hoặc bắt buộc kỹ thuật. Nếu không đủ: ghi `Need confirmation`.

**C. Estimate dựa trên complexity thực tế** — Xét: số file/module, mức coupling, migration, multi-layer, test/regression, uncertainty.

**D. Task description phải actionable** — Dev phải hiểu: sửa ở đâu, sửa gì, vì sao, output mong đợi.

### Checklist review nhanh

| Nhóm          | Kiểm tra                                                               |
| ------------- | ---------------------------------------------------------------------- |
| Requirement   | Cover toàn bộ AC? Bỏ sót logic/role/trạng thái CRUD/success-error?     |
| Backend/API   | Endpoint, DTO, service, repository, validation, auth, backward compat? |
| Frontend      | Page/component, state, validation FE, loading/error state, routing?    |
| Database      | Schema, migration, data backfill, index, relation?                     |
| Testing       | Unit, integration, regression, boundary, permission test?              |
| Deployment    | Feature flag, config, migration order, rollback?                       |
| Documentation | API contract, admin guide, release note?                               |

### Estimate bands gợi ý

- **XS (0.25h - 0.5h)**: sửa nhỏ, 1 chỗ, ít rủi ro
- **S (0.5h - 1h)**: 1 layer rõ ràng, logic đơn giản
- **M (1h - 3h)**: nhiều file trong 1-2 layer, có validation/test
- **L (3h - 6h)**: đa layer, coupling, test/regression rõ ràng
- **XL (6h - 12h)**: thay đổi lớn, migration, refactor, uncertainty cao

### Red flags estimate

**Quá thấp khi:** chạm nhiều layer nhưng estimate 1 layer; có schema change không tính test; có migration nhưng estimate thấp.

**Quá cao khi:** task quá nhỏ bị tách lớn; trùng effort; chỉ rename/config; reuse flow cũ.

### Tiêu chí review mô tả task

Đánh giá qua 5 câu hỏi:

1. Sửa ở đâu? 2. Sửa cái gì? 3. Vì sao? 4. Output mong đợi? 5. Dev bắt tay làm được không?

Nếu "không" → viết lại theo: **What** (thay đổi gì) → **Where** (module/layer) → **Why** (lý do + estimate) → **Done when** (điều kiện hoàn thành).

---

## Phase 3: Output cuối cùng

### Review Report

```
Tổng số task đầu vào:
Tổng số task sau review:
Số task giữ nguyên:
Số task chỉnh sửa:
Số task thêm mới:
Số task gộp/xóa:
Đánh giá coverage tổng thể: Good / Partial / Poor
Đánh giá quality estimate: Accurate / Needs adjustment / Poor
Kết luận ngắn:
```

### Task Breakdown Final

Hoàn thành bộ task breakdown final dưới dạng markdown, theo format `resources/task-break-template.md`, để dễ copy vào Excel/Jira.

---

## Coverage Checklist

Sau khi generate tasks, chạy checklist này:

### Business Coverage

- [ ] Tất cả Acceptance Criteria có task
- [ ] Main flow có task
- [ ] Edge case có task
- [ ] Business rule có task

### Frontend Coverage

- [ ] UI components
- [ ] Form validation
- [ ] Error state
- [ ] Loading state
- [ ] Empty state
- [ ] API integration

### Backend Coverage

- [ ] API endpoint
- [ ] Business logic
- [ ] Validation
- [ ] Service layer
- [ ] Repository layer

### Database Coverage

- [ ] Schema change
- [ ] Migration script
- [ ] Index update
- [ ] Data consistency check

### Security Coverage

- [ ] Authentication
- [ ] Authorization
- [ ] Permission validation
- [ ] Sensitive data handling

### Integration Coverage

- [ ] External API call
- [ ] Retry logic
- [ ] Timeout handling
- [ ] Circuit breaker

### Error Handling Coverage

- [ ] Invalid input
- [ ] System failure
- [ ] Service unavailable
- [ ] Data conflict

### Logging & Monitoring

- [ ] Audit log
- [ ] System log
- [ ] Metrics
- [ ] Alert

### Testing Coverage

- [ ] Pytest
- [ ] Integration test
- [ ] Edge case tests
- [ ] Regression tests

### Deployment Coverage

- [ ] Config update
- [ ] Environment variables
- [ ] Feature flag (nếu có)
- [ ] Rollback plan

---

## Common Mistakes

| Lỗi thường gặp                   | Cách khắc phục                            |
| -------------------------------- | ----------------------------------------- |
| Chỉ sinh task rồi dừng lại       | Luôn chạy review cycle đầy đủ             |
| Bỏ sót error handling / logging  | Dùng coverage checklist                   |
| Task quá chung chung ("Fix bug") | Bắt đầu bằng động từ cụ thể + context     |
| Estimate không có giải thích     | Mỗi task cần lý do estimate               |
| Task > 4h không được chia nhỏ    | Chia thành sub-tasks ≤ 4h                 |
| Không hỏi lại khi thiếu info     | Ghi assumptions + hỏi user                |
| Review hời hợt theo câu chữ      | Suy luận từ code, không chỉ đối chiếu tên |
