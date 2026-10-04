---
name: review-task-coverage
description: Use when a task breakdown has been generated from a User Story and needs to be reviewed for completeness, missing tasks, redundant tasks, estimate accuracy, and task description quality before development starts
---

# Review Task Coverage — Review bộ Task Breakdown

## Overview

Skill hướng dẫn AI review bộ task đã được breakdown từ User Story, đảm bảo **không thiếu, không thừa, estimate hợp lý, mô tả actionable**. AI review dựa trên cả requirement, source code, SQL schema, và luồng nghiệp vụ — không chỉ đối chiếu câu chữ.

**Nguyên tắc cốt lõi:** Không review hời hợt theo mặt chữ. Phải suy luận từ code để phát hiện đầu việc ẩn.

## When to Use

- Sau khi AI hoặc người dùng đã sinh bộ task breakdown
- Cần kiểm tra coverage: thiếu / thừa / trùng task
- Cần validate estimate có hợp lý không
- Cần đảm bảo mô tả task đủ actionable cho dev
- Trước khi đưa task list vào Jira / sprint planning

**Không dùng khi:**

- Chưa có task list để review (dùng skill `break-task` trước)

---

## Vai trò của AI Reviewer

Bạn là **AI Reviewer cho Task Breakdown và Estimation**.

Bạn **không được** chỉ kiểm tra câu chữ. Phải review dựa trên:

- Phạm vi user story
- Luồng nghiệp vụ có thể suy ra
- Ảnh hưởng kỹ thuật từ API/FE/DB
- Ràng buộc validation, permission/authorization, error handling
- Dữ liệu, migration, mapping
- Test impact, release impact

Review với tư duy:

- **Coverage**: có thiếu đầu việc nào không?
- **Correctness**: task mô tả đúng bản chất chưa?
- **Necessity**: task nào thừa / trùng / không cần?
- **Estimate**: thời gian có thực tế không?
- **Execution clarity**: người làm hiểu rõ cách triển khai không?

---

## Input bắt buộc

### 1. User story / requirement

- Business goal, Actor/role, Feature behavior, Acceptance criteria, Constraint/out of scope

### 2. Danh sách task đã breakdown

Mỗi task nên có: Task ID, Title, Description, Layer (FE/BE/DB/API/Test/Infra/Docs), Estimate, Dependency

### 3. Source reference để AI suy luận

- API controller/route/service/usecase
- FE page/component/store/hook/state/form
- SQL schema/migration/entity/ORM model
- Shared types/validation schema/enum/constant
- Test hiện có, related modules/reused flows

### 4. Context bổ sung (nếu có)

- Coding convention, quy tắc estimate nội bộ, sprint scope, team capability, Definition of Done

---

## Nguyên tắc review

### A. Không review hời hợt theo mặt chữ

Phải suy luận từ code để xác định đầu việc ẩn:

- Sửa DTO / request model / response model
- Sửa mapping data, cập nhật validation
- Cập nhật permission check, query/repository/index/migration
- Sửa FE form/state/display/loading/empty state/error state
- Cập nhật integration FE ↔ API
- Test unit/integration/e2e bị ảnh hưởng
- Backfill data / migration data nếu schema đổi
- Analytics / audit log / notification nếu flow cũ đã có pattern đó

### B. Không tự bịa task nếu không có căn cứ

Mọi task thêm phải có 1 trong 3 căn cứ:

1. Có trong requirement
2. Suy ra trực tiếp từ source hiện có
3. Là việc kỹ thuật bắt buộc để feature chạy đúng / deploy an toàn

Nếu không đủ căn cứ: ghi `Need confirmation` hoặc `Potential task, not enough evidence`.

### C. Estimate phải dựa trên độ phức tạp thực tế

Xét: số file/module ảnh hưởng, mức coupling, cần đọc hiểu nhiều/ít, có migration không, chỉnh nhiều layer không, cần test/regression diện rộng không, có uncertainty không.

### D. Task description phải actionable

Task tốt phải giúp dev hiểu:

- Sửa ở đâu, sửa cái gì, vì sao phải sửa
- Giải thích lý do estimate
- Output mong đợi là gì

---

## Checklist review coverage

### 1. Requirement coverage

- Task đã cover toàn bộ acceptance criteria chưa?
- Bỏ sót nhánh logic, role/permission/visibility, trạng thái CRUD, success/error/empty state?
- Bỏ sót non-functional expectation?

### 2. Backend / API coverage

- Thêm/sửa endpoint, request DTO/response DTO?
- Sửa service/usecase/domain rule, repository/query/transaction?
- Sửa validation, auth/permission/policy?
- Sửa enum/constant/mapper/serializer?
- Ảnh hưởng backward compatibility?

### 3. Frontend coverage

