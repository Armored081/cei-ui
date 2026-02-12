# Command Center Redesign — Final Plan

## Context

CEI (Cyber Executive Intelligence) is a security governance platform used by CISOs, security directors, and compliance leads. The Command Center layout is the primary interface — a three-panel split (Activity rail | Conversation | Artifacts panel) that gives security operators a full-spectrum view of their risk posture, compliance gaps, and agent interactions.

This redesign eliminates the Focus and Workspace layouts. **Command Center is the canonical UI.**

---

## Design Direction: **"War Room Precision"**

Think: military command center meets Bloomberg terminal meets Dieter Rams. This is a tool for people who make high-stakes decisions about organizational risk. It should feel **authoritative**, **calm under pressure**, and **information-dense without being cluttered**.

Not playful. Not trendy. Not generic SaaS. This is where a CISO sits at 2am during an incident and trusts what they see.

### Aesthetic Pillars

1. **Quiet Authority** — Dark, low-contrast surfaces with sharp accent moments. The interface whispers competence.
2. **Typographic Hierarchy** — Information density managed through font weight and scale, not color noise.
3. **Surgical Accents** — One dominant accent color used sparingly. When something glows, it matters.
4. **Texture Over Flatness** — Subtle noise grain on surfaces. Micro-shadows that create depth without gradients.

---

## Color Palette (Revised)

Moving away from the current blue-heavy palette to something more refined and less "generic dashboard":

```css
:root {
  /* Surfaces — warm-tinted darks instead of pure cold blue */
  --bg-primary: #0a0e14; /* Near-black with warm undertone */
  --bg-secondary: #10151e; /* Slightly elevated surface */
  --bg-panel: #141a26; /* Card/panel backgrounds */
  --bg-panel-muted: #0e1219; /* Recessed areas */
  --bg-elevated: #1a2233; /* Hover states, active items */

  /* Text — high contrast primary, restrained secondary */
  --text-primary: #e8ecf4; /* Slightly warm white */
  --text-muted: #7a8a9f; /* Adjusted up for contrast (was #6b7a90) */
  --text-dim: #4d5a6c; /* Adjusted up for contrast (was #3d4a5c) */

  /* Accent — amber for primary actions, darker orange for warnings */
  --accent: #e5a530; /* Primary accent — warm amber */
  --accent-hover: #f0b840; /* Hover state */
  --accent-subtle: rgba(229, 165, 48, 0.12); /* Subtle glow behind accent elements */
  --accent-strong: #5ce0b8; /* Secondary accent — muted teal for success states */

  /* Borders — barely visible, structural not decorative */
  --border: rgba(140, 160, 190, 0.1);
  --border-strong: rgba(140, 160, 190, 0.2);

  /* Status — REVISED: warning is distinct from accent */
  --danger: #e85c6f;
  --warning: #e89040; /* Deeper orange, not same as accent */
  --success: #5ce0b8;

  /* Charts — muted but distinguishable series */
  --chart-series-1: #e5a530;
  --chart-series-2: #5ce0b8;
  --chart-series-3: #7c93c4;
  --chart-series-4: #c97dd6;
  --chart-grid: rgba(120, 140, 170, 0.12);

  /* Severity — the only place we use high-saturation color */
  --severity-critical: #e85c6f;
  --severity-high: #e89040;
  --severity-medium: #e5a530;
  --severity-low: #5ce0b8;

  /* Table */
  --table-header-bg: rgba(20, 26, 38, 0.85);
  --table-header-text: #8a96aa;
  --table-border: rgba(120, 140, 170, 0.12);

  /* Contrast targets (documented for reference) */
  /* Body text on bg-primary: 14:1 minimum */
  /* Small labels on bg-panel: 7:1 minimum */
  /* Dim text on bg-panel: 4.5:1 minimum */
}
```

**Revision notes:**

- `--text-muted` and `--text-dim` adjusted up for better contrast on dark surfaces
- `--warning` is now distinct from `--accent` — deeper orange for semantic clarity
- Contrast targets documented as CSS comments

---

## Typography (Revised)

