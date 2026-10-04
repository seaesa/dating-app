---
name: constitution
description: Đọc source và tài liệu kỹ thuật của project để tạo lại project-context.md và constitution.md ở project root.
when_to_use: "Khi người dùng gọi /constitution hoặc yêu cầu tạo/cập nhật technical project context, project rules, engineering constitution hay source-of-truth cho agent."
allowed-tools: Read, Grep, Glob, Bash, Write
version: 1.0.0
---

# Constitution & Project Context

Skill này tạo hai tài liệu source-of-truth ở project root:

- `project-context.md`: hiện trạng kỹ thuật có evidence.
- `constitution.md`: luật và nguyên tắc bắt buộc để agent/developer tuân thủ.

## Phạm vi đọc source

Ưu tiên đọc:

- Source code và entry points.
- `README`, architecture/design docs và tài liệu API.
- Manifest/dependency/config: `package.json`, `pyproject.toml`, `Cargo.toml`, lockfiles, `tsconfig`, Docker/CI config.
- Test, migration, schema, scripts và deployment config.
- `.agents/rules`, `.agents/skills`, `.agents/workflows`, `.agents/memory`, handoff và plan liên quan.
- AST/code graph khi khả dụng để xác định module, caller/callee, flows và coupling.

Không đọc hoặc không đưa nội dung nhạy cảm vào output:

- `.git`, `.agents/.venv`, `node_modules`, `vendor`, `dist`, `build`, `coverage`, cache và generated files.
- Secret/token/password/private key/cookie/API key hoặc giá trị trong `.env*`/secret store.
- Binary/large asset không cần cho hiểu kiến trúc.

Nếu cần nói đến secret/config, chỉ ghi tên biến, đường dẫn và trạng thái `configured/unconfigured/unknown`; tuyệt đối không ghi value.

## Evidence discipline

- Fact phải có `path:line`, graph result, command hoặc test evidence.
- Inference phải gắn nhãn `inferred` và nêu căn cứ.
- Không đủ bằng chứng thì ghi `unknown`/`needs confirmation`, không biến assumption thành luật.
- Ghi rõ phạm vi đã đọc, file bị loại trừ và giới hạn graph/runtime.
- Dùng `@[skills/investigation-contract]` cho phần hiện trạng, impact, edge-case, assumptions và unknowns trước khi generate.

## `project-context.md` bắt buộc có

1. Metadata: generated date, source revision nếu lấy được, scope và status.
2. Executive technical summary.
3. Repository structure và entry points.
4. Runtime/platform và technology stack, kèm evidence.
5. Module/component boundaries và execution flows.
6. Data model, persistence, API/contracts và external integrations.
7. Configuration/env variable names, commands và operational requirements — không có secret values.
8. Testing, CI/CD, deployment và observability.
9. Conventions/patterns đang dùng.
10. Dependencies, coupling, risks, edge-cases và technical debt.
11. Unknowns, assumptions, excluded paths và source index.

## `constitution.md` bắt buộc có

Mỗi rule phải có `ID`, nội dung MUST/MUST NOT, rationale, enforcement/verification và source evidence hoặc nhãn `INFERRED`.

1. Scope, authority và cách xử lý conflict.
2. Evidence-first investigation và source-of-truth.
3. Architecture/module ownership và dependency boundaries.
4. Coding/formatting/naming/type-safety rules.
5. Testing, regression và verification-before-done.
6. Security, secret handling, privacy và input validation.
7. API/data/schema/migration/backward compatibility.
8. Error handling, logging, metrics và observability.
9. Dependency/configuration/deployment/rollback.
10. Documentation, handoff, memory và agent workflow.
11. Forbidden actions, exception process và escalation questions.

Các luật suy ra từ pattern nhưng chưa được project xác nhận phải ghi `[INFERRED — NEEDS CONFIRMATION]`; không giả vờ là quyết định đã được phê duyệt.

## Overwrite policy

`/constitution` ghi đè toàn bộ `project-context.md` và `constitution.md` tại project root theo yêu cầu của người dùng. Không append và không merge nội dung cũ. Trước khi ghi, phải hoàn tất cả hai tài liệu trong memory, kiểm tra required sections và secret redaction; chỉ sau đó mới write.

## Completion report

Chỉ trả một report cuối gồm: status, source scope, files generated/overwritten, technical findings chính, rules chính, redactions/exclusions, unknowns/questions, verification commands/results và timestamp. Không báo thành công nếu chưa re-read hai file sau khi ghi.
