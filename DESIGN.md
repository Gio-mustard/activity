---
name: Vibrant Academic Flat
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored for an interactive team dynamics and gamified quiz platform used in university-level software engineering courses. The brand balances scholastic rigor with playful, live classroom engagement. 

### Brand Personality & Emotional Targets
- **Energetic & Focused:** Encourages swift problem-solving and spirited collaboration without feeling childish or distracting.
- **Definitive & Legible:** Presents high-stakes live quiz countdowns, code snippets, and team rankings with maximum visual clarity under classroom projection or personal device conditions.
- **Meritocratic & Dynamic:** Celebrates correct answers and agile team performance using unmistakable, high-contrast visual signifiers.

### Visual Style
The system adopts an authentic **Modern Flat** aesthetic:
- **Zero Gradient & Skeuomorphic Noise:** Pure, vibrant solid fills without simulated depth, bevels, or inner glows.
- **Crisp Structural Outlines:** Clean, high-contrast borders (1.5px to 2px) to define cards and interactive surfaces against background canvas.
- **Dimensionality via Geometry:** Depth is achieved through flat layered panels, sharp structural grouping, and color-blocked team tags rather than blur-heavy shadows.

## Colors

The palette is engineered for instantaneous state recognition during timed quizzes, live team status updates, and code reviews.

### Core Functional Colors
- **Primary (`#4F46E5` - Deep Indigo):** The dominant action color for primary navigational triggers, session launch controls, and core system states.
- **Secondary / Success (`#10B981` - Mint Emerald):** Conveys validated logic, correct quiz responses, positive score deltas, and live connection status.
- **Warning / Attention (`#F59E0B` - Vibrant Amber):** Used for countdown timers under 10 seconds, pending team submissions, and partial credit alerts.
- **Danger / Penalty (`#EF4444` - Coral Crimson):** Denotes incorrect code evaluation, expired countdowns, penalties, or team disconnection.
- **Canvas & Neutral Base (`#0F172A` - Slate Dark, `#E2E8F0` - Slate Border, `#F8FAFC` - Canvas Light):** High-contrast neutral structure ensuring complete readability across ambient classroom lighting conditions.

### Team Accent Tokens
For live team challenges and breakout rooms, assign these non-overlapping, high-contrast solid colors:
- **Team Blue:** `#3B82F6`
- **Team Emerald:** `#10B981`
- **Team Violet:** `#8B5CF6`
- **Team Amber:** `#F59E0B`

Always maintain WCAG AAA compliance for text overlaid on team badges by using `#FFFFFF` on Blue, Emerald, Violet, and Indigo, and `#0F172A` on Amber.

## Typography

The design system uses **Plus Jakarta Sans** uniformly across all UI surfaces. Its contemporary geometric proportions ensure instant readability during rapid countdowns, team leaderboards, and code questions.

### Typographic Hierarchy Rules
- **Countdown & Scores (`headline-xl`):** Set in extra-bold for instant peripheral vision tracking during high-speed quiz sessions.
- **Questions & Section Headings (`headline-lg`, `headline-md`):** High weight and tight tracking keep questions punchy and prominent.
- **Question Body & Code Prompts (`body-lg`, `body-md`):** Balanced line heights avoid cognitive fatigue when reading complex architectural scenarios.
- **Status Tags & Pill Badges (`label-sm`, `label-md`):** Rendered with a bold weight and uppercase letterforms when indicating dynamic states like `LIVE`, `SYNCED`, or `LOCKED`.

## Layout & Spacing

The layout is built around a responsive 12-column fluid grid designed for dual contexts: synchronized classroom projection and responsive student mobile devices.

### Breakpoints & Adaptive Logic
- **Mobile (< 768px):** 4-column layout. Quiz options stack vertically as 1-column items. Margins contract to `1rem` to maximize touch target area for answer submissions.
- **Tablet (768px - 1024px):** 8-column layout. 2x2 grid for multiple-choice quiz questions and side-by-side team telemetry panels.
- **Desktop / Projector (> 1024px):** 12-column layout. A 9-column live question stage paired with a 3-column sticky leaderboard and team status feed.

