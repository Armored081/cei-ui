# Command Center Redesign Plan

## Context

CEI (Cyber Executive Intelligence) is a **risk and compliance agent platform** — not a chatbot, not a dashboard, not a SaaS tool with AI bolted on. It is an autonomous agent that CISOs, security directors, and compliance leads delegate governance work to. The Command Center is its primary interface — a three-panel mission control (Thread Nav | Conversation | Artifacts + Activity) that gives security operators oversight and control of an agent that _acts_ on their behalf.

Adam has chosen Command Center as **the** layout. Focus and Workspace are being eliminated.

### Where This Is Going (Agent Roadmap Context)

The UI must be grounded in where CEI is heading, not just where it is today. Near-term agent capabilities that will shape UI requirements:

- **Recommendation → Draft Implementation:** The agent will push recommendations as **draft/unapproved records** into systems of record via APIs (CMDBs, IAM platforms, SIEM configs, endpoint management). Approval and execution happen in those systems' existing workflows. The UI shows what the agent proposed and reads back status from the source system.
- **Finding → Draft Remediation:** Compliance findings generate remediation actions as **drafts** in source systems (draft firewall rules, proposed policy changes, staged access revocations). The source system's change management handles approval, execution, and rollback.
- **Change Ticket Automation:** The agent will create **draft change tickets** (ServiceNow, Jira, etc.) pre-populated with context from its analysis. The UI surfaces ticket references with deep links back to the source system.
- **Process Impact Prototyping:** Before proposing changes, the agent will model the impact — what breaks, what improves, what cost changes. The UI presents before/after comparisons and impact simulations as rich artifacts. This is fully CEI-owned analytical output.

**Design implication:** CEI is a **governance layer**, not a workflow engine. The agent reads from and writes drafts into systems of record. Approval workflows, execution tracking, rollback, and audit trails belong to those systems. Agent observability (what the agent did, when, why) is handled by **AgentCore Observability**. The CEI UI shows what the agent analyzed, what it proposed, where it pushed drafts, and reads back current status — but never owns the action lifecycle.

## Design Direction: **"War Room Precision"**

Think: military command center meets Bloomberg terminal meets Dieter Rams. This is where a CISO oversees an autonomous agent making real changes to their security posture. It should feel **authoritative**, **calm under pressure**, and **information-dense without being cluttered**.

Not playful. Not trendy. Not a chatbot with a pretty skin. This is mission control for an agent that analyzes risk posture and pushes draft changes into systems of record — and the operator needs to trust what they see, understand what the agent proposed, and follow through in the source systems.

### Aesthetic Pillars

1. **Quiet Authority** — Dark, low-contrast surfaces with sharp accent moments. The interface whispers competence.
2. **Typographic Hierarchy** — Information density managed through font weight and scale, not color noise.
3. **Surgical Accents** — One dominant accent color used sparingly. When something glows, it matters.
4. **Texture Over Flatness** — Subtle noise grain on surfaces. Micro-shadows that create depth without gradients.

---

## Architecture: Unified Artifact Model

### The Core Insight

**There is no Chat vs. Assessments distinction.** Everything the agent produces is an **artifact** — charts, tables, recommendations, and assessments. The conversation is the control surface; artifacts are the output.

This eliminates the Chat/Assessments toggle in the TopBar entirely. Assessments become a rich artifact type that can be expanded to full-screen, just like any other artifact.

### Artifact Zoom Levels (Inspired by Datadog/Grafana)

Three zoom levels, progressive disclosure:

1. **Inline** — Artifact cards in the right panel (current behavior). Compact previews with sparklines, severity distributions, status badges.
2. **Expanded** — Click an artifact card → it takes over center+right columns as an overlay. Chat dims behind it (60% dark overlay, still visible). Think Grafana's resizable trace drawer.
3. **Full-screen** — Hit expand icon (or double-click) → artifact fills the entire viewport with its own toolbar. `Esc` or back arrow returns to previous zoom level.

```
Normal:                          Expanded:                       Full-screen:
┌────┬──────────┬──────┐        ┌────┬───────────────────┐      ┌─────────────────────────┐
│Rail│ Chat     │Artif.│        │Rail│ ◀ Assessment A-12 │      │ ◀ Assessment A-12    ⛶  │
│    │          │      │   →    │    │                   │  →   │                         │
│    │          │[card]│        │    │ [full artifact    │      │ [full artifact content  │
│    │          │[card]│        │    │  with tabs/sections│      │  with maximum space]    │
│    │ Composer │      │        │    │  and drill-down]  │      │                         │
└────┴──────────┴──────┘        └────┴───────────────────┘      └─────────────────────────┘
```

### Artifact Type Registry

Each artifact type defines its own rendering at each zoom level:

| Artifact Type  | Inline Card           | Expanded View                  | Full-screen                   |
| -------------- | --------------------- | ------------------------------ | ----------------------------- |
| Chart          | Thumbnail + sparkline | Interactive chart              | Chart + data table + export   |
| Table          | Row count + preview   | Full scrollable table          | Table + filters + CSV export  |
| Recommendation | Title + severity      | Full text + citations          | Multi-rec comparison          |
| **Assessment** | Title + status badge  | Full assessment w/ section nav | Complete report view w/ print |

### What This Kills

- ❌ `Chat` / `Assessments` toggle in TopBar
- ❌ Separate assessment list page / route
- ❌ The concept of "modes" — there's just the conversation and its artifacts

### What This Adds

- ✅ Artifact zoom levels (inline → expanded → full-screen)
- ✅ Artifact type registry — each type defines its own expanded/full-screen renderer
- ✅ Breadcrumb navigation in expanded/full-screen views
- ✅ Keyboard shortcuts: `Esc` to step back one zoom level, `f` to toggle full-screen
- ✅ Transition animations: smooth panel expansion (not jarring page swap)

### Depth Tricks (from Datadog/Grafana patterns)

- **Panel header with context toolbar** — when expanded, show artifact-specific actions (export, share, refresh, time range selector for assessments)
- **Background dim** — expanded artifact gets 60% dark overlay on chat behind it (still visible, clearly "behind")
- **Grid snapping** — in full-screen, complex artifacts (assessments) can have their own internal grid layout (summary cards at top, detailed findings below)
- **Sparkline previews** — inline cards show tiny sparklines or severity distributions, not just text
- **Status ring** — assessment cards get a circular progress indicator around their icon

