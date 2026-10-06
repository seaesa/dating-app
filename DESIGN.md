---
name: Warm Pulse
colors:
  surface: "#fcf8fb"
  surface-dim: "#dcd9dc"
  surface-bright: "#fcf8fb"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f6f3f5"
  surface-container: "#f0edef"
  surface-container-high: "#eae7ea"
  surface-container-highest: "#e4e2e4"
  on-surface: "#1b1b1d"
  on-surface-variant: "#58413e"
  inverse-surface: "#303032"
  inverse-on-surface: "#f3f0f2"
  outline: "#8c716d"
  outline-variant: "#e0bfbb"
  surface-tint: "#ac332a"
  primary: "#ac332a"
  on-primary: "#ffffff"
  primary-container: "#ff6f61"
  on-primary-container: "#6f0205"
  inverse-primary: "#ffb4aa"
  secondary: "#006e28"
  on-secondary: "#ffffff"
  secondary-container: "#6ffb85"
  on-secondary-container: "#00732a"
  tertiary: "#6a5b59"
  on-tertiary: "#ffffff"
  tertiary-container: "#ab9996"
  on-tertiary-container: "#3e3130"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#ffdad5"
  primary-fixed-dim: "#ffb4aa"
  on-primary-fixed: "#410001"
  on-primary-fixed-variant: "#8b1a16"
  secondary-fixed: "#72fe88"
  secondary-fixed-dim: "#53e16f"
  on-secondary-fixed: "#002107"
  on-secondary-fixed-variant: "#00531c"
  tertiary-fixed: "#f3dedb"
  tertiary-fixed-dim: "#d6c2bf"
  on-tertiary-fixed: "#241918"
  on-tertiary-fixed-variant: "#514442"
  background: "#fcf8fb"
  on-background: "#1b1b1d"
  surface-variant: "#e4e2e4"
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "800"
    lineHeight: 38px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: "800"
    lineHeight: 34px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 30px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 26px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: "600"
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "600"
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "600"
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system defines an intentional, emotionally inviting, and refreshingly clean interface for modern mobile dating. Drawing aesthetic discipline from streamlined consumer social apps, it focuses on reducing friction, fostering authentic romantic discovery, and prioritizing human photography and expressive personal details above all else.

The visual style is modern, approachable, and unequivocally flat. It purposefully avoids gimmicks: no blurred glass, no noisy gradients, no heavy skeuomorphic extrusion, and no harsh neon halos. Instead, clarity and warmth reign supreme through crisp contrast, deliberate white space, responsive tap targets, and intuitive gestural affordances. The interface serves as a confident, whisper-quiet canvas that makes member profiles, portrait imagery, and personal prompts glow with vitality and trust.

## Colors

The color palette is deliberately crisp, energetic, and highly readable, calibrated specifically for natural mobile viewing in varying ambient lighting.

- **Primary (`#FF6F61` — Warm Coral):** Drives the emotional core of the platform. Used strictly for core identity touchpoints, profile matches, affirmative actions, brand badges, and key CTA highlights.
- **Secondary (`#34C759` — Vibrant Green):** Represents positive reciprocation, active status markers, successful swipe actions, match notifications, and verified safety seals.
- **Tertiary (`#FFEAE7` — Soft Peach):** A gentle, desaturated tint derived from the warm coral base. Utilized for non-disruptive chip backgrounds, selection states, active chat bubbles, and tag containers.
- **Neutral Primary (`#1C1C1E` — Dark Charcoal):** Anchors high-contrast headlines, primary user biographies, icons, and critical text.
- **Neutral Secondary (`#8E8E93` — Muted Gray):** Provides clarity for secondary metadata, timestamps, distance markers, and inactive navigational states.
- **Surface Foundations:** Pure White (`#FFFFFF`) forms the primary card and base canvas background. Off-white soft grays (`#F8F9FA` to `#F2F2F7`) provide separation for scrollable body backdrops, input gutters, and grouped section dividers without visual clutter.

## Typography

The typography system relies exclusively on **Inter** to ensure maximum legibility, precision metrics, and consistent vertical rhythm across mobile screens.

- **Display & Headlines:** Used for candidate names, ages, instant match announcements, and screen headers. Letter spacing is kept tight (`-0.02em` on titles above 20px) to give names and key questions punchy impact.
- **Body:** Handles profile prompts, personal bios, and messaging threads. Generous line-height (`1.4` to `1.5`) guarantees swift scanning during discovery.
- **Labels & Microcopy:** Used for badges, pill tags, bottom navigation labels, and verification callouts. Formatted with medium-to-semibold weights (`600`) to remain sharp even at compact dimensions.

## Layout & Spacing

