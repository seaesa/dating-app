---
description: Perform comprehensive UI/UX review for web and mobile interfaces covering visual design, accessibility, responsiveness, and interaction flow.
---

# /review-ui-ux — Web & Mobile Interface Audit

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load ui-ux-review skill** — Read `.agents/skills/ui-ux-review/SKILL.md` and `.agents/skills/web-design-guidelines/SKILL.md` first
2. **Visual & Usability First** — Audit layout hierarchy, contrast, typography, component consistency, and user flow clarity
3. **WCAG Compliance** — Check color contrast ratios, screen reader accessibility, and keyboard navigation
4. **Responsive Audit** — Check behavior across desktop, tablet, and mobile viewports

---

## Task

Audit the specified UI components or pages against modern UI/UX standards:

```
CONTEXT:
- Target files/pages: $ARGUMENTS
- If empty: review recent frontend components or page layouts changed in this session

WORKFLOW:
1. IDENTIFY target UI files (HTML, JSX/TSX, Vue, CSS, Tailwind)
2. LOAD skills: ui-ux-review & web-design-guidelines
3. AUDIT Visual Hierarchy & Layout (spacing, contrast, alignment, typography)
4. AUDIT Accessibility (WCAG A/AA, aria labels, focus indicators, keyboard flow)
5. AUDIT Responsive Design (mobile-first, breakpoint flexibility, overflow)
6. AUDIT Micro-interactions & States (hover, active, disabled, loading, error)
7. PROVIDE actionable UI/UX findings grouped by severity (Critical, Warning, Optimization)
```

---

## Expected Output

The report must start with the Investigation Contract: current UI state with page/screenshot/code evidence, affected user flows and responsive/accessibility impact, edge-cases (empty/loading/error/keyboard/mobile), assumptions, confidence, and unresolved product decisions. A P0 product/accessibility policy question is `BLOCKED`.

```markdown
## 🎨 UI/UX Review Report

### Target: [Files/Pages Audited]

### Summary

- 🔴 Critical UX / Accessibility Blockers: [N]
- 🟡 Design & Responsiveness Warnings: [N]
- 🟢 UX & Polish Enhancements: [N]

---

### 🔴 Critical Issues (Must Fix)

- **[Component/Element]**: [Description of issue]
  - **Impact**: [Accessibility / Layout shift / Broken flow]
  - **Recommendation**: [Exact CSS/JSX code fix]

---

### 🟡 Design & Responsiveness Warnings

- **[Component/Element]**: [Description]
  - **Recommendation**: [Suggested fix]

---

### 🟢 Micro-interactions & UX Polish

- **[Component/Element]**: [Enhancement idea]

---

### Checklist Audit

- [ ] Visual Hierarchy & Spacing scale
- [ ] Typography scale & Contrast (WCAG AA 4.5:1)
- [ ] Responsive Breakpoints & Mobile Touch Targets (>=44px)
- [ ] Interactive & State Feedback (Hover, Active, Focus, Loading)
- [ ] Component & Design Token Consistency
```

---

## Usage Examples

```
/review-ui-ux
/review-ui-ux src/components/Header.tsx
/review-ui-ux review mobile landing page checkout flow
```