**Primary pairing:** DM Sans (body) + JetBrains Mono (selective accents)

### Font Stack

- **Display / Headings:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — Clean geometric sans with slightly humanist touches. Used for MOST headers, nav, button labels. **Reduced mono usage per Codex feedback.**
- **Body / UI:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — Same font for visual cohesion, different weights for hierarchy.
- **Mono / Data:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — Used ONLY for: wordmark "CEI", timestamps, numeric data (tables, scores), and selective technical labels.

```css
:root {
  --font-display: 'DM Sans', 'Helvetica Neue', sans-serif;
  --font-body: 'DM Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

**Font loading strategy:**

```html
<!-- In index.html or CSS @import -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
  rel="stylesheet"
/>
```

### Type Scale

| Role            | Font    | Size | Weight | Tracking          |
| --------------- | ------- | ---- | ------ | ----------------- |
| Wordmark "CEI"  | Mono    | 15px | 700    | 0.16em            |
| Rail titles     | Display | 11px | 600    | 0.12em, uppercase |
| Section headers | Display | 14px | 600    | 0.02em            |
| Body text       | Body    | 14px | 400    | 0                 |
| Small labels    | Body    | 12px | 500    | 0.02em            |
| Timestamps      | Mono    | 11px | 400    | 0                 |
| Button text     | Body    | 13px | 600    | 0.02em            |
| Numeric data    | Mono    | 13px | 400    | 0                 |

**Rationale:** DM Sans for authority + readability, Mono reserved for technical precision. Avoids "developer tool" aesthetic while maintaining credibility.

---

## Structural Changes

### 1. Remove Layout Switcher + Other Layouts

- Delete `Focus.tsx`, `Workspace.tsx`, `LayoutSwitcher.tsx`, and associated CSS
- `ChatPage.tsx` renders `CommandCenter` directly (no switcher)
- Remove layout switcher buttons from `TopBar`
- Remove `LayoutId` type, `onChangeLayout` prop chain
- Remove `localStorage` layout preference logic
- Delete `ResizableSplit.tsx` + CSS (only used by Workspace)

### 2. Docked Composer (Revised Implementation)

**Current problem:** The composer sits in the CSS grid flow and gets pushed down as messages fill the conversation area.

**Fix:** The composer must be **anchored to the bottom** of the center column, never moving, with dynamic height measurement.

**Implementation approach (per Codex feedback):**

1. **Composer stays in normal flow** (not `position: fixed`), but enforces bottom anchoring via:
   - `.cei-cc-center` remains `display: grid; grid-template-rows: auto 1fr auto;`
   - Message list is row 2 (scrollable)
   - Composer is row 3 (sticky to bottom of parent)

2. **Use ResizeObserver to measure composer height dynamically:**

   ```tsx
   useEffect(() => {
     if (!composerRef.current) return

     const observer = new ResizeObserver((entries) => {
       const height = entries[0].contentRect.height
       document.documentElement.style.setProperty('--composer-height', `${height}px`)
     })

     observer.observe(composerRef.current)
     return () => observer.disconnect()
   }, [])
   ```

3. **Message list padding:**

   ```css
   .cei-cc-center .cei-message-list {
     padding-bottom: calc(var(--composer-height) + var(--space-3));
   }
   ```

4. **Mobile keyboard safe area:**
   ```css
   .cei-composer-v-full {
     padding-bottom: env(safe-area-inset-bottom);
   }
   ```

**Composer behavior:**

- Textarea starts at **1 row** (approx 40px height)
- **Auto-grows upward** as user types via:
  ```tsx
  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`
    onDraftMessageChange(textarea.value)
  }
  ```
- Maximum height: **160px** (roughly 6 lines)
- Beyond max-height: textarea scrolls internally
- `resize: none` — growth is automatic only via content
- Attachment previews and error states expand the composer container (included in ResizeObserver measurement)

### 3. Smaller "New Thread" Button

Current: Full-width secondary button below the composer.

**New:** Compact icon+text button in the composer actions row:

```
┌────────────────────────────────────────────────────────┐
│ [ 📎 ]  [ Message the agent..._____________ ]  [ ⟳ ]  [ ▶ ] │
│                                                New     Send │
│                                                Thread       │
└────────────────────────────────────────────────────────┘
```

- Small pill shape: `padding: 4px 12px`, `font-size: 11px`
- Icon (⟳) + text "New Thread" on desktop
- Muted color until hover: `color: var(--text-dim)` → `var(--text-muted)` on hover
- Mobile: Icon-only with `aria-label="New Thread"` + larger hit target (44x44px minimum)

### 4. TopBar Simplification

With layout switcher removed, the top bar becomes cleaner:

```
[ ◆ CEI ]  [ Chat ]  [ Assessments ]                    [ user@co ▾ ] [ Sign out ]
```

- Wordmark: JetBrains Mono, 15px, bold, amber accent color
- The `◆` icon becomes an amber diamond (or SVG equivalent)
- Nav links use DM Sans, subtle underline on active

### 5. Surface Texture (Revised)

Add a very subtle noise grain overlay to the `--bg-primary` surface:

**Revised approach (per Codex feedback):**

```css
.cei-cc-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1; /* Low, not 9999 — sits above shell bg, below all content */
  opacity: 0.03;
  background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='1'/></svg>");
  mix-blend-mode: overlay;
}
```

**Notes:**

- Low z-index (1) prevents layering conflicts with modals/drawers
- Opacity at 0.03 for extreme subtlety
- Creates tactile depth without performance cost

### 6. Artifact Expansion — Slide-Over Overlay (New)

**Current problem:** Clicking an artifact replaces the artifact card list with the expanded view _inside_ the 360px right rail. Charts and tables are crammed into 360px — nearly all are unreadably narrow. There's also no obvious "back to list" navigation; just a small `×` button.

**Fix:** Artifact expansion uses a **wide slide-over overlay** that opens on top of the main content area, giving artifacts the space they need.

**Behavior:**

```
┌──────────────────────────────────────────────────┐
│  TopBar                                           │
├──────────┬───────────────────────┬────────────────┤
│ Activity │                       │  Artifacts     │
│ Rail     │  ╔═══════════════╗    │  (card list    │
│          │  ║  ARTIFACT     ║    │   stays        │
│          │  ║  SLIDE-OVER   ║    │   visible      │
│          │  ║  (70% width)  ║    │   underneath   │
│          │  ║               ║    │   with          │
│          │  ║  Full-size    ║    │   selected     │
│          │  ║  chart/table  ║    │   card         │
│          │  ║  renders      ║    │   highlighted) │
│          │  ║  here         ║    │                │
│          │  ║               ║    │                │
│          │  ║  [← Back]     ║    │                │
│          │  ║  [JSON] [CSV] ║    │                │
│          │  ╚═══════════════╝    │                │
├──────────┴───────────────────────┴────────────────┤
│  Composer (docked)                                 │
└──────────────────────────────────────────────────┘
```

**Implementation:**

- Reuse existing `SlideOver` component with `width="70vw"` (or `min(900px, 80vw)`)
- Slide-over opens from the right, overlaying the conversation + artifacts panels
- Dark scrim behind slide-over (existing `SlideOver` behavior)
- Artifact card list in the right rail stays visible with the selected card highlighted (amber left-border)
- Click another card in the rail → slide-over updates to show that artifact
- Click scrim or press Escape → close slide-over, return to normal view

**Navigation within slide-over:**

- **Header row:** `← Back to Artifacts` text button (left-aligned) + `JSON` / `CSV` download buttons + `×` close (right-aligned)
- `← Back` closes the slide-over (same as `×` but more discoverable)
- Keyboard: Escape closes, Tab cycles through controls

**Artifact body:**

- Full-width rendering of chart/table/recommendation block
- Charts get proper width to render multiple series, legends, axis labels
- Tables get horizontal scroll if needed
- Recommendations render at comfortable reading width with proper padding

**Mobile (<1024px):**

- Use existing `SlideUpDrawer` at `maxHeight="85vh"` (already in CommandCenter.tsx)
- Same `← Back` header pattern

### 7. Rail Refinements