---

## Color Palette

Moving away from the current blue-heavy palette to something more refined:

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
  --text-muted: #6b7a90; /* Deliberate low-contrast for secondary info */
  --text-dim: #3d4a5c; /* Timestamps, metadata */

  /* Accent — amber/gold (stands out against dark surfaces) */
  --accent: #e5a530; /* Primary accent — warm amber */
  --accent-hover: #f0b840; /* Hover state */
  --accent-subtle: rgba(229, 165, 48, 0.12); /* Subtle glow behind accent elements */
  --accent-strong: #5ce0b8; /* Secondary accent — muted teal for success states */

  /* Borders — barely visible, structural not decorative */
  --border: rgba(140, 160, 190, 0.1);
  --border-strong: rgba(140, 160, 190, 0.2);

  /* Status — WARNING is NOT the same as accent (design review fix) */
  --danger: #e85c6f;
  --warning: #d4882a; /* Deeper orange-amber, distinguishable from accent */
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
}
```

### Why Amber?

- Blue accent on blue background = visual mud. Everything blends.
- Amber/gold on near-black = instant focal point. The eye knows where to look.
- Carries connotations of alertness, priority, intelligence (think radar screens, caution indicators).
- Teal as secondary accent provides temperature contrast for positive states.

### Contrast Targets (from design review)

- `--text-primary` on `--bg-primary`: minimum 7:1 (WCAG AAA)
- `--text-muted` on `--bg-primary`: minimum 4.5:1 (WCAG AA)
- `--text-dim` on `--bg-primary`: minimum 3:1 (WCAG AA large text) — used only for non-essential metadata
- **Status is never color-only** — always paired with icon, shape, or text label

### Accent Usage Budget

To preserve "surgical accents" and avoid amber overload:

- **TopBar**: Wordmark only (1 element)
- **Rails**: Active item border + status dots (max 2-3 elements visible)
- **Center**: Composer focus glow, send button (interaction-only)
- **Artifacts**: Selected card border (1 element)

---

## Typography

**Drop Space Grotesk.** It's becoming the "AI app default font."

### Font Stack

- **Display / Headings:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — Clean geometric sans for most headings and UI labels (design review: constrain mono to code/data only)
- **Body / UI:** DM Sans — Message text, labels, buttons
- **Code / Data / Timestamps:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — Monospaced for the CEI wordmark, numeric data, timestamps, code blocks, metrics

```css
:root {
  --font-display: 'DM Sans', 'Helvetica Neue', sans-serif;
  --font-body: 'DM Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Type Scale

| Role            | Font    | Size | Weight | Tracking          |
| --------------- | ------- | ---- | ------ | ----------------- |
| Wordmark "CEI"  | Mono    | 15px | 700    | 0.16em            |
| Rail titles     | Body    | 11px | 600    | 0.12em, uppercase |
| Section headers | Display | 13px | 600    | 0.04em            |
| Body text       | Body    | 14px | 400    | 0                 |
| Small labels    | Body    | 12px | 500    | 0.02em            |
| Timestamps      | Mono    | 11px | 400    | 0                 |
| Button text     | Body    | 13px | 600    | 0.02em            |
| Table numbers   | Mono    | 13px | 400    | 0                 |
| Metrics/scores  | Mono    | 14px | 600    | 0                 |

### Font Loading

- Self-host or use `font-display: swap` with fallback metrics
- Define fallback font metrics to minimize layout shift

---

## Structural Changes

### 1. Remove Layout Switcher + Other Layouts

- Delete `Focus.tsx`, `Workspace.tsx`, `LayoutSwitcher.tsx`, and associated CSS
- `ChatPage.tsx` renders `CommandCenter` directly (no switcher)
- Remove layout switcher buttons from `TopBar`
- Remove `LayoutId` type, `onChangeLayout` prop chain
- Remove `localStorage` layout preference logic

### 2. Remove Chat/Assessments Toggle

- Delete assessment list page and its route
- Remove `Chat` / `Assessments` nav links from TopBar
- Assessments now appear as artifact cards in the right panel
- Assessment detail is accessed via artifact expansion (not a separate page)

### 3. TopBar Simplification

With both layout switcher AND nav toggle removed:

```
[ ◆ CEI ]                                               [ user@co ▾ ] [ Sign out ]
```

- Wordmark: JetBrains Mono, 15px, bold, amber accent color
- The `◆` icon becomes an amber diamond
- Clean, minimal — the command center IS the app, no need for navigation

### 4. Docked Composer (Critical UX Fix)

**Current problem:** The composer sits in the CSS grid flow and gets pushed down as messages fill the conversation area.

**Fix:** Measured dock model using ResizeObserver (per design review recommendation):

```
┌─────────────────────────────────────────────────┐
│  TopBar                                          │
├──────────┬──────────────────────┬────────────────┤
│ Activity │  Messages scroll     │  Artifacts     │
│ Rail     │  upward...           │  Panel         │
│          │                      │                │
│          │  ┌──────────────┐    │                │
│          │  │ Older msgs   │    │                │
│          │  │ ...          │    │                │
│          │  │ Latest msg   │    │                │
│          │  └──────────────┘    │                │
│          │                      │                │
│          │  ╔══════════════╗    │                │
│          │  ║  Composer    ║    │                │
│          │  ║  (DOCKED)    ║    │                │
│          │  ╚══════════════╝    │                │
├──────────┴──────────────────────┴────────────────┤
```

**Implementation approach (ResizeObserver model):**

- Composer stays in normal DOM flow at bottom of center column
- `ResizeObserver` on the full composer container (textarea + attachments + errors)
- Pushes `--composer-height` CSS variable to the message scroller
- Message list: `padding-bottom: calc(var(--composer-height) + var(--space-3))`
- Mobile: add `padding-bottom: env(safe-area-inset-bottom)` for safe-area handling

**Composer behavior:**

- Textarea starts at 1 row (~40px)
- Grows upward as user types, max 160px (~6 lines), then scrolls internally
- `resize: none` — growth is automatic via content
- Attachment rows and error states included in ResizeObserver measurement

### 5. Smaller "New Thread" Button

Compact icon+text button in the composer toolbar row:

```
[ 📎 ] [ Message the agent...__________________ ] [ ⟳ ] [ ▶ ]
                                                    ^       ^
                                              New Thread   Send
```

- Small pill: `padding: 4px 10px`, `font-size: 11px`
- Muted → visible on hover (`--text-dim` → `--text-muted`)
- Icon: ⟳ or "+" with `aria-label="New Thread"` + tooltip
- Larger hit target than visual size (min 44×44 touch target)
- Mobile: icon only, text hidden

### 6. Surface Texture

Subtle noise grain overlay on `--bg-primary`:

```css
.cei-cc-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1; /* Low z-index, not 9999 — design review fix */
  opacity: 0.025;
  background-image: url('data:image/svg+xml,...'); /* tiny noise pattern */
  mix-blend-mode: overlay;
}
```

### 7. Rail Refinements

**Activity Rail (left):**

- Tool log entries: subtle 2px amber left-border when most recent/active
- Collapsed state: thin 4px strip with subtle amber line
- Status dots: pulsing amber for in-progress, static teal for complete, dim for idle

**Artifacts Rail (right):**

- Cards: micro-shadow lift on hover (2px Y, 8px blur)
- Selected artifact: amber left-border accent
- Inline previews: sparklines, severity distributions, status rings
- Click behavior: first click selects (shows in panel), second click expands

### 8. Artifact Expansion System

**Expanded overlay (center+right takeover):**

- Triggered by clicking an artifact card
- Activity rail stays visible; center+right columns become the artifact view
- Back button (◀) + breadcrumb in artifact toolbar
- Background: chat content visible but dimmed (60% dark overlay)
- Smooth transition: 250ms slide-in from right

**Full-screen mode:**

- Triggered by expand icon (⛶) in artifact toolbar, or keyboard `f`
- Covers entire viewport below TopBar
- Own toolbar: back, title, type-specific actions (export, print, etc.)
- Complex artifacts (assessments) get internal grid layout
- `Esc` returns to expanded → `Esc` again returns to normal

**Assessment artifact specifics:**

- Internal tab navigation: Summary | Findings | Gaps | Recommendations
- Status badge: draft / in-progress / complete
- Version + timestamp display
- Print-friendly layout in full-screen

### 9. Micro-Interactions

- **Message appear:** 200ms fade-in + `translateY(4px→0)`
- **Tool log pulse:** 400ms amber glow on new high-priority entries (once only)
- **Rail collapse:** 200ms width transition (opacity/transform, not layout-heavy)
- **Composer focus:** amber border glow (`box-shadow: 0 0 0 1px var(--accent-subtle)`)
- **Send button:** 95% scale on click, spring back
- **Artifact expand:** 250ms slide + opacity transition
- **Full-screen enter:** 200ms zoom-in from artifact position

### Accessibility & Motion Contract

- All non-essential animations gated behind `@media (prefers-reduced-motion: reduce)` — reduced to instant or opacity-only
- Focus visibility: clear focus rings on all interactive elements (2px solid `--accent`)
- Keyboard navigation: Tab through rails, artifacts, composer; Enter to expand; Esc to collapse
- Status is never color-only: always icon + shape + text label
- Icon-only buttons always have `aria-label` + tooltip

---

## Implementation Phases

### Phase A: Visual Refresh + Cleanup

- New color palette (tokens.css)
- New fonts (DM Sans + JetBrains Mono)
- Noise grain texture
- Delete Focus, Workspace, LayoutSwitcher, ResizableSplit
- Remove layout switching from ChatPage, TopBar
- Remove Chat/Assessments toggle from TopBar
- Docked composer with ResizeObserver
- New Thread as icon-pill in composer row
- Rail style refinements
- Micro-interactions
- Accessibility + reduced-motion handling
- Fix all broken tests from removed layouts

### Phase B: Artifact Zoom System

- Artifact type registry (interface + implementations)
- Expanded overlay (center+right takeover, back button, breadcrumbs)
- Full-screen mode (viewport takeover, Esc handling)
- Keyboard shortcuts (Esc, f)
- Transition animations
- Sparkline/preview rendering in inline cards

### Phase C: Assessment-as-Artifact Migration

- Assessment artifact type with section navigation
- Status badges + progress indicators
- Full-screen assessment layout with internal grid
- Print-friendly view
- Migrate existing assessment data/logic to artifact model
- Remove old assessment routes/pages

---

## Files Changed

### Phase A (Visual + Cleanup)

| File                                    | Action                   | Notes                                                            |
| --------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| `src/theme/tokens.css`                  | Modify                   | New palette, fonts, variables, --warning separated from --accent |
| `src/index.css`                         | Modify                   | Google Font imports, noise texture, reduced-motion               |
| `src/layouts/CommandCenter.tsx`         | Modify                   | Remove layout props, integrate artifact expansion                |
| `src/layouts/layout-command-center.css` | Modify                   | Sticky composer, rail refinements, transitions                   |
| `src/primitives/Composer.tsx`           | Modify                   | Auto-grow textarea, ResizeObserver, integrated New Thread        |
| `src/primitives/composer.css`           | Modify                   | Docked styles, auto-grow, smaller New Thread                     |
| `src/primitives/TopBar.tsx`             | Modify                   | Remove layout switcher + nav toggle, simplified                  |
| `src/primitives/top-bar.css`            | Modify                   | Amber wordmark, minimal layout                                   |
| `src/primitives/MessageList.tsx`        | Modify                   | Entry animations                                                 |
| `src/primitives/message-list.css`       | Modify                   | Fade-in transitions                                              |
| `src/primitives/ToolLogEntry.tsx`       | Modify                   | Status dots, active indicator                                    |
| `src/primitives/tool-log-entry.css`     | Modify                   | Amber accents, pulse animation                                   |
| `src/components/ChatPage.tsx`           | Modify                   | Render CommandCenter directly, no nav routing                    |
| `src/layouts/Focus.tsx`                 | **Delete**               |                                                                  |
| `src/layouts/Workspace.tsx`             | **Delete**               |                                                                  |
| `src/layouts/LayoutSwitcher.tsx`        | **Delete**               |                                                                  |
| `src/layouts/layout-focus.css`          | **Delete**               |                                                                  |
| `src/layouts/layout-workspace.css`      | **Delete**               |                                                                  |
| `src/layouts/types.ts`                  | **Delete** (or simplify) |                                                                  |
| `src/primitives/ResizableSplit.tsx`     | **Delete**               | Only used by Workspace                                           |
| `src/primitives/resizable-split.css`    | **Delete**               |                                                                  |

### Phase B (Artifact Zoom)

| File                                                 | Action     | Notes                                |
| ---------------------------------------------------- | ---------- | ------------------------------------ |
| `src/artifacts/ArtifactRegistry.ts`                  | **Create** | Type registry, zoom level interfaces |
| `src/artifacts/ArtifactOverlay.tsx`                  | **Create** | Expanded overlay container           |
| `src/artifacts/ArtifactFullScreen.tsx`               | **Create** | Full-screen container                |
| `src/artifacts/types.ts`                             | **Create** | Artifact type definitions            |
| `src/artifacts/renderers/ChartArtifact.tsx`          | **Create** | Chart at each zoom level             |
| `src/artifacts/renderers/TableArtifact.tsx`          | **Create** | Table at each zoom level             |
| `src/artifacts/renderers/RecommendationArtifact.tsx` | **Create** | Recommendation renderer              |
| `src/primitives/ArtifactCard.tsx`                    | Modify     | Click → expand, sparklines           |
| `src/layouts/CommandCenter.tsx`                      | Modify     | Overlay + full-screen integration    |

### Phase C (Assessment Migration)

| File                                             | Action     | Notes                                     |
| ------------------------------------------------ | ---------- | ----------------------------------------- |
| `src/artifacts/renderers/AssessmentArtifact.tsx` | **Create** | Assessment at each zoom level             |
| `src/components/AssessmentList.tsx`              | **Delete** | Replaced by artifact cards                |
| `src/components/AssessmentDetail.tsx`            | **Delete** | Replaced by expanded/full-screen artifact |
| `src/components/ChatPage.tsx`                    | Modify     | Remove assessment routing                 |

---

## What Stays Untouched

### Mobile Behavior (<1024px)

The three-panel layout collapses on mobile. Specific behaviors:

- **Thread list:** Becomes a slide-over triggered by a "Threads" button in the top bar (hamburger-style). Thread cards render the same but full-width.
- **Activity drawer:** Does NOT render inline at bottom of artifacts panel. Instead, becomes a separate **slide-up drawer** triggered by tapping the activity bar (which renders as a footer button: `⚡ Activity (3)`).
- **Full-screen artifacts:** Include a persistent back button (top-left, always visible) — don't rely on the artifact toolbar which might scroll.
- **Composer:** `max-height: min(160px, 20vh)` to prevent layout collapse on small viewports.
- **Activity drawer max-height:** `30vh` on mobile (not 40vh).

---

## What Stays Untouched

- All business logic in `useChatEngine.ts`
- Structured output rendering internals (charts, tables, recommendations)
- Authentication flow
- Agent client / streaming infrastructure
- Mobile responsive behavior (slide-over, slide-up-drawer still used on <1024px)

---

## Design Review Fixes Incorporated

From `docs/COMMAND-CENTER-DESIGN-REVIEW.md`:

1. ✅ **Separated `--warning` from `--accent`** — warning is now `#d4882a` (deeper orange-amber)
2. ✅ **Constrained mono typography** — JetBrains Mono only for wordmark, data, timestamps, code; DM Sans for headings
3. ✅ **ResizeObserver for composer** — measured dock model instead of pure CSS sticky
4. ✅ **Accessibility contract added** — contrast targets, focus visibility, reduced-motion, aria-labels
5. ✅ **Grain overlay z-index fixed** — `z-index: 1` instead of `9999`
6. ✅ **Accent usage budget** — documented per-region caps
7. ✅ **Tool log pulse constrained** — once only, high-priority entries only
8. ✅ **Test refactors pre-planned** — layout shell tests, ChatPage tests, localStorage cleanup

---

## Success Criteria

1. Command Center is the only layout. No switcher visible.
2. No Chat/Assessments toggle — unified artifact model.
3. Artifacts expand inline → overlay → full-screen seamlessly.
4. Assessments render as rich artifacts with section navigation.
5. Composer is permanently docked at bottom, grows upward, maxes at ~160px.
6. "New Thread" is a small icon-pill in the composer row.
7. Color palette feels distinct — not "another blue dashboard."
8. Typography is crisp and hierarchical — mono for data, sans for everything else.
9. Subtle grain texture adds depth.
10. All accessibility requirements met (contrast, focus, reduced-motion, aria).
11. All existing tests pass (with planned refactors for removed components).
12. No regressions in structured output rendering.

---

## Amendment: Thread Persistence, Activity Relocation & Agent UI Patterns

_Added 2026-02-12. Incorporates research on emerging agent UI patterns and Adam's design decisions._

### Context: Agent ≠ Chatbot

Research into the emerging dominant UI design for AI agents (vs chatbots) reveals a critical distinction that shapes everything below:

- **Chatbots** converse. Their UI is optimized for message exchange — sidebar + chat window (the ChatGPT pattern).
- **Agents** act. Their UI must show _what the agent is doing_, not just _what it's saying_. The emerging dominant pattern is a split-screen: conversation on one side, agent workspace/viewer on the other (OpenAI Operator, Manus, Cursor Agent, GitHub Agent HQ).

CEI already has this right — the three-panel Command Center (thread nav | conversation | artifacts) is structurally aligned with the agent UI paradigm. The conversation is the _control surface_; artifacts are the _output_. What the amendment below adds is:

1. **Thread persistence** — so the CISO can return to prior analysis sessions (not lose work)
2. **Activity relocation** — tool-call transparency moves from competing with thread nav to being a contextual detail of the artifact panel
3. **Agent-specific UI enhancements** — confidence indicators, reasoning transparency, and task-level progress that go beyond chatbot patterns

**Key sources:**

- Emerge Haus, "The New Dominant UI Design for AI Agents" (Utterback-Abernathy model applied to agent UIs)
- Agentic Design Patterns (agentic-design.ai) — Mission Control Monitoring, Trust & Transparency Systems
- Codewave, "Designing User Interfaces for Agentic AI" — Goal-oriented design, balanced transparency, adaptive control
- GitHub Agent HQ / Salesforce Agentforce Command Center — single-pane-of-glass oversight patterns
- Cursor 2026 — parallel agent runs as first-class sidebar objects

---

### Change 1: Left Column → Thread Navigator

The left rail transforms from a tool-call activity log into a **persistent thread list**. Every conversation persists per-user with server-side storage.

#### Design

```
┌──────────┐
│ [+ New]  │  ← New Thread button (top, always visible)
│ ──────── │
│ 🔍 Search│  ← Search/filter input
│ ──────── │
│ ▸ Risk Matrix    │  ← Agent-generated title
│   Analysis       │    Timestamp: "2h ago"
│   ● 3 artifacts  │    Artifact count badge
│ ──────── │
│ ▸ Q4 Compliance  │
│   Gap Review     │
│   ● 7 artifacts  │
│ ──────── │
│ ▸ NIST CSF       │
│   Mapping Check  │
│   ● 2 artifacts  │
│ ──────── │
│   ...            │
└──────────┘
```

#### Thread Card Anatomy

Each thread card shows:

- **Title:** Agent-generated after first exchange (3-6 words, e.g., "Risk Matrix Coverage Analysis"). Generated via a lightweight LLM call using the first user message + first agent response. Falls back to truncated first message if generation fails.
- **Timestamp:** Relative time ("2h ago", "Yesterday", "Feb 10")
- **Artifact badge:** Count of artifacts produced in this thread (charts, tables, recommendations, assessments)
- **Status dot:** Amber pulse = agent actively working (thread `status = 'active'`), teal = complete/idle, dim = archived
- **Background task indicator:** If the user switches threads while the agent is still working, the source thread card shows: `● Agent working… (3/5 steps)` — the user never loses visibility into backgrounded work
- **Active thread highlight:** Amber left-border accent (consistent with artifact selection pattern)

#### Thread Persistence (Server-Side)

Storage extends the existing Aurora backend. New table:

```sql
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,                          -- Agent-generated, nullable until first exchange completes
  status TEXT NOT NULL DEFAULT 'idle', -- 'active' (agent working), 'idle', 'archived'
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Only updates on new message/artifact, NOT on open/view
  archived_at TIMESTAMPTZ,            -- Soft delete (never hard-purge — compliance retention)
  message_count INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'         -- Extensible: tags, future fields
);

CREATE INDEX idx_threads_user_activity ON threads(user_id, last_activity_at DESC);
CREATE INDEX idx_threads_status ON threads(status) WHERE status = 'active';
CREATE INDEX idx_threads_pinned ON threads(user_id) WHERE is_pinned = true;

-- Exchanges: atomic unit of one user message → full agent response
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_message_id UUID NOT NULL,
  agent_message_id UUID,              -- NULL while agent is still responding
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,           -- NULL while in-progress
  tool_call_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'complete', 'failed', 'cancelled'
);

CREATE INDEX idx_exchanges_thread ON exchanges(thread_id, created_at DESC);
```

The `exchanges` table is critical — it provides the atomic unit for activity counting (Phase B.5), exchange separators in the activity drawer, and task-level progress tracking. Without it, there's no clean way to group tool calls by round-trip.

Messages and artifact references are stored in related tables (extending existing schema). Artifact counts are computed on read (no denormalized counter or triggers).

**Limits:**

- **Per-user cap:** 200 threads (soft limit). Beyond this, oldest unpinned threads are auto-archived (soft delete, recoverable for 90 days).
- **Pin support:** Users can pin important threads to prevent auto-archival. Max 20 pins.
- **Storage budget:** ~100KB per thread average (messages + metadata, not artifact content which is already in documents/vector_store).

**Client behavior:**

- Thread list loads on app init (paginated, 20 at a time, most-recent-first)
- Search is server-side (ILIKE on title + full-text on messages for deeper search)
- Thread switching preserves scroll position in the departing thread
- No IndexedDB — keep the client thin for Amplify hosting. All state is Aurora-backed.

#### "New Thread" Behavior

- `+` button at top of thread rail (always visible, even when rail is collapsed)
- Creates a new thread server-side, switches conversation view to empty state
- Previous thread persists in the list — no data loss
- Composer auto-focuses in new thread
- **Removed from composer row** — rail `+` button is the sole trigger

#### Collapsed Thread Rail

When collapsed (thin 4px strip):

- Shows `+` icon at top
- Shows count of threads with unread agent activity (amber dot)
- Click anywhere to expand

---

### Change 2: Activity Panel → Collapsible Drawer (Lower-Right)

Tool-call activity moves from the left column to the **bottom of the artifacts panel** as a collapsible drawer.

#### Rationale

Activity (tool calls, db lookups, reasoning steps) is _contextual detail about how the agent produced artifacts_, not a primary navigation element. It belongs near the artifacts, not competing with thread navigation for spatial prominence.

This follows the pattern from:

- **Chrome DevTools:** Console collapsed at bottom, summary line visible, expand to see detail
- **VS Code:** Problems/Output/Terminal as bottom drawer with tab + count badges
- **GitHub Agent HQ:** Agent reasoning snippets inline with diffs, expandable

#### Layout

**Collapsed state (default):**

```
┌─────────────────────────────────────┐
│  Artifacts Panel                     │
│                                      │
│  [artifact cards...]                │
│                                      │
├─────────────────────────────────────┤
│ ⚡ Querying risk matrix…       (7) ▲│  ← Activity Bar
└─────────────────────────────────────┘
```

**Expanded state:**

```
┌─────────────────────────────────────┐
│  Artifacts Panel                     │
│  [artifact cards...]                │
├─────────────────────────────────────┤
│ ⚡ Activity                    (7) ▼│
│─────────────────────────────────────│
│  ── Exchange 3 (1:02 AM) ──────────│
│  ✓ db_lookup: risk_statements  2.1s │
│  ✓ db_lookup: control_mappings 1.8s │
│  ✓ propose_changes            3.4s │
│  ● Generating chart…               │
│  ── Exchange 2 (12:58 AM) ─────────│
│  ✓ db_lookup: documents       1.2s │
│  ✓ vector_search              2.8s │
│─────────────────────────────────────│
│  📥 Export Activity Log (JSON)      │
└─────────────────────────────────────┘
```

#### Activity Bar Anatomy

- **Icon:** ⚡ lightning bolt (amber when active, dim when idle)
- **Summary text:** 3-4 word description of the most recent tool call, auto-generated:
  - Active: "Querying risk matrix…", "Generating chart…", "Analyzing controls…"
  - Complete: "Analysis complete", "7 actions completed"
  - Idle/no activity: "No recent activity"
- **Pill count:** Badge with total activity items for the **current exchange** (one user message → full agent response cycle)
- **Expand/collapse chevron:** ▲ to expand, ▼ to collapse. Keyboard: `a` to toggle (mnemonic: activity)

#### Activity Counting Strategy

The multi-turn counting problem is solved with **exchange-scoped counting**:

- **Exchange** = one user message + the agent's complete response (all tool calls, all output blocks). This is the atomic unit of work.
- **Pill on collapsed bar** = count for the current/most recent exchange only. This answers "what is the agent doing _right now_?"
- **Exchange separators** in expanded view group tool calls by round-trip with timestamps. Scrolling up reveals prior exchanges' activity.
- **Thread-level summary** on thread cards in the left rail: "● 23 actions" as subtle metadata — gives a sense of thread complexity without overwhelming the activity bar.

This avoids the "147 activities" problem where cumulative counts lose meaning.

**Edge cases:**

- **Parallel tool calls:** When the agent runs multiple tools concurrently, the pill shows progress: `(1/3)` → `(2/3)` → `(3)` as each completes. Summary: "Running 3 queries… (1/3)"
- **Cancelled exchanges:** If the user cancels mid-stream (`Esc`), the exchange is marked `status = 'cancelled'` and the activity bar shows: `⚡ Analysis interrupted… (1 of 2)` with a distinct muted style
- **Failed exchanges:** If a tool call errors, the activity bar turns danger-colored: `⚡ Analysis failed (1)` — expanded view shows error detail with expandable stack trace

#### Expanded Panel Behavior

- **Fixed max height:** `40vh` (viewport-relative, not parent-relative — avoids ambiguity and layout collapse on small screens). On viewports < 800px, drops to `30vh`.
- **Scrollable:** Most recent activity at top, scroll down for history
- **Export button:** "📥 Export Activity Log (JSON)" at the bottom — exports the full thread's activity as structured JSON for power users/audit trails
- **Entry format:** Status icon + tool name + brief context + duration
  - `✓` teal = completed successfully
  - `✗` red = failed (with expandable error detail)
  - `●` amber pulse = in progress
  - `○` dim = pending/queued
- **Expandable entries:** Click a completed tool call to see input/output summary (progressive disclosure)

---

### Change 3: Agent-Specific UI Enhancements

Research on agentic AI UX reveals patterns that CEI should adopt to differentiate from a chatbot skin. These are additions to the existing artifact and conversation design.

#### 3a. Confidence Indicators on Agent Outputs

When the agent produces risk assessments, coverage analysis, or recommendations, it should surface **confidence level** — not as a number, but as a qualitative indicator the CISO can calibrate trust against.

**Implementation:** Artifact cards and expanded views include a confidence badge:

- **High confidence** (teal): "Based on 47 mapped controls and 3 framework sources"
- **Medium confidence** (amber): "Limited data — 12 of 60 risk statements have control mappings"
- **Low confidence** (red): "Insufficient data — recommend manual review"

The agent's system prompt already has access to data completeness metrics. This surfaces them visually rather than burying them in prose.

**Confidence decay:** Confidence is not static. An assessment marked "High confidence" 6 months ago may be stale if control mappings were deleted, frameworks updated, or asset classes changed. The `ConfidenceBadge` component shows both original and current confidence when they diverge:

```
Confidence: MEDIUM (was HIGH — 6 months ago)
⚠️ 3 control mappings deleted since analysis, 1 framework updated
[ Refresh Analysis ]
```

Backend provides a lightweight confidence recalculation on artifact view (checks data freshness, not full re-analysis).

#### 3b. Agent Reasoning Transparency

Inspired by GitHub Agent HQ's "reasoning snippets" — when the agent makes a non-obvious analytical decision (e.g., flagging a control gap, recommending a risk treatment), the artifact can include an expandable "Why?" section:

```
┌─────────────────────────────────────┐
│ ⚠️ Coverage Gap: AC-7 (Unsuccessful │
│    Login Attempts)                   │
│                                      │
│ No control mapped for 3 asset       │
│ classes: Cloud Infrastructure,       │
│ Remote Access, Mobile Devices        │
│                                      │
│ ▸ Why was this flagged?             │  ← expandable
│   "AC-7 has high residual risk      │
│    (score: 8.2) across these asset  │
│    classes, and similar orgs         │
│    typically have 2+ controls per   │
│    class for this statement."       │
└─────────────────────────────────────┘
```

This is _not_ a chatbot explaining itself — it's an agent showing its analytical reasoning, which is critical for security governance where decisions must be defensible.

#### 3c. Task-Level Progress (Beyond Tool Calls)

The activity drawer shows low-level tool calls. But the conversation area should show **task-level progress** — what the agent is working toward at a higher level:

**In-conversation progress indicator:**

```
┌──────────────────────────────────┐
│ 🔄 Analyzing risk coverage       │
│ ████████░░░░░░░░  3 of 5 steps  │
│ ✓ Loaded risk statements         │
│ ✓ Loaded control mappings        │
│ ✓ Cross-referenced frameworks    │
│ ● Identifying coverage gaps…     │
│ ○ Generating recommendations     │
└──────────────────────────────────┘
```

This appears in the conversation stream (center column) as a live-updating block while the agent works. It gives the CISO a high-level "what's happening" without needing to expand the activity drawer for tool-level detail.

**Key distinction:** Activity drawer = developer/audit-level detail (tool calls, durations, I/O). Conversation progress = executive-level status (what step of the analysis are we on).

#### 3d. Agentic Action Model (Design-Forward)

CEI is evolving from "analyze and report" to "analyze, recommend, and draft into systems of record." But critically: **CEI is a governance layer, not a workflow engine.** The agent reads from and writes drafts into source systems (ServiceNow, Azure AD, Jira, CMDBs). Approval, execution, and audit trails happen in those systems — not in CEI.

**Architectural principle:** The agent pushes **draft/unapproved records** into systems of record. Existing approval workflows in those systems handle the rest. CEI observes outcomes via the same read path. Agent observability (what the agent did, when, why) is handled by **AgentCore Observability**, not a CEI-owned audit log.

**What CEI owns:**

- Surfacing what the agent **analyzed** and **proposed**
- Showing where the agent **pushed drafts** (with deep links to source systems)
- Displaying the **current status** of those drafts (read from source systems)
- Impact modeling **before** the agent proposes changes

**What CEI does NOT own:**

- Approval workflows (that's ServiceNow/Jira/Azure AD's job)
- Step-level execution control (Mark Complete, Skip, Retry — happens in the source system)
- Audit trail storage (AgentCore Observability handles agent action logging)
- Rollback (the source system's change management handles reversals)

**Draft Action Artifact:**

```
┌────────────────────────────────────────────────────────┐
│  📋 Recommendation: Enable MFA on Cloud Admin Accounts │
│                                                         │
│  Confidence: HIGH                                       │
│  Target: Azure AD — Cloud Infrastructure asset class    │
│  Risk reduction: AC-7 residual risk 8.2 → 3.1          │
│                                                         │
│  Agent drafted:                                         │
│  📎 CHG00412847 (ServiceNow) — Draft, pending approval │
│     → Conditional Access policy for 12 admin accounts  │
│     [ Open in ServiceNow ↗ ]                           │
│                                                         │
│  ▸ Why this recommendation?                            │
│  ▸ Impact analysis                                     │
└────────────────────────────────────────────────────────┘
```

**Status reads from source system (polled or webhook):**

```
│  📎 CHG00412847 (ServiceNow) — Approved, implementing  │
│     Approved by: j.smith@org.com (2026-02-12 10:17 AM) │
│     [ Open in ServiceNow ↗ ]                           │
```

The artifact shows lifecycle status but **reads it from the source system** — CEI never owns or controls that state.

**Impact Simulation Artifact (CEI-owned, pre-action):**

```
┌────────────────────────────────────────────────────────┐
│  📊 Impact Analysis: Process Change — Patch Cycle      │
│                                                         │
│  ┌─────────────────┬─────────────────┐                 │
│  │ CURRENT STATE    │ PROPOSED STATE   │                 │
│  ├─────────────────┼─────────────────┤                 │
│  │ Patch cycle: 30d │ Patch cycle: 14d │                 │
│  │ Compliance: 72%  │ Compliance: 94%  │                 │
│  │ FTE effort: 40h  │ FTE effort: 52h  │                 │
│  │ Risk score: 6.8  │ Risk score: 3.2  │                 │
│  └─────────────────┴─────────────────┘                 │
│                                                         │
│  ⚠️ Trade-offs:                                        │
│  • +12h FTE effort per cycle (+30%)                    │
│  • Requires automated testing pipeline (not yet in     │
│    place for 3 of 8 asset classes)                     │
│                                                         │
│  [ Proceed to Recommendation → ]  [ Dismiss ]          │
└────────────────────────────────────────────────────────┘
```

Impact simulations are fully CEI-owned — they're the agent's analytical output, not a draft in a source system.

These patterns don't need to be _built_ in the current phases — but the artifact zoom system (Phase B) and the activity drawer (Phase B.5) must be **designed** to accommodate them. Specifically:

- Artifact type registry must support artifacts that display external system status (polled/webhook)
- Expanded/full-screen views must support deep links to source systems
- Activity drawer entries must support external system references (ticket IDs, deep links)
- Thread persistence must preserve artifact references across sessions

---

### Updated Layout Diagram

```
Full layout with all amendments:

┌──────────┬──────────────────────┬───────────────────────────┐
│ Thread   │  Conversation        │  Artifacts Panel          │
│ Nav      │                      │                           │
│          │  [messages...]       │  [artifact cards with     │
│ [+ New]  │                      │   confidence badges,      │
│ 🔍Search │                      │   sparklines, status]     │
│ ──────── │                      │                           │
│ ▸Thread 1│  ┌────────────────┐  │                           │
│ ▸Thread 2│  │🔄 Analyzing... │  │                           │
│ ▸Thread 3│  │ 3/5 steps done │  │                           │
│ ▸Thread 4│  └────────────────┘  ├───────────────────────────┤
│          │                      │⚡ Querying data…    (3) ▲ │
│          │  ╔════════════════╗  └───────────────────────────┘
│          │  ║  Composer      ║
│          │  ╚════════════════╝
└──────────┴──────────────────────┘
```

---

### Updated Implementation Phases

The original Phase A/B/C structure is extended:

#### Phase A: Visual Refresh + Cleanup (unchanged)

- Color palette, fonts, noise texture
- Delete Focus/Workspace/LayoutSwitcher
- Docked composer with ResizeObserver
- Rail style refinements + micro-interactions
- Accessibility + reduced-motion

#### Phase A.5: Thread Persistence + Navigation (NEW)

- `threads` table migration + storage adapter
- `exchanges` table migration + storage adapter (critical for Phase B.5 activity counting)
- Thread list component (left rail replacement)
- Thread CRUD: create, list, search, archive, pin
- Exchange tracking: create exchange on user message, complete on agent response finish
- Agent-generated thread titles (async — show placeholder, update when LLM responds, fallback to truncated first message after 2s timeout)
- Thread switching with scroll position preservation
- Background task indicators on thread cards (amber pulse + step progress when agent is working in a non-active thread)
- "New Thread" button in rail (remove from composer)
- Collapsed rail state

#### Phase B: Artifact Zoom System (updated)

- Artifact type registry + zoom levels
- **Registry interface must be designed for stateful artifacts** (Phase E compatibility):
  ```tsx
  interface ArtifactTypeDefinition<TState = void> {
    kind: string
    renderInline: (artifact: Artifact, state?: TState) => JSX.Element
    renderExpanded: (artifact: Artifact, state?: TState) => JSX.Element
    renderFullScreen: (artifact: Artifact, state?: TState) => JSX.Element
    // Phase E extensions (optional, not implemented in Phase B)
    onAction?: (artifact: Artifact, action: ArtifactAction) => Promise<TState>
    serializeState?: (state: TState) => string
    deserializeState?: (serialized: string) => TState
  }
  ```
  Static artifact types (chart, table, recommendation) use `TState = void`. Action artifacts (Phase E) use stateful types. The registry validates kind→definition at registration time.
- Expanded overlay + full-screen mode
- Keyboard shortcuts + transitions

#### Phase B.5: Activity Drawer (NEW)

- Activity bar component (collapsed state with summary + pill count)
- Expanded activity panel with exchange-scoped grouping
- Activity entry rendering (status icons, durations, expandable detail)
- JSON export functionality
- Exchange separator logic
- Keyboard shortcut (`a` to toggle)

#### Phase C: Assessment-as-Artifact Migration (unchanged)

#### Phase D: Agent UI Enhancements (NEW)

- Confidence indicators on artifact cards + expanded views
- "Why?" reasoning sections on flagged findings
- Task-level progress blocks in conversation stream
- Integration with agent system prompt for confidence/reasoning metadata

#### Phase E: Agentic Action Model (NEW — Future, design now)

CEI as governance layer over systems of record. Agent observability via AgentCore, not CEI-owned audit logs.

**E.1: Draft Action Artifacts (3 days)**

- `DraftActionArtifact.tsx` — artifact type showing agent-proposed changes with deep links to source systems
- External status polling: read draft/ticket status from source system APIs (ServiceNow, Jira, Azure AD)
- Status badge rendering: Draft → Pending Approval → Approved → Implementing → Complete (all read from source)
- Deep link rendering: "Open in ServiceNow ↗" buttons with ticket/record IDs

**E.2: Source System Integration Layer (3 days)**

- Agent tool extensions: push draft records into source systems via API
- Status reader: poll or webhook for status updates on agent-created drafts
- Credential management: source system API tokens stored securely (Secrets Manager)
- Error handling: source system unavailable → show "Status unavailable" with last-known state

**E.3: Impact Simulation Artifacts (2 days)**

- `ImpactSimulation.tsx` — before/after comparison artifact type (fully CEI-owned)
- Trade-off callouts with severity indicators
- "Proceed to Recommendation →" flow linking impact analysis to draft action creation

**E.4: Integration Testing (2 days)**

- End-to-end: agent analyzes → proposes → pushes draft → CEI reads status from source
- Mock source system APIs for CI
- Verify deep links, status polling, and error states

---

### Files Changed (New/Modified for Amendment)

| File                                              | Action                 | Notes                                                                          |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `migrations/NNN_create_threads.sql`               | **Create**             | threads table, indexes                                                         |
| `src/storage/ThreadStorage.ts`                    | **Create**             | CRUD operations for threads                                                    |
| `src/primitives/ThreadList.tsx`                   | **Create**             | Thread navigator component                                                     |
| `src/primitives/thread-list.css`                  | **Create**             | Thread card styles, search, collapsed state                                    |
| `src/primitives/ThreadCard.tsx`                   | **Create**             | Individual thread card with title, timestamp, badge                            |
| `src/primitives/ActivityBar.tsx`                  | **Create**             | Collapsed activity indicator                                                   |
| `src/primitives/ActivityDrawer.tsx`               | **Create**             | Expanded activity panel                                                        |
| `src/primitives/activity-drawer.css`              | **Create**             | Drawer styles, entry formatting, transitions                                   |
| `src/primitives/TaskProgress.tsx`                 | **Create**             | In-conversation progress block                                                 |
| `src/primitives/ConfidenceBadge.tsx`              | **Create**             | Artifact confidence indicator                                                  |
| `src/primitives/ReasoningSection.tsx`             | **Create**             | Expandable "Why?" sections                                                     |
| `src/layouts/CommandCenter.tsx`                   | Modify                 | Replace activity rail with thread list, add activity drawer to artifacts panel |
| `src/layouts/layout-command-center.css`           | Modify                 | Grid changes for new left column + activity drawer position                    |
| `src/primitives/Composer.tsx`                     | Modify                 | Remove "New Thread" button (moved to rail)                                     |
| `src/primitives/ArtifactCard.tsx`                 | Modify                 | Add confidence badge rendering                                                 |
| `src/hooks/useThreads.ts`                         | **Create**             | Thread state management, CRUD hooks                                            |
| `src/hooks/useActivityTracker.ts`                 | **Create**             | Exchange-scoped activity counting                                              |
| `src/artifacts/renderers/DraftActionArtifact.tsx` | **Create** (Phase E)   | Agent-proposed changes with source system deep links + status                  |
| `src/artifacts/renderers/ImpactSimulation.tsx`    | **Create** (Phase E)   | Before/after comparison views                                                  |
| `src/primitives/SourceSystemStatus.tsx`           | **Create** (Phase E)   | Status badge reading from external system APIs                                 |
| `src/primitives/DeepLink.tsx`                     | **Create** (Phase E)   | External system link buttons (ServiceNow, Jira, Azure AD)                      |
| `src/hooks/useSourceSystemStatus.ts`              | **Create** (Phase E)   | Poll/webhook status reader for agent-created drafts                            |
| `migrations/NNN_create_exchanges.sql`             | **Create** (Phase A.5) | exchanges table + indexes                                                      |

---

### Updated Success Criteria

All original criteria remain, plus:

13. Threads persist per-user across sessions. Returning to CEI shows prior analysis threads.
14. Thread search finds threads by title and message content.
15. Activity drawer accurately counts tool calls per exchange (not cumulative).
16. Activity JSON export produces valid, complete audit trail.
17. Agent-generated thread titles are concise (3-6 words) and contextually accurate.
18. Confidence indicators appear on all assessment and analysis artifacts.
19. Task-level progress blocks display during multi-step agent operations.
20. No chatbot UX anti-patterns: CEI feels like a mission control for a security agent, not a messaging app.
21. Artifact type registry is extensible for draft action artifacts (source system status display, deep links).
22. UI patterns assume the agent writes drafts into systems of record — status is read from source systems, not owned by CEI. Agent observability via AgentCore.
23. Impact simulation artifacts support before/after comparison rendering.