The layout is built upon a mobile-first, continuous 4px/8px modular spacing rhythm, designed for single-handed navigation and fluid vertical feeds:

- **Mobile Canvas & Discovery Stage:** The discovery viewport uses a unified `16px` outer margin (`margin`), providing edge safety while maximizing viewport area for high-resolution vertical photo cards.
- **Stacking & Flow:** Content within profiles flows down a single columnar structure with consistent `12px` to `16px` gaps (`space-md`) between discrete prompt cards and interest modules.
- **Action Safe Zones:** Critical interactive triggers (swipe rejection, super like, instant match message) are grouped in a pinned floating bar anchored `16px` to `24px` above the native gesture indicator.
- **Tablet & Large Screen Adaptation:** When rendered on tablets or responsive previews, content does not stretch indefinitely; instead, it constrains to a centered fixed container width of `440px` to maintain optimal aspect ratios for vertical profile media.

## Elevation & Depth

This design system avoids complex multi-stop drop shadows, deep blurs, and glassmorphism in favor of a clean, flat, layered surface hierarchy:

- **Flat Surface Separation:** Separation between layers is predominantly achieved through solid tonal contrast (e.g., placing `#FFFFFF` cards over the `#F2F2F7` neutral background) or fine structural hairline dividers (`1px` solid `#E5E5EA`).
- **Tactile Floating Depth:** When an element must float above interactive content (such as active swipe cards, action buttons, or bottom sheets), it employs an ultra-subtle, warm ambient shadow:
  - `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06)`
- **Modal & Sheet Overlays:** Overlays utilize a flat, non-blurred backdrop fill of `rgba(28, 28, 30, 0.4)` to focus visual attention strictly on the active card or sheet without heavy computational strain.

## Shapes

The shape vocabulary is friendly, ergonomic, and intentionally tiered based on component function:

- **Profile & Content Cards:** Structured with `16px` corner rounding (`rounded-2xl`). This softens media cards while preserving structured screen space.
- **Interactive Buttons:** Primary actions, floating reaction controls, and utility buttons use continuous full pill curves (`rounded-full` / `24px+`) to invite touch and reinforce the friendly demeanor.
- **Tags, Badges & Chips:** Compact descriptors (lifestyle tags, astrology, prompts, match counters) feature a consistent `12px` corner radius.
- **Input Fields:** Form controls and chat text fields mirror the card language with `12px` to `16px` outer rounding.

## Components

### Buttons

- **Primary Action (Pill):** Height `48px` or `54px`, fully rounded (`9999px`), solid `#FF6F61` background, `#FFFFFF` Inter bold text. No gradients.
- **Secondary Action:** Transparent fill, `1.5px` border in `#FF6F61` or `#E5E5EA`, text colored in `#1C1C1E`.
- **Floating Action Controls (Pass / Like / Super Like):** Circular icons (`56px` to `64px`), pure white surface with `0 2px 8px rgba(0,0,0,0.06)` ambient elevation. Icons use `#FF6F61` (Heart/Like) or `#8E8E93` (Dismiss).

### Badges & Chips

- **Lifestyle & Interest Chips:** Background `#FFEAE7`, text `#FF6F61` (`label-md`), `12px` corner radius, `8px 14px` padding.
- **Verification & Status Badges:** Background `#34C759` with crisp white checkmark iconography, or solid white pill with `#34C759` border and text.

### Discovery & Profile Cards

- **Photo Stage:** Base `#FFFFFF` background with `16px` corner radius, overflow hidden. Overlaid textual details use a solid flat scrim or clean white info-drawer directly below the photo frame.
- **Prompt Blocks:** Background `#F8F9FA`, `16px` radius, padding `16px`, containing question label in `#8E8E93` (`label-sm`) and user response in `#1C1C1E` (`body-lg`).

### Form Inputs & Chat Bars

- **Text Inputs:** Solid `#F2F2F7` background, `0` border, `14px` radius, `12px 16px` padding. Placeholder colored `#8E8E93`. Active/focused states transition border to `1.5px` solid `#FF6F61` with clean white background.
- **Chat Bubbles:** Outgoing messages use `#FF6F61` with `#FFFFFF` text; incoming messages use `#F2F2F7` with `#1C1C1E` text. Corners rounded to `18px`, with a reduced `4px` radius on the anchoring tail corner.

### Lists & Matches Row

- **Match Carousel:** Horizontal avatar bubbles (`68px` diameter) with `2px` ring border in `#FF6F61` for new matches, and `#E5E5EA` for viewed profiles.
- **Conversation List:** Height `72px`, white background with `1px` `#F2F2F7` bottom separator, secondary text trimmed with single-line truncation.