**Activity Rail (left):**

- Tool log entries get a subtle left-border accent (2px amber) when they're the most recent/active
- Collapsed state: thin 4px strip with a subtle amber vertical line, not a full button
- Status dots:
  - In-progress: tiny pulsing amber dot (single 400ms pulse on entry, not continuous)
  - Complete: static teal dot
  - Idle: dim gray dot

**Artifacts Rail (right):**

- Cards get a micro-shadow lift on hover (2px Y, 8px blur, low opacity)
- **Selected artifact card** (when slide-over is open) gets an amber left-border accent (3px)
- Thumbnail previews for charts (existing behavior, just style refinement)
- Card list is ALWAYS visible — never replaced by expanded content

### 8. Micro-Interactions (Revised)

**All animations gated by `@media (prefers-reduced-motion: reduce)`:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Default motion (when motion is allowed):**

- **Message appear:** `opacity 0→1` + `translateY(4px→0)` over 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
- **Tool log pulse:** Single 400ms amber glow on entry (not continuous pulse)
- **Rail collapse:** Smooth 250ms width transition
- **Composer focus:** Subtle amber border glow (`box-shadow: 0 0 0 1px var(--accent-subtle)`)
- **Send button:** Scale 95% on mousedown, spring back on mouseup (100ms each)

**Timing tokens:**

