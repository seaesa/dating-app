---
name: ui-ux-review
description: Comprehensive UI/UX auditing standards covering visual design hierarchy, WCAG accessibility, responsiveness, design tokens, and user interaction flows.
when_to_use: "When asked to 'review UI/UX', 'audit UI', 'check accessibility', 'review UX design', or 'verify design guidelines compliance'."
allowed-tools: Read, Grep, Glob, WebFetch
---

# UI/UX Review Standards & Guidelines

A structured auditing framework for evaluating Web and Mobile User Interfaces for aesthetic quality, usability, accessibility (WCAG), and responsive design.

---

## 🎯 Review Pillars

### 1. Visual Hierarchy & Typography Scale

- **Primary Focus**: Clear visual anchors that guide user attention naturally.
- **Font Scaling**: Consistent typographic scale (e.g., Display, H1, H2, Body, Caption). Avoid arbitrary font sizes.
- **Line Height & Spacing**: Proper readability (`line-height: 1.5` for body text, `1.2` for headings). Maximum line width ~65-75 characters.
- **Contrast & Prominence**: Primary actions stand out over secondary and tertiary actions.

### 2. Color System & Accessibility (WCAG 2.1 AA)

- **Contrast Ratios**:
  - Normal text: minimum **4.5:1** contrast ratio.
  - Large text (18pt / 24px+ or 14pt bold+): minimum **3:1** ratio.
  - UI Components & Graphics: minimum **3:1** ratio.
- **Color Meaning**: Never rely solely on color to convey information (combine with icons, labels, or text).
- **Focus Indicators**: Visible focus rings for keyboard navigation (`outline-style`, `focus-visible`).

### 3. Responsive & Mobile-First Layouts

- **Fluid Layouts**: Flexbox/Grid containers without hardcoded pixel widths (`width: 100%`, `max-width`, `min-width`).
- **Touch Targets**: Minimum **44x44px** (or 48x48dp) touch areas for buttons and inputs on mobile.
- **Horizontal Overflow**: No unintended horizontal scrollbars at any breakpoint (320px - 1440px+).
- **Safe Area Insets**: Account for notch/home indicators on mobile devices (`padding: env(safe-area-inset-* )`).

### 4. Interactive States & Micro-interactions

- **State Coverage**: Every interactive element MUST support:
  - Default / Idle
  - Hover (`:hover`)
  - Active / Pressed (`:active`)
  - Focus (`:focus-visible`)
  - Disabled (`:disabled` + `aria-disabled="true"`)
  - Loading / Pending (spinners or pulse skeletons)
- **Feedback**: Immediate visual feedback (<100ms) on user actions. Smooth CSS transitions (`150ms - 300ms ease`).

### 5. Form Design & Usability

- **Labels**: Every input MUST have an associated `<label>` or `aria-label`.
- **Validation**: Inline, real-time error messages near the relevant field.
- **Autofill & Types**: Proper `type="..."`, `inputmode="..."`, and `autocomplete="..."` attributes.

---

## 📋 Comprehensive Checklist

### Visual & Layout Audit

- [ ] Consistent spacing scale (e.g., 4px / 8px / 16px / 24px / 32px / 48px grid)
- [ ] Alignment consistency (left-aligned text, centered actions where appropriate)
- [ ] Dark Mode / Light Mode token consistency (semantic tokens vs raw hex values)

### Accessibility Audit

- [ ] Keyboard navigable (Tab order logical, Esc closes modals)
- [ ] Screen-reader friendly (`alt` text for images, `aria-expanded` for collapsibles)
- [ ] Reduced Motion support (`@media (prefers-reduced-motion: reduce)`)

### UX & Content Audit

- [ ] Empty states handled with clear CTAs (e.g., empty cart, no search results)
- [ ] Error recovery paths provided (clear messages + retry buttons)
- [ ] Destructive actions require explicit confirmation (e.g., delete prompt)

---

## 🚫 Common Anti-Patterns to Flag

```tsx
// ❌ Poor Touch Target & Missing Accessible Label
<button onClick={handleDelete} className="p-1 text-red-500">
  <TrashIcon />
</button>

// ✅ Accessible Touch Target & Label
<button
  onClick={handleDelete}
  aria-label="Delete item"
  className="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 rounded-md"
>
  <TrashIcon aria-hidden="true" />
</button>
```

```html
<!-- ❌ Hardcoded colors & missing focus indicator -->
<button style="background: blue; color: white;">Submit</button>

<!-- ✅ Semantic Tokens & Visible Focus -->
<button
  class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md px-4 py-2 font-medium transition-colors"
>
  Submit
</button>
```

---

## 🔗 Related Skills

| Skill                   | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `web-design-guidelines` | Vercel Web Interface Guidelines audit (100+ rules)   |
| `frontend-design`       | UI design principles, typography, and color systems  |
| `tailwind-patterns`     | Tailwind CSS utility patterns and responsive classes |
| `mobile-design`         | iOS & Android native mobile UX patterns              |
