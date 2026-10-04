---
name: code-review
description: Professional code review guidelines assessing correctness, security (OWASP), performance, maintainability, type safety, and test coverage.
when_to_use: "When reviewing code for PRs, auditing codebase quality, evaluating refactoring, or checking security and performance."
allowed-tools: Read, Grep, Glob
---

# Code Review Guidelines & Best Practices

A rigorous code review methodology focusing on code correctness, security, performance, clean architecture, and maintainability.

Every review must also apply `@[skills/investigation-contract]`: establish current behavior with evidence, map direct/indirect impact, enumerate edge-cases and coverage gaps, separate findings from assumptions, and list questions the reviewer cannot resolve. A policy/contract question that blocks a safe recommendation must be marked P0 and `BLOCKED`.

---

## 🎯 Review Dimensions

### 1. Correctness & Edge Case Resilience

- **Logic Verification**: Code does what it intends to do without subtle logic flaws.
- **Edge Cases**: Empty collections, null/undefined bounds, network timeouts, zero division, concurrency races.
- **Error Handling**: Exceptions caught at appropriate boundaries; no swallowing errors silently (`try { ... } catch {}`).
- **State Integrity**: Immutable operations preferred over unintended global state mutation.

### 2. Security Audit (OWASP Standards)

- **Input Sanitization**: User input validated and sanitized before entering SQL, HTML, or CLI commands.
- **Secret Hygiene**: Zero hardcoded passwords, API keys, tokens, or private credentials.
- **Injection Vulnerabilities**: Prepared statements used for database queries (SQL injection prevention).
- **Authentication & Authorization**: Proper permission checks before executing business actions.
- **AI/LLM Sinks**: Prompt inputs sanitized to prevent prompt injection; AI output validated against schemas.

### 3. Performance & Resource Efficiency

- **Database Access**: No N+1 queries; proper indexing and column selection.
- **Memory & Allocation**: Event listeners cleaned up, streams closed, loops bound-checked.
- **Async Execution**: Non-blocking async/await (`Promise.all` for parallel tasks vs sequential bottlenecks).
- **Caching**: Proper use of memoization/caching for expensive computations or network fetches.

### 4. Code Architecture & Clean Code

- **SOLID Principles**: Single responsibility per module/function; clear interface abstractions.
- **DRY (Don't Repeat Yourself)**: Shared utilities for repeated logic without premature abstraction.
- **Type Safety**: Strict typing (avoid `any` in TypeScript, generic wildcards in Java/C#).
- **Naming Clarity**: Intent-revealing names (`isUserAuthenticated` vs `check`).

### 5. Testability & Maintainability

- **Test Coverage**: Critical paths and edge cases covered by unit/integration tests.
- **Readable Assertions**: Tests fail with explicit, diagnostic failure messages.
- **Documentation**: Non-obvious architectural decisions or complex algorithms documented with comments.

---

## 🏷️ Severity Classification System

| Icon | Classification | Description                                                       | Action Required              |
| ---- | -------------- | ----------------------------------------------------------------- | ---------------------------- |
| 🔴   | **BLOCKING**   | Critical bug, security flaw, data loss risk, broken contract      | Must be fixed before merging |
| 🟡   | **SUGGESTION** | Performance improvement, cleaner pattern, refactoring opportunity | Recommended to address       |
| 🟢   | **NIT**        | Small formatting, naming style preference, minor comment fix      | Optional                     |
| ❓   | **QUESTION**   | Clarification needed regarding intent, requirement, or assumption | Author explanation required  |

---

## 🚫 Common Code Anti-Patterns & Fixes

### 1. Silent Error Swallowing

```typescript
// ❌ Dangerous: Swallowing errors
try {
  await saveData(payload);
} catch (e) {}

// ✅ Safe: Log, report, or rethrow with context
try {
  await saveData(payload);
} catch (error) {
  logger.error("Failed to save payload", { error, payloadId: payload.id });
  throw new DatabaseException("Save operation failed", { cause: error });
}
```

### 2. N+1 Async Queries

```typescript
// ❌ Sequential N+1 execution
for (const userId of userIds) {
  const user = await fetchUser(userId); // N sequential network calls
  users.push(user);
}

// ✅ Parallel batch execution
const users = await Promise.all(userIds.map((id) => fetchUser(id)));
```

### 3. Dangerous Type Casting (`any`)

```typescript
// ❌ Disabling type safety
function processResponse(data: any) {
  return data.user.name;
}

// ✅ Type Safe with Guard
interface ApiResponse {
  user: { name: string };
}
function processResponse(data: ApiResponse) {
  return data?.user?.name ?? "Anonymous";
}
```

---

## 📋 Reviewer Checklist

- [ ] Does the code satisfy the functional acceptance criteria?
- [ ] Are edge cases (null, empty, error, timeout) handled explicitly?
- [ ] Is input sanitized and free of security risks (XSS, SQLi, Secret leakage)?
- [ ] Are async operations efficient without unnecessary blocking?
- [ ] Are types strict and expressive?
- [ ] Are unit tests provided for new logic?
- [ ] Is the code free of dead code or unused imports created by these changes?

---

## 🔗 Related Skills

| Skill                   | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `code-review-checklist` | Quick code review standards & AI logic checks         |
| `clean-code`            | Software engineering standards & refactoring patterns |
| `lint-and-validate`     | Code linting, formatting, and validation scripts      |
| `vulnerability-scanner` | Security auditing and vulnerability scanning          |
| `code-review-graph`     | Tree-sitter AST & code graph analysis                 |