```css
--motion-duration-fast: 100ms;
--motion-duration-base: 200ms;
--motion-duration-slow: 300ms;
--motion-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

---

## Accessibility Contract

### Focus Visibility

- All interactive elements show visible focus ring: `outline: 2px solid var(--accent); outline-offset: 2px`
- Focus ring uses amber accent for consistency with brand
- Keyboard users can reach all controls (rail collapse, artifact cards, pill links, composer controls)

### Contrast Targets

- Body text on `--bg-primary`: **14:1 minimum** (WCAG AAA)
- Small labels on `--bg-panel`: **7:1 minimum** (WCAG AAA for small text)
- Dim metadata text: **4.5:1 minimum** (WCAG AA)

### Semantic Color

- Status is NEVER color-only:
  - Severity chips include text label ("Critical", "High", etc.)
  - Tool log status includes icon + label, not just colored dot
  - Error states include icon + descriptive text
  - Chart legends include text labels for all series

### Aria Labels

- Icon-only controls (paperclip, send, new thread when icon-only) have `aria-label`
- Rail collapse/expand buttons have `aria-label="Collapse activity rail"` etc.
- Status indicators have `aria-live="polite"` for dynamic updates

---

## Files Changed

| File                                    | Action           | Notes                                                                 |
| --------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `src/theme/tokens.css`                  | Modify           | New color palette, fonts, motion tokens, contrast docs                |
| `src/index.css`                         | Modify           | Add Google Font imports, noise texture, reduced-motion                |
| `src/layouts/CommandCenter.tsx`         | Modify           | Remove layout switcher props, add ResizeObserver for composer         |
| `src/layouts/layout-command-center.css` | Modify           | Composer anchoring, rail refinements, transitions, reduced-motion     |
| `src/primitives/Composer.tsx`           | Modify           | Auto-grow textarea, integrated New Thread, ResizeObserver ref         |
| `src/primitives/composer.css`           | Modify           | Anchored styles, auto-grow, smaller New Thread, safe-area             |
| `src/primitives/TopBar.tsx`             | Modify           | Remove layout switcher, simplify                                      |
| `src/primitives/top-bar.css`            | Modify           | Amber wordmark, simplified layout                                     |
| `src/primitives/MessageList.tsx`        | Modify           | Entry animations, reduced-motion                                      |
| `src/primitives/message-list.css`       | Modify           | Fade-in transitions, padding-bottom variable                          |
| `src/primitives/ToolLogEntry.tsx`       | Modify           | Status dots, active indicator, single-pulse animation                 |
| `src/primitives/tool-log-entry.css`     | Modify           | Amber accents, pulse animation, reduced-motion                        |
| `src/primitives/ArtifactCard.tsx`       | Modify           | Hover shadow, selected state (amber left-border when slide-over open) |
| `src/primitives/artifact-card.css`      | Modify           | Micro-shadow, amber border accent, selected state styles              |
| `src/primitives/ArtifactExpanded.tsx`   | Modify           | Add "← Back to Artifacts" button, render inside SlideOver             |
| `src/primitives/artifact-expanded.css`  | Modify           | Full-width layout, proper padding for wide rendering                  |
| `src/layouts/CommandCenter.tsx`         | (already listed) | Wire artifact expansion to SlideOver instead of inline replacement    |
| `src/components/ChatPage.tsx`           | Modify           | Render CommandCenter directly                                         |
| `src/components/ChatPage.test.tsx`      | Modify           | Remove layout preference tests                                        |
| `src/layouts/layout-shell-css.test.ts`  | Modify           | Remove Focus CSS assertions                                           |
| **Deleted files:**                      |                  |                                                                       |
| `src/layouts/Focus.tsx`                 | **Delete**       |                                                                       |
| `src/layouts/Workspace.tsx`             | **Delete**       |                                                                       |
| `src/layouts/LayoutSwitcher.tsx`        | **Delete**       |                                                                       |
| `src/layouts/layout-focus.css`          | **Delete**       |                                                                       |
| `src/layouts/layout-workspace.css`      | **Delete**       |                                                                       |
| `src/layouts/types.ts`                  | **Delete**       | (or simplify if needed elsewhere)                                     |
| `src/primitives/ResizableSplit.tsx`     | **Delete**       | Only used by Workspace                                                |
| `src/primitives/resizable-split.css`    | **Delete**       |                                                                       |

---

## Test Changes Required

### Prop Updates

- Remove `activeLayout`, `onChangeLayout` from all components that receive them
- Update `TopBar.test.tsx` if it exists to remove layout switcher tests
- Update `ChatPage.test.tsx` to remove localStorage layout preference tests

### New Test Coverage

- Composer auto-resize behavior (grows to max, then scrolls)
- ResizeObserver composer height measurement
- New Thread button accessibility (aria-label when icon-only)
- Focus ring visibility on all interactive elements
- Reduced-motion media query disables animations

---

## What Stays Untouched

- All business logic in `useChatEngine.ts`
- Structured output rendering (charts, tables, recommendations)
- Authentication flow
- Assessment pages
- Agent client / streaming infrastructure
- Mobile responsive behavior (slide-over, slide-up-drawer still used on <1024px)

---

## Future Enhancements (Not Required for V1)

These are good ideas from Codex review but can be deferred:

1. **Incident-mode signaling** — Global state treatment for high-severity/active-incident context (banner, mode strip)
2. **Information density controls** — Adjustable density presets (comfortable/compact) for different operator preferences
3. **Signature visual motif** — Distinctive rail marker language or command-line-inspired temporal element

---

## Success Criteria

1. ✅ Command Center is the only layout. No switcher visible.
2. ✅ Composer is permanently anchored at bottom, grows upward, maxes at ~160px, then scrolls.
3. ✅ "New Thread" is a small icon-pill in the composer actions row.
4. ✅ Color palette feels distinct — amber on near-black, not "another blue dashboard."
5. ✅ Typography is crisp and hierarchical — DM Sans for most UI, JetBrains Mono for selective technical elements.
6. ✅ Subtle noise grain texture adds depth without layering conflicts.
7. ✅ All animations respect `prefers-reduced-motion`.
8. ✅ Focus rings are visible and accessible.
9. ✅ Status is never color-only (includes text/icons).
10. ✅ All existing tests pass after prop updates and deleted layout tests are removed.
11. ✅ No regressions in structured output rendering.

---

## Implementation Notes

- **Font self-hosting:** Consider self-hosting DM Sans + JetBrains Mono for faster load and offline resilience. Use `font-display: swap` if using Google Fonts.
- **Composer scroll intent:** Integrate ResizeObserver height changes with existing autoscroll logic in `useChatEngine.ts` to prevent jump/jank when composer grows.
- **Test coverage:** Add explicit tests for composer auto-resize, focus rings, and reduced-motion fallbacks.
