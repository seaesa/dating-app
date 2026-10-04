# Task Estimate Template

## Format

Mỗi task phải theo format sau:

| STT | Task | Estimate (h) | Mô tả |
| --- | ---- | ------------ | ----- |

### Quy tắc

- `STT`: số thứ tự.
- `Task`: phải có prefix loại task, ví dụ `[Code][BE]`, `[Code][FE]`, `[Test]`, `[RV]`, `[Tài liệu]`,...
- `Estimate (h)`: thời gian ước tính theo giờ.
- `Mô tả`: mô tả cách thực hiện task và lý do của estimate.

### Prefix loại task

[RV]
[Test]
[Create TCs]
[Code][Pytest]
[Others]
[FR]
[Feedback]
[Code][BE]
[Code][FE]
[Common]
[Code]
[Database]
[Design]
[DevOps]
[Tài liệu]

---

## Cấu trúc output chuẩn

```md
# Task Breakdown

## Thông tin đầu vào

- Title:
- User Story:
- Acceptance Criteria:
- Impacted Components:
- Assumptions:

## Task Breakdown ban đầu

### Frontend

- [ ] Task 1 - 2h
- [ ] Task 2 - 0.5h

### Backend

- [ ] Task 3 - 1h
- [ ] Task 4 - 1h

### Database

- [ ] Task 5 - 0.5h

### Testing

- [ ] Task 6 - 1.5h
- [ ] Task 7 - 2.5h

## Review Coverage

### Acceptance Criteria Coverage

- AC1: Covered bởi các task nào
- AC2: Covered bởi các task nào

### Review phát hiện thiếu

- Task A bị thiếu vì ...
- Task B bị thiếu vì ...

## Task bổ sung sau review

- [ ] Task bổ sung 1
- [ ] Task bổ sung 2

## Danh sách task cuối cùng

### Frontend

- [ ] ...

### Backend

- [ ] ...

### Database

- [ ] ...

### Testing

- [ ] ...

## Báo cáo review

- Số task ban đầu:
- Số task bổ sung sau review:
- Kết luận coverage:
- Thông tin còn thiếu / assumptions:
```

---

## Example Data

| STT | Task                               | Estimate (h) | Mô tả                                                                                                                                                                                |
| --- | ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [Code][BE] Code API tính năng      | 2.5          | Phân tích yêu cầu → thiết kế endpoint → implement logic xử lý → viết query DB → test API bằng Postman. Thời gian estimate 2.5h vì logic xử lý đơn giản, chỉ CRUD và validate cơ bản. |
| 2   | [Code][FE] UI cho màn hình Feature | 3            | Tạo layout component → gọi API → xử lý state → validate form → test UI responsive. Estimate 3h vì cần styling và xử lý state.                                                        |
| 3   | [Test] Unit test API               | 1.5          | Viết test case cho các case chính (success, validate error, permission). Estimate 1.5h vì reuse test setup có sẵn.                                                                   |
| 4   | [RV] Code review                   | 1            | Review logic code, naming, security, performance. Estimate 1h cho feature nhỏ.                                                                                                       |
| 5   | [Code] Fix bug sau review          | 1            | Fix các comment từ review và test lại feature.                                                                                                                                       |