### Rhythm & Alignment
Spacing follows an exact 4px/8px incremental scale. Element gaps inside interactive components (e.g., question option cards) utilize `space-md`, while major screen regions and team groupings separate via `space-xl`.

## Elevation & Depth

True to modern flat design principles, visual hierarchy is established without blurred drop shadows, ambient glows, or gradient bevels.

### Hierarchy Techniques
1. **Solid Flat Borders:** Elevation levels are signaled through border weight and contrast. Resting containers use a solid `1.5px` border in `#E2E8F0`. Hovered or interactive cards elevate their border to `2px` in `#4F46E5`.
2. **Solid Offset Drop (Hard Shadow):** For dynamic interactive triggers (e.g., selectable answer cards, buzzer buttons), a hard, unblurred `2px` to `4px` offset in `#0F172A` creates tactile depth while maintaining a strictly flat aesthetic.
3. **Flat Color Blocking:** Priority content uses solid background fills in `#FFFFFF` sitting directly upon `#F8FAFC` canvas, framed cleanly by slate dividing rules.
4. **Active Selection Tiers:** Selected answer options switch from a white fill to a solid, low-tint background (e.g., Indigo-50 `#EEF2FF`) accompanied by an immediate `2px` solid `#4F46E5` stroke.

## Shapes

The geometric personality is defined by balanced, rounded rectangles that soften the precision of engineering topics while avoiding cartoonish extremes.

### Shape Hierarchy
- **Standard Surfaces (Cards, Modals, Panels):** Configured at Level 2 (`0.5rem` / `8px` base, scaling to `1rem` / `16px` on larger quiz panels). This creates clear containment boundaries without visually overwhelming code blocks.
- **Pill Badges & Indicators:** Hard-locked to full pill radii (`9999px`) for team badges, dynamic score pills, countdown tickers, and user role markers.
- **Input Fields & Action Controls:** Uniform `0.5rem` (`rounded-md`) corners to maintain consistency with interactive quiz tiles.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` fill, `#FFFFFF` text, `0.5rem` border radius, no shadow. Active state triggers a flat 2px vertical offset mimicking a physical press.
- **Secondary / Outline:** `#FFFFFF` fill with a `2px` solid `#E2E8F0` border and `#0F172A` text. Hover transitions border to `#4F46E5`.
- **Destructive:** Solid `#EF4444` fill, `#FFFFFF` text. Used for leaving sessions, disqualifying, or resetting boards.

### Chips & Pill Badges
- **Team Identity Badges:** Compact pill shape (`rounded-full`), padded `0.25rem 0.75rem`. Solid team fill (Blue, Emerald, Violet, Amber) with high-contrast text and a left-aligned status dot indicating live presence.
- **Timer & Score Pills:** White container with `1.5px` solid `#0F172A` border displaying mono-spaced numbers for jitter-free score adjustments.

### Quiz Cards & Answer Selectors
- **Default State:** Pure white background, `1.5px` border in `#E2E8F0`, `1rem` padding. Includes an oversized, bold keyboard shortcut / option letter (A, B, C, D) enclosed in a `rounded-md` solid slate badge.
- **Selected State:** Border turns `2px` solid `#4F46E5`, background shifts to `#EEF2FF`.
- **Validation State (Revealed):** Correct answers instantly turn `#10B981` border with `#ECFDF5` background. Incorrect options switch to `#EF4444` border with `#FEF2F2` background.

### Checkboxes & Radio Controls
- Flat `20px` geometric squares (`rounded-sm`) and circles.
- Unchecked: White fill with `2px` solid `#CBD5E1` border.
- Checked: Solid `#4F46E5` fill with crisp white checkmark/dot. Zero gradient.

### Input Fields (Code & Text Entry)
- Flat white surface with crisp `1.5px` `#CBD5E1` border. Focus state replaces border with `2px` solid `#4F46E5` with zero focus glow, preserving raw edge fidelity.

### Real-Time Moderation HUD
- **Live Leaderboard Row:** Compact list item with solid `1px` `#E2E8F0` dividing border, dynamic place badge (`1st`, `2nd`, `3rd`), team pill, and live score counter with immediate green/red flash indicators for incoming points.
- **Buzzer Component:** Oversized circular or broad flat rectangular trigger with a `4px` hard solid offset shadow, snapping downward 4px when pressed.