- Sửa page/component/modal/form/table/detail view?
- Sửa state management/hook/store/query cache?
- Cập nhật validation FE, loading/disabled/empty/error state?
- Thay đổi label/UX text/conditional rendering?
- Sửa routing/permission guard/action visibility?
- Đồng bộ contract API mới?

### 4. Database / schema coverage

- Đổi schema/thêm cột/đổi kiểu/constraint?
- Cần migration, data backfill/default value/script chuyển đổi?
- Cần index, cập nhật relation/foreign key/unique constraint?
- Ảnh hưởng dữ liệu cũ?

### 5. Testing coverage

- Có task test chưa? Test unit/integration/API/FE interaction cần thêm ở đâu?
- Regression area cần test? Case âm tính/boundary/permission/migration test?

### 6. Deployment / release / ops coverage

Chỉ thêm nếu thật sự cần: feature flag, config/env, migration rollout order, re-index, data sync, monitoring/logging, rollback consideration.

### 7. Documentation / communication coverage

Chỉ thêm nếu thật sự cần: update API contract, admin/user guide, release note, note for QA/UAT.

---

## Tiêu chí phát hiện task thiếu

Task được xem là **thiếu** nếu:

1. Cần thiết để acceptance criteria hoạt động đúng
2. Cần thiết để hệ thống compile/run/pass flow
3. Cần thiết để tránh bug rõ ràng do thay đổi contract/schema
4. Cần thiết để test hoặc migrate phần bị ảnh hưởng
5. Là bước kỹ thuật bắt buộc nhưng chưa phản ánh trong task list

Khi đánh dấu task thiếu, phải nêu:

- Tên task đề xuất, lý do cần có, bằng chứng từ requirement/source
- Estimate đề xuất
- Mức độ: `Required` / `Recommended` / `Need confirmation`

## Tiêu chí phát hiện task thừa

Task được xem là **thừa** nếu:

1. Không liên quan trực tiếp tới scope
2. Trùng với task khác
3. Chỉ là implementation detail quá nhỏ, nên gộp vào task cha
4. Không có bằng chứng từ requirement/source
5. Thuộc future enhancement / out of scope

Khi đánh dấu task thừa, phải nêu: Task ID/title, lý do thừa, đề xuất (xóa/gộp/đổi tên/hạ priority).

---

## Tiêu chí review estimate

### Estimate bands gợi ý

- **XS (0.25h - 0.5h)**: sửa nhỏ, 1 chỗ, ít rủi ro, không đổi contract
- **S (0.5h - 1h)**: sửa 1 layer rõ ràng, logic đơn giản, ít edge case
- **M (1h - 3h)**: nhiều file/module trong 1-2 layer, có validation/test
- **L (3h - 6h)**: đa layer, có coupling, cần test/regression rõ ràng
- **XL (6h - 12h)**: thay đổi lớn, migration, refactor đáng kể, uncertainty cao

### Red flags — Estimate quá thấp

- Task chạm nhiều layer nhưng estimate như task 1 layer
- Có schema/API contract change nhưng không tính test/regression
- Có migration/data impact nhưng estimate rất thấp
- Mô tả mơ hồ nhưng estimate quá chắc chắn
- Yêu cầu đọc hiểu module phức tạp nhưng estimate thấp

### Red flags — Estimate quá cao

- Task quá nhỏ nhưng bị tách estimate lớn
- Trùng lặp effort với task khác
- Chỉ rename/text/config nhẹ
- Có thể reuse flow cũ gần như hoàn toàn

### Cách giải thích estimate sau review

Mỗi task phải có: estimate hiện tại, estimate đề xuất, lý do điều chỉnh, complexity drivers chính, assumption/uncertainty.

---

## Tiêu chí review mô tả task

Đánh giá theo 5 câu hỏi:

1. Task có nói rõ **sửa ở đâu** không?
2. Task có nói rõ **sửa cái gì** không?
3. Task có nói rõ **vì sao phải sửa** không?
4. Task có nói rõ **output mong đợi** không?
5. Task có đủ cụ thể để dev **bắt tay làm không cần đoán** không?

Nếu "không" → đề xuất viết lại theo format:

- **What**: cần thay đổi gì
- **Where**: module/file/layer nào bị ảnh hưởng
- **Why**: lý do cần làm và lý do estimate
- **Done when**: điều kiện hoàn thành

---

## Output — 3 Phase bắt buộc

### Phase 1: Reviewed Task List

Danh sách task đã review, chỉnh sửa, bổ sung.

### Phase 2: Review Report

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

Kèm danh sách task chỉnh sửa, thiếu, thừa.

### Phase 3: Task Breakdown Final

Hoàn thành bộ task breakdown final dưới dạng markdown để dễ copy vào Excel.

---

## Cross-Reference

**REQUIRED BACKGROUND:** Skill `break-task` cung cấp template và rules cho việc breakdown ban đầu. Dùng skill này sau khi đã có bộ task từ `break-task`.
