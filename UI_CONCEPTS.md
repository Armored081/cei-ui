# CEI-UI Redesign: Three Concept Options

## Pain Points Addressed (All Three Options)

| #   | Pain Point                          | Solution Direction                                                               |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Large header wastes space           | Minimal header — icon/wordmark + nav + user menu only                            |
| 2   | Attach files section too prominent  | iOS-style paperclip icon button in the composer bar                              |
| 3   | Session info dumped at page bottom  | Session/tasks surfaced contextually, not as a static footer                      |
| 4   | Tool calls inline with agent text   | Tool activity separated into its own dedicated UI region                         |
| 5   | Charts/tables buried in text stream | Artifacts get their own panel with thumbnails, slide-out expansion, and download |
| 6   | No gradients                        | All concepts use flat solid colors only                                          |

---

## Shared Design Tokens (All Options)

```
Background:       #0b1220  (solid, no gradient)
Surface:          #111b2f
Panel:            #13233f
Elevated:         #182d4f
Border:           rgba(163, 184, 221, 0.18)
Text primary:     #e6edf9
Text secondary:   #9eb0cc
Accent:           #4fb3ff
Accent alt:       #79ffc5
Font:             Space Grotesk (unchanged)
```

No gradients anywhere — buttons, nav pills, backgrounds are all flat fills.

---

## Option A: "Command Center" — Split-Pane Workspace

### Philosophy

A productivity-first layout inspired by VS Code and Slack. The screen is divided into
functional zones so conversation, tool activity, and artifacts each own dedicated real
estate. Power users can see everything at once without scrolling through a single column.

### Layout (Desktop ≥ 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ CEI    [Chat] [Assessments]                 user@co ▾    │  ← 48px top bar
├────────────┬─────────────────────────────┬───────────────────┤
│            │                             │                   │
│  ACTIVITY  │      CONVERSATION           │   ARTIFACTS       │
│  RAIL      │                             │   PANEL           │
│  (240px)   │      (flex: 1)              │   (360px)         │
│            │                             │                   │
│  Tool calls│  Messages appear here.      │  Charts, tables,  │
│  listed    │  Agent text is PURE TEXT     │  recommendations  │
│  vertically│  — no blocks inline.        │  appear as cards. │
│  with      │                             │                   │
│  status    │  Blocks are replaced with   │  Each card has:   │
│  dots.     │  a small inline pill:       │  • Thumbnail      │
│            │  "📊 Revenue Chart →"       │  • Title          │
│  Click to  │  that links to the          │  • Download btn   │
│  expand    │  artifact in the right      │  • Expand btn     │
│  shows     │  panel.                     │                   │
│  args +    │                             │  Clicking expand  │
│  result    │                             │  opens a SLIDE-   │
│  in a      │                             │  OVER overlay     │
│  detail    │                             │  (80% viewport)   │
│  pane.     │                             │  with full chart  │
│            │                             │  + data + export. │
│            │                             │                   │
│  ─ ─ ─ ─  │                             │                   │
│  TASKS     │                             │                   │
│  section   │                             │                   │
│  below     │                             │                   │
│  tools.    │                             │                   │
│  Shows     │                             │                   │
│  open      │                             │                   │
│  session   │                             │                   │
│  tasks as  │                             │                   │
│  a mini    │                             │                   │
│  checklist.│                             │                   │
│            ├─────────────────────────────┤                   │
│            │ [📎] [  Type a message... ] │                   │
│            │                    [Send ▶] │                   │
└────────────┴─────────────────────────────┴───────────────────┘
```

### Top Bar (48px)

- Left: Diamond icon + "CEI" wordmark (no subtitle, no "Phase 4")
- Center: Pill navigation `[Chat] [Assessments]` — flat fill on active (solid `--accent`, white text), no gradient
- Right: `user@company` with dropdown chevron for sign-out

### Left Rail — Activity & Tasks (240px, collapsible)

- **Tool Activity section**: Vertical list of tool calls
  - Each shows: status dot (spinning = running, green = done) + tool name
  - Click expands inline to show args (truncated JSON) and result
  - Most recent at top
- **Tasks section** (below a subtle divider): Mini checklist
  - Shows session's open tasks as checkboxes
  - Completed tasks show strikethrough
  - Session ID shown as small monospace text at very bottom of rail
- Rail can be collapsed to icon-only (48px) via toggle arrow

### Center — Conversation (flex)

- Clean message list: user messages right-aligned (rounded rect, `--bg-secondary`), agent messages left-aligned (rounded rect, `--bg-panel-muted`)
- Agent messages contain ONLY text — no charts, tables, or tool calls inline
- When the agent produces a structured block, it appears in the message as a **reference pill**:
  ```
  ┌─────────────────────────────────┐
  │  Here is the revenue breakdown. │
  │                                 │
  │  ┌ 📊 Revenue by Quarter ─→ ┐  │  ← clickable pill, links to artifact panel
  │  └──────────────────────────┘  │
  │                                 │
  │  As you can see, Q3 was the... │
  └─────────────────────────────────┘
  ```
  Clicking the pill scrolls/highlights the artifact in the right panel.

### Bottom Composer (sticky)

- Single row: `[📎 icon button]  [textarea]  [Send ▶]`
- The 📎 button opens a small popover: file picker + "PDF, CSV, TXT, JSON, DOCX — max 5 MB" in tiny muted text
- Attached files show as small removable chips above the textarea: `report.csv ✕`
- Textarea auto-grows from 1 line up to 6 lines
- Pressing Enter sends; Shift+Enter for newline

### Right Panel — Artifacts (360px, collapsible)

- Header: "Artifacts" label + collapse toggle
- Cards stack vertically, newest at top
- Each artifact card:
  ```
  ┌──────────────────────────────┐
  │  Revenue by Quarter          │
  │  ┌────────────────────────┐  │
  │  │  [chart thumbnail]     │  │  ← 120px tall preview
  │  └────────────────────────┘  │
  │  [⤢ Expand]  [↓ Download]   │
  └──────────────────────────────┘
  ```
- **Expand** opens a slide-over from the right edge:
  - 80% viewport width overlay with backdrop dimming
  - Full-size chart/table with sorting
  - Download buttons: JSON, CSV (for tables), PNG (for charts)
  - Close via ✕ button or Escape key or click backdrop
- Tables show first 5 rows in thumbnail, full table in expanded view
- Recommendations show severity badge + title in card, full body in expanded view

### Mobile (< 1024px)

- Left rail collapses into a hamburger drawer
- Artifact panel collapses; artifact pills in chat open a bottom sheet instead
- Composer stays as bottom sticky bar

### Key Differentiator

Everything visible at once — no context switching. Power users see conversation, tools,
and artifacts simultaneously. The three-pane layout maximizes information density.

---

## Option B: "Focus" — Centered Chat with Floating Overlays

### Philosophy

A distraction-free single-column chat (like Claude.ai or ChatGPT) where the conversation
is king. Supporting elements — tool activity, artifacts, tasks — exist as floating overlays
that appear on demand and stay out of the way otherwise. Minimal chrome, maximum focus.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ CEI            [Chat] [Assessments]        user@co ▾     │  ← 48px top bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              ┌─────────────────────────┐                     │
│              │                         │                     │
│              │    CONVERSATION          │                     │
│              │    (640px max-width)     │                     │
│              │                         │                     │
│              │    Clean text messages.  │                     │
│              │                         │                     │
│              │    Inline artifact       │                     │
│              │    cards (thumbnail +    │                     │
│              │    expand button).       │                     │
│              │                         │                     │
│              │    Tool calls replaced   │                     │
│              │    with a thin, muted    │                     │
│              │    status bar between    │                     │
│              │    messages.             │                     │
│              │                         │                     │
│              └─────────────────────────┘                     │
│                                                              │
│         ┌─────────────────────────────────┐                  │
│         │ [📎] [ Message the agent...   ] [▶]│              │
│         └─────────────────────────────────┘                  │
│                                                              │
│     ┌────┐                                     ┌────┐       │
│     │ 🔧 │  ← Tool activity FAB (left)         │ 📊 │       │  ← Artifacts FAB (right)
│     │ 3  │                                     │ 2  │       │
│     └────┘                                     └────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Top Bar (48px) — Same as Option A

- Wordmark left, nav center, user right. Flat fills, no gradients.

### Center Column (640px max-width, centered)

- Conversation fills the center
- User messages: right-aligned bubbles
- Agent messages: left-aligned, full-width within the column
- **Artifact inline cards**: When agent produces a chart/table, it shows in the message flow as a compact card:
  ```
  ┌─ 📊 Revenue by Quarter ──────────────────┐
  │  [sparkline or mini table preview]         │
  │                                            │
  │  [⤢ Open]                    [↓ Download]  │
  └────────────────────────────────────────────┘
  ```
  The card is small (max 200px tall) with a real data preview.
  Clicking "Open" launches a **slide-over panel from the right** (see below).
- **Tool call status bars**: Instead of expandable tool blocks in the message, tool activity shows as a thin muted line between text segments:

  ```
  Here is the analysis...

  ── 🔧 query_database ✓ · compliance_check ✓ ──

  Based on the results...
  ```

  These are non-interactive in the chat. For details, use the Tool Activity FAB.

### Floating Action Buttons (FABs)

Two small circular buttons float in the bottom corners above the composer:

- **Left FAB — Tool Activity** `🔧 3` (badge = count of tool calls in current message)
  - Opens a **slide-up drawer** (40% viewport height, bottom-anchored)
  - Lists all tool calls for the conversation with expand/collapse
  - Each entry: tool name, status, timestamp, expandable args/result
  - Drawer can be dragged taller or dismissed

- **Right FAB — Artifacts** `📊 2` (badge = count of artifacts)
  - Opens a **slide-over panel from the right** (480px wide)
  - Lists all charts/tables/recommendations as full-size interactive views
  - Each artifact:
    - Full chart (Recharts at 100% width)
    - Full sortable table
    - Download buttons (JSON, CSV, PNG)
    - Dismiss with ✕ or swipe
  - Navigate between artifacts with prev/next arrows

### Bottom Composer (fixed, floating)

- Centered, 640px max-width, rounded pill shape
- `[📎 icon]  [textarea auto-grow]  [▶ send icon]`
- 📎 opens a native file picker — selected files show as chips inside the pill:
  `[📎] [report.csv ✕] [Type a message...] [▶]`
- If 0 files attached, the 📎 is a subtle icon. After selecting, chips appear.

### Tasks / Session

- **No visible session section** by default
- Session ID is accessible via user menu dropdown → "Session info"
- If the agent creates tasks, a **toast notification** slides in from bottom-right: "Agent created 2 tasks"
  - Clicking the toast opens a **floating task card** (like a Trello card) pinned bottom-right
  - Tasks show as checkboxes with title and status
  - Card is draggable and dismissible

### Mobile (< 768px)

- Composer becomes full-width at bottom
- FABs stack vertically on the right edge
- Slide-over becomes full-screen modal
- Slide-up drawer becomes full-screen bottom sheet

### Key Differentiator

Maximum conversational focus. The chat stream is clean and uncluttered. Everything
else is one tap away via FABs but never competes for attention. The UI melts away
until you need it.

---

## Option C: "Workspace" — Dual-Panel with Tabbed Output Dock

### Philosophy

Inspired by Jupyter notebooks and IDE output panels. The screen splits into two halves:
the top is your conversation with the agent, and the bottom is a persistent "output dock"
where all artifacts and tool activity land. Think of it like a terminal + output pane —
you talk to the agent above, and results appear below.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ CEI   [Chat] [Assessments]   ● 2 tasks     user@co ▾    │  ← 44px top bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    CONVERSATION PANE                          │
│                    (full width, ~55% height)                  │
│                                                              │
│    Agent text is clean — no blocks, no tool calls.           │
│    When a block is produced, a subtle tag appears:           │
│    "📊 Revenue by Quarter" (clickable → focuses in dock)     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [📎] [  Ask the agent anything...              ] [▶]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
├──────────────────── drag handle ─────────────────────────────┤
│                                                              │
│  [Artifacts ▾]  [Tool Log ▾]  [Tasks ▾]          [⤢ Pop out]│  ← tab bar
│                                                              │
│                    OUTPUT DOCK                                │
│                    (full width, ~45% height, resizable)       │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Revenue  │ │ Risk     │ │ Mapping  │                      │
│  │ by Qtr   │ │ Summary  │ │ Results  │     ← horizontal    │
│  │ [chart]  │ │ [table]  │ │ [table]  │        card scroll   │
│  │          │ │          │ │          │                      │
│  │ [↓ JSON] │ │ [↓ CSV]  │ │ [↓ CSV]  │                     │
│  └──────────┘ └──────────┘ └──────────┘                      │
│                                                              │
│  Clicking any card EXPANDS it to fill the dock, with         │
│  full-size chart + download options (JSON, CSV, PNG).        │
│  Press Escape or ← to go back to card view.                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Top Bar (44px)

- Left: Diamond icon + "CEI" wordmark
- Center-left: `[Chat] [Assessments]` pill nav — flat solid fill on active
- Center-right: Task indicator badge `● 2 tasks` (clickable, switches dock to Tasks tab)
- Right: `user@co ▾` dropdown

### Conversation Pane (top, 55% of viewport, resizable)

- Full-width message list, max-width 800px centered within pane
- Clean agent text — no inline blocks or tool calls
- Artifact **tags** appear inline where the agent produced them:

  ```
  The quarterly revenue shows strong growth.

  ┌ 📊 Revenue by Quarter ┐    ← small rounded tag, solid bg
  └────────────────────────┘

  Q3 outperformed expectations by 12%.
  ```

  Clicking the tag scrolls the dock to that artifact and highlights it.

- Tool calls show as a single collapsed summary line (like a git commit):
  ```
  ── Used 3 tools: query_database, analyze_risk, generate_report ──
  ```
  Clicking this summary switches the dock to the "Tool Log" tab.

### Composer (inline, bottom of conversation pane)

- Full-width within conversation pane, rounded rect
- `[📎 icon button]  [auto-grow textarea]  [▶ Send]`
- 📎 opens file picker; attached files show as inline chips
- New Thread button as a small `+` icon next to Send

### Drag Handle (between panes)

- Horizontal bar the user can drag to resize the split
- Double-click to reset to 55/45 default
- Dock can be collapsed entirely (conversation takes 100%)

### Output Dock (bottom, 45% of viewport, resizable)

Three tabs:

**Tab 1: Artifacts** (default)

- Horizontal scrolling card strip
- Each card: 280px wide, contains:
  - Title bar
  - Mini preview (chart sparkline or first 3 table rows)
  - Download button (JSON by default)
- Clicking a card **expands it in-place** to fill the dock width:
  - Full-size Recharts chart (auto-sizing to dock height)
  - Full sortable table
  - Download toolbar: `[JSON] [CSV] [PNG] [Copy]`
  - Back arrow or Escape to return to card strip
- Empty state: "Artifacts from the agent will appear here"

**Tab 2: Tool Log**

- Chronological list of all tool calls
- Each entry: timestamp, tool name, status badge (running/done/error)
- Click to expand: shows args as formatted JSON + result preview
- Running tools pulse with a subtle animation

**Tab 3: Tasks**

- Shows agent-created tasks as a checklist
- Each task: checkbox, title, status pill (pending/in-progress/done)
- Session ID shown in small monospace text at bottom of tab
- Empty state: "No active tasks"

### Mobile (< 768px)

- Dock becomes a bottom sheet (swipe up to reveal)
- Dock tabs become swipeable pages
- Conversation takes full height; dock overlays from bottom

### Key Differentiator

The persistent output dock creates a "lab notebook" feel. Artifacts accumulate in
a visual timeline you can scroll through, compare, and export. The resizable split
gives users control over how much space they give to conversation vs. results.

---

## Side-by-Side Comparison

| Dimension               | A: Command Center           | B: Focus                   | C: Workspace                      |
| ----------------------- | --------------------------- | -------------------------- | --------------------------------- |
| **Layout**              | 3-column fixed              | Single column + overlays   | 2-pane vertical split             |
| **Information density** | High — everything visible   | Low — on-demand overlays   | Medium — always-visible dock      |
| **Best for**            | Power users, multi-tasking  | Conversational use, mobile | Analytical workflows, data review |
| **Tool calls**          | Left rail, always visible   | FAB → slide-up drawer      | Dock tab, one click away          |
| **Artifacts**           | Right panel, always visible | FAB → slide-over panel     | Dock tab, horizontal cards        |
| **Session/Tasks**       | Bottom of left rail         | User menu + toast cards    | Dock tab with badge in top bar    |
| **Composer**            | Bottom of center column     | Floating centered pill     | Inline bottom of conversation     |
| **Attachment UX**       | 📎 icon → popover           | 📎 icon → chips in pill    | 📎 icon → inline chips            |
| **Mobile**              | Drawers replace rails       | Full-screen modals         | Bottom sheet dock                 |
| **Header**              | 48px icon + nav + user      | 48px icon + nav + user     | 44px icon + nav + tasks + user    |
| **Gradients**           | None                        | None                       | None                              |

---

## Implementation Notes (All Options)

### Header Reduction

Replace the current `cei-chat-header` (kicker + h1 + subtitle + nav) with a compact 44–48px bar:

- Remove: "CEI Agent UI" title, "Phase 4 - Polish and Deployment Readiness" subtitle, kicker text
- Keep: Navigation pills, sign-out (moved to dropdown)
- Add: Small icon/wordmark

### Attachment Simplification

Replace the current attachment toolbar (button + help text + preview list) with:

- A single 📎 icon button in the composer row
- On click: opens native file picker (same MIME + size constraints)
- Selected files appear as small removable chips (filename + ✕) — no progress bar, no file size display until hover
- Drag-and-drop still supported (visual indicator on the composer area)

### Tool Call Extraction

- Stop rendering `<ToolActivityItem>` inside `ChatMessageList`
- Route tool call/result stream events to a separate state array: `toolLog: ToolActivityItem[]`
- Render tool log in its dedicated UI region (rail / FAB drawer / dock tab)
- In the message stream, replace tool blocks with either:
  - A thin status line (Options B, C)
  - Nothing — tools are only in the rail (Option A)

### Artifact Extraction

- Stop rendering `ChartBlock`, `TableBlock`, `RecommendationBlock` inline in messages
- Route `block` stream events to a separate state array: `artifacts: ArtifactItem[]`
- Each artifact gets a unique ID and a reference back to the message that produced it
- In the message stream, replace blocks with a clickable reference pill/tag
- Render artifacts in their dedicated UI region (panel / slide-over / dock)

### Slide-Over Component (Shared)

New component: `<SlideOver>` — a panel that slides in from the right edge:

- Width: 480px (B) or 80vw (A)
- Backdrop: semi-transparent overlay
- Contains: full-size artifact + download toolbar
- Dismiss: ✕ button, Escape key, click backdrop
- Transitions: transform translateX with 200ms ease

### Download Options

Extend `BlockDownloadButton` to support multiple formats:

- **JSON**: Current behavior (download block data as JSON)
- **CSV**: For tables — convert rows to CSV format
- **PNG**: For charts — use Recharts' `toDataURL` or html2canvas
- All downloads use the same filename sanitization

### No Gradients

- Replace `body` background gradient in `index.css` with `background: var(--bg-primary)`
- Replace `.cei-app-nav-link-active` gradient with `background-color: var(--accent)`
- Audit all CSS for any `linear-gradient` or `radial-gradient` usage and replace with flat colors

---

---

# Addendum: CEI-Agent Capability Audit & UI Primitive Alignment

## Purpose

The original three concepts were designed around the current UI's output types (chart,
table, recommendation). After a deep audit of the cei-agent backend, the agent's actual
capability surface is significantly broader. This addendum ensures the UI primitives are
designed to handle everything the agent does today AND new use cases as they come online.

---

## Agent Capability Surface (What the UI Must Account For)

### 14 Tools Today, Growing

| Tool                 | Category    | UI-Relevant Output                                                    |
| -------------------- | ----------- | --------------------------------------------------------------------- |
| `retriever`          | Content     | Chunks with source attribution, line ranges, relevance scores         |
| `org_preferences`    | Governance  | Structured governance profile (read/write)                            |
| `reg_ingest`         | Regulatory  | Ingested requirement record with ref, tags, dates                     |
| `reg_scope`          | Regulatory  | Scope entries with asset class, rationale, confidence                 |
| `reg_map_frameworks` | Regulatory  | Framework mappings with NIST control IDs, confidence                  |
| `db_lookup`          | Data        | Documents, RCM mappings, risk instances — heterogeneous result shapes |
| `propose_changes`    | Data        | **Inline diffs**, patch proposals with rationale and citations        |
| `db_patch`           | Data        | Patch execution results, affected rows                                |
| `snow_cmdb`          | Integration | CMDB configuration items (list/search/get)                            |
| `ping_federate`      | Integration | IdP profiles with federation details                                  |
| `endpoint_fetch`     | Integration | Arbitrary HTTP response data                                          |
| `public_url_check`   | URL/Media   | HTTP accessibility metadata                                           |
| `url_flow_check`     | URL/Media   | Redirect chain analysis with loop detection                           |
| `media`              | URL/Media   | **Downloaded files**, analysis metadata, stored media references      |

### 4 Use Cases (2 Active, 2 Scaffolded)

| Use Case                    | Status         | Key Outputs                                                                                                     |
| --------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| **Regulatory Assimilation** | Active         | Assessment lifecycle, requirement mapping tables, coverage stats, gap recommendations, triggered update actions |
| **Policy Management**       | Active (early) | Versioned documents, diffs (draft vs effective), clause library references, scoped update proposals             |
| **Disaster Recovery**       | Scaffolded     | (Future: DR plans, RTO/RPO analysis, dependency maps)                                                           |
| **Secure Authentication**   | Scaffolded     | (Future: Auth flow analysis, IdP configs, federation maps)                                                      |

### Structured Output Today: 3 Block Types

The current `StructuredBlockSchema` supports `chart`, `table`, `recommendation`.
But the agent's tools produce far more output types that are currently forced into
plain text or these three containers.

---

## Gap Analysis: What the Current Block Types Can't Handle

| Agent Output                                  | Current Rendering                         | What's Needed                                         |
| --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **Inline diffs** (propose_changes)            | Raw text in message                       | Dedicated diff viewer with red/green highlighting     |
| **Assessment lifecycle** (draft→approved)     | Not surfaced                              | Progress/status card with state machine visualization |
| **File downloads** (media tool output)        | Not surfaced                              | Downloadable file artifact with preview               |
| **Requirement mappings** (reg_map_frameworks) | Rendered as table if agent wraps in block | Purpose-built mapping card with confidence bars       |
| **Coverage statistics** (summary-builder)     | Rendered as chart if agent wraps in block | Summary stat card / KPI tiles                         |
| **Redirect chain** (url_flow_check)           | Raw text                                  | Flow/sequence diagram                                 |
| **CMDB items** (snow_cmdb)                    | Raw text                                  | Structured entity card                                |
| **Governance profile** (org_preferences)      | Raw text                                  | Structured settings view                              |
| **Triggered update actions**                  | Raw text                                  | Actionable task cards with approve/dismiss            |
| **Citation-backed rationale**                 | Plain text                                | Attributed text with source links                     |

---

## Proposed Primitive: The Artifact Type Registry

Instead of hard-coding UI components for each block type, all three UI concepts should
be built on a **generic artifact container** with a **type registry** that maps `kind`
strings to renderers. This makes adding new use cases a matter of adding a renderer —
no layout restructuring required.

### Core Artifact Interface

```typescript
interface Artifact {
  id: string // Unique ID (UUID)
  kind: string // Registry key — drives which renderer is used
  title: string // Human-readable label
  sourceMessageId: string // Which message produced this artifact
  sourceToolName?: string // Which tool call produced it (if applicable)
  useCaseId?: string // Which use case context (regulatory-assimilation, etc.)
  timestamp: number // When it was produced
  data: Record<string, unknown> // The raw payload (shape varies by kind)
  exportFormats: ExportFormat[] // Available download formats
  pinned?: boolean // User pinned this artifact
  relatedArtifactIds?: string[] // Links to related artifacts
}

type ExportFormat = 'json' | 'csv' | 'png' | 'svg' | 'pdf' | 'markdown'
```

### Artifact Kind Registry (Extensible)

```typescript
interface ArtifactRenderer {
  /** Compact preview for card/thumbnail (120-200px tall) */
  renderPreview: (artifact: Artifact) => ReactNode
  /** Full interactive view for slide-over/expanded dock */
  renderFull: (artifact: Artifact) => ReactNode
  /** Inline reference pill for the chat stream */
  renderPill: (artifact: Artifact) => ReactNode
  /** Available export formats */
  exportFormats: ExportFormat[]
  /** Icon identifier for the pill/card */
  icon: string
}

const artifactRegistry: Record<string, ArtifactRenderer> = {
  chart: chartRenderer,
  table: tableRenderer,
  recommendation: recommendationRenderer,
  diff: diffRenderer, // NEW
  file: fileRenderer, // NEW
  assessment: assessmentRenderer, // NEW
  mapping: mappingRenderer, // NEW
  kpi: kpiRenderer, // NEW
  entity: entityRenderer, // NEW
  flow: flowRenderer, // NEW
  action: actionRenderer, // NEW
}
```

When an unknown `kind` arrives, the registry falls back to a **generic JSON renderer**
(formatted JSON with copy/download). This means the agent can emit new block types
before the UI adds a dedicated renderer — they'll still be accessible, just not pretty.

---

## New Artifact Types: Detailed Specs

### 1. `diff` — Document Change Viewer

**Produced by:** `propose_changes` tool, policy management use case

**Data shape:**

```typescript
{
  kind: 'diff',
  title: string,               // e.g., "Proposed changes to ACC-POL-001"
  entityType: string,          // 'policy' | 'standard' | 'control'
  entityId: string,            // Canonical document ID
  patchKind: string,           // 'entityPatch' | 'richTextReplace' | 'matrixRowUpsert'
  before: string,              // Original text (or null for new content)
  after: string,               // Proposed text
  inlineDiff: string,          // Pre-computed inline diff
  rationale: string,
  citations: string[],
  confidence: number
}
```

**Preview (card):** Side-by-side color blocks showing +/- line counts, confidence badge
**Full view:** Split-pane diff viewer (red/green) with rationale panel and approve/reject buttons
**Export:** JSON, Markdown (with diff markers)

### 2. `file` — Downloadable File Output

**Produced by:** `media` tool (download/analyze), `endpoint_fetch` (with store=true),
future report generation

**Data shape:**

```typescript
{
  kind: 'file',
  title: string,               // Filename
  filename: string,
  contentType: string,         // MIME type
  sizeBytes: number,
  sha256?: string,
  preview?: string,            // First N chars for text files
  dataBase64?: string,         // Inline content (for small files)
  mediaId?: string,            // Reference to stored media (for large files)
  analysis?: {
    kind: 'text' | 'binary',
    lineCount?: number,
    preview?: string
  }
}
```

**Preview (card):** File icon + name + size + MIME badge
**Full view:** Text preview (for text files), hex view (for binary), image preview (for images)
**Export:** Direct download of the original file

### 3. `assessment` — Assessment Lifecycle Card

**Produced by:** Regulatory assimilation use case (summary-builder)

**Data shape:**

```typescript
{
  kind: 'assessment',
  title: string,               // e.g., "DORA Regulatory Assessment"
  assessmentId: string,
  status: 'draft' | 'in-progress' | 'complete' | 'approved' | 'archived',
  version: number,
  regulationName?: string,
  jurisdiction?: string,
  stats: {
    totalRequirements: number,
    mappedCount: number,
    partialCount: number,
    gapCount: number,
    pendingCount: number,
    coveragePercent: number,
    averageConfidence: number
  },
  topGaps?: Array<{
    severity: string,
    sourceRef: string,
    gapDescription: string
  }>
}
```

**Preview (card):** Status badge, circular progress ring (coverage %), gap count
**Full view:** Full stats dashboard with coverage breakdown chart, gap list,
status timeline, approve/archive actions
**Export:** JSON, CSV (of requirement mappings), PDF (assessment report)

### 4. `mapping` — Requirement-to-Control Mapping

**Produced by:** `reg_map_frameworks`, `reg_scope`, regulatory assimilation matching engine

**Data shape:**

```typescript
{
  kind: 'mapping',
  title: string,
  mappings: Array<{
    sourceRef: string,
    sourceText: string,
    targetRef: string,         // e.g., "NIST CSF GV.OC-01"
    targetText: string,
    framework: string,         // 'nist-csf-v2' | 'nist-800-53-rev5'
    confidence: number,        // 0-1
    status: 'mapped' | 'partial' | 'gap' | 'pending',
    rationale: string,
    gapDescription?: string,
    recommendedLanguage?: string
  }>
}
```

**Preview (card):** Mapped/partial/gap donut chart + count badges
**Full view:** Interactive mapping table with confidence color bars, expandable rationale,
filter by status/framework/confidence, bulk actions
**Export:** JSON, CSV

### 5. `kpi` — Summary Statistics / KPI Tiles

**Produced by:** Summary builder, any tool that generates aggregate metrics

**Data shape:**

```typescript
{
  kind: 'kpi',
  title: string,
  metrics: Array<{
    label: string,
    value: number | string,
    unit?: string,             // '%', 'count', 'days', etc.
    trend?: 'up' | 'down' | 'flat',
    trendValue?: string,       // e.g., "+12% vs last quarter"
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'neutral'
  }>
}
```

**Preview (card):** 2x2 grid of metric tiles with large numbers
**Full view:** Full metric dashboard with optional sparklines
**Export:** JSON, CSV

### 6. `entity` — Structured Entity Card

**Produced by:** `snow_cmdb` (CI items), `ping_federate` (IdP profiles), `db_lookup` (documents)

**Data shape:**

```typescript
{
  kind: 'entity',
  title: string,
  entityType: string,          // 'cmdb_ci' | 'idp_profile' | 'policy' | 'standard' | 'control' | 'risk_statement'
  entityId: string,
  fields: Array<{
    label: string,
    value: string | number | boolean,
    type?: 'text' | 'code' | 'url' | 'date' | 'badge'
  }>,
  metadata?: Record<string, unknown>
}
```

**Preview (card):** Entity type icon + title + 2-3 key fields
**Full view:** Full field list with copy buttons, related entity links
**Export:** JSON

### 7. `flow` — Sequence/Flow Diagram

**Produced by:** `url_flow_check` (redirect chains), future auth flow analysis,
disaster recovery dependency chains

**Data shape:**

```typescript
{
  kind: 'flow',
  title: string,
  steps: Array<{
    label: string,
    status: 'success' | 'redirect' | 'error' | 'pending',
    detail?: string,           // URL, status code, etc.
  }>,
  loopDetected?: boolean,
  finalStatus?: string
}
```

**Preview (card):** Horizontal step indicators (dots connected by lines)
**Full view:** Vertical flow diagram with full details per step
**Export:** JSON, SVG

### 8. `action` — Triggered Update Action

**Produced by:** Regulatory assimilation (triggered-content-update-actions),
policy management (proposed updates)

**Data shape:**

```typescript
{
  kind: 'action',
  title: string,
  actions: Array<{
    triggerId: string,
    sourceRef: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    updateTargets: string[],   // 'policy' | 'standard' | 'technical' | 'control' | 'kpi'
    description: string,
    status: 'pending' | 'approved' | 'dismissed'
  }>
}
```

**Preview (card):** Count of pending actions with severity breakdown
**Full view:** Action list with approve/dismiss buttons, severity badges,
target entity links
**Export:** JSON, CSV

---

## How Each UI Concept Handles the Extended Artifact Set

### Option A: Command Center

The right **Artifacts Panel** groups artifacts by kind with section headers:

```
┌─ ARTIFACTS ─────────────────┐
│                              │
│  ▸ Charts (2)                │
│  ┌────────────────────────┐  │
│  │ 📊 Revenue by Quarter  │  │
│  │ 📊 Risk Distribution   │  │
│  └────────────────────────┘  │
│                              │
│  ▸ Mappings (1)              │
│  ┌────────────────────────┐  │
│  │ 🔗 DORA Art.5 Mapping  │  │
│  │    ●●●○ 14/18 mapped   │  │
│  └────────────────────────┘  │
│                              │
│  ▸ Assessments (1)           │
│  ┌────────────────────────┐  │
│  │ 📋 DORA Assessment     │  │
│  │    ▓▓▓▓▓▓░░ 78%        │  │
│  └────────────────────────┘  │
│                              │
│  ▸ Changes (2)               │
│  ┌────────────────────────┐  │
│  │ ± ACC-POL-001 diff     │  │
│  │ ± DR-STD-003 diff      │  │
│  └────────────────────────┘  │
│                              │
│  ▸ Files (1)                 │
│  ┌────────────────────────┐  │
│  │ 📄 compliance_report…  │  │
│  │    PDF · 2.1 MB         │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

The left **Activity Rail** adds a grouping for tool calls by tool name, with
tool-category headers (Retrieval, Regulatory, Data, Integration, URL/Media)
so users can follow the agent's reasoning process.

### Option B: Focus

The right **Artifacts FAB** badge increments for ALL artifact types. The slide-over
panel uses a **tabbed view at the top** to filter by kind:

```
┌─ Artifacts ──────────────────────────── ✕ ─┐
│                                             │
│  [All 7]  [Charts 2]  [Tables 1]           │
│  [Mappings 1]  [Diffs 2]  [Files 1]        │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  📊 Revenue by Quarter                │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │                                 │  │  │
│  │  │       [full Recharts chart]     │  │  │
│  │  │                                 │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  [↓ JSON] [↓ PNG] [↓ CSV]            │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  ± Proposed changes to ACC-POL-001    │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  - old text in red              │  │  │
│  │  │  + new text in green            │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  Confidence: 0.87  [Approve] [Dismiss]│  │
│  │  [↓ JSON] [↓ Markdown]               │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Option C: Workspace

The dock's **Artifacts tab** horizontal card strip uses distinct card templates per kind.
The tab bar adds dynamic sub-filters:

```
[Artifacts ▾]  [Tool Log ▾]  [Tasks ▾]  [Assessments ▾]

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ 📊       │ │ 🔗       │ │ ±        │ │ 📄       │ │ ⚡       │
  │ Revenue  │ │ DORA     │ │ ACC-POL  │ │ report   │ │ 3 update │
  │ by Qtr   │ │ Mapping  │ │ -001     │ │ .pdf     │ │ actions  │
  │ [chart]  │ │ ●●●○     │ │ +12 -3   │ │ 2.1 MB   │ │ pending  │
  │ [↓]      │ │ [↓]      │ │ [↓]      │ │ [↓]      │ │ [↓]      │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

The **Assessments tab** becomes a first-class dock tab (not just an artifact) showing
the full assessment lifecycle dashboard with status transitions.

---

## Streaming Protocol Extensions

The current `StreamEvent` union handles the new artifact types with zero protocol changes
because the `block` event type already carries `Record<string, unknown>`:

```typescript
{ type: 'block', block: { kind: 'diff', title: '...', ... } }
{ type: 'block', block: { kind: 'file', title: '...', ... } }
{ type: 'block', block: { kind: 'assessment', title: '...', ... } }
```

The UI's artifact registry pattern means new `kind` values are handled gracefully:

1. Known kind → dedicated renderer
2. Unknown kind → generic JSON viewer with download

The only protocol addition worth considering for the future:

```typescript
// New event type: progress indicator for long-running operations
{ type: 'progress', taskId: string, label: string, percent: number }
```

This would let the UI show a progress bar during multi-step operations like
regulatory assimilation (which can process dozens of requirements).

---

## Use-Case-Aware Navigation

The top bar navigation currently has `[Chat] [Assessments]`. As use cases expand,
this should evolve into a use-case-aware pattern:

### Near-term (2 active use cases)

```
◆ CEI    [Chat]  [Assessments]  [Policies]              user@co ▾
```

### Medium-term (4+ use cases)

```
◆ CEI    [Chat]  [Workspaces ▾]                         user@co ▾
                    ├─ Regulatory Assessments
                    ├─ Policy Management
                    ├─ Disaster Recovery
                    └─ Secure Authentication
```

Each "workspace" is a filtered view of assessments/artifacts for that use case.
The Chat page remains the universal entry point — the agent routes to the right
use case based on conversation context.

---

## Session Continuity & Multi-Thread Support

The agent persists sessions server-side (`session:{sessionId}` in storage). The UI
should leverage this for:

1. **Session resume**: On page load, offer to resume the last session (if one exists)
   rather than always starting fresh
2. **Session history**: User menu → "Recent sessions" list showing last 5-10 sessions
   with first message preview and timestamp
3. **Thread-scoped artifacts**: When the user starts a "New Thread", artifacts from
   previous threads remain accessible but are visually separated (dimmed border or
   "Previous thread" section header in the artifact panel)

---

## Assessment Lifecycle as First-Class UI Concern

Assessments are not just artifacts — they're living workflows with state transitions:

```
draft → in-progress → complete → approved → archived
```

The UI needs to handle:

1. **Status badges** on assessment artifacts that update in real-time as the agent works
2. **Approval flows**: When an assessment reaches "complete", surface an "Approve"
   action that the user can trigger (which calls back to the agent)
3. **Version history**: Assessments have `version` and `parent_version_id` — the UI
   should show version lineage when viewing an assessment
4. **Cross-session persistence**: An assessment started in one session can be continued
   in another. The Assessments page (already exists) should show all assessments with
   their current status

### How This Maps to Each Option

| Concern           | A: Command Center              | B: Focus                       | C: Workspace                           |
| ----------------- | ------------------------------ | ------------------------------ | -------------------------------------- |
| Assessment status | Badge in artifacts panel       | Toast + artifact card          | Dedicated dock tab                     |
| Approval flow     | Slide-over with approve button | Slide-over with approve button | Expanded dock card with approve button |
| Version history   | Dropdown in slide-over header  | Dropdown in slide-over header  | Timeline in expanded dock view         |

---

## Risk-Control Mapping Visualization

The agent's `db_lookup` with `type: 'risk-control-mapping'` supports operations like
`hotspots`, `unmapped-risks`, `duplicate-controls`, and `residual-risk-summary`. These
produce complex analytical outputs that deserve purpose-built visualizations:

- **Hotspots**: Heat map showing risk-control density (which controls cover the most risks)
- **Unmapped risks**: Sorted list with severity highlighting
- **Duplicate controls**: Grouped view showing overlapping control coverage
- **Residual risk summary**: Risk matrix (likelihood x impact) with color coding

These would be additional chart types within the existing `chart` artifact renderer,
or new renderers in the registry:

```typescript
'heatmap':     heatmapRenderer,      // For hotspot analysis
'matrix':      matrixRenderer,       // For risk matrices
'sankey':      sankeyRenderer,       // For control-to-risk flow visualization
```

---

## Governance Profile Editor

The `org_preferences` tool reads and writes the organization's governance profile.
This is currently invisible in the UI but will become important as users customize
their compliance posture. Options:

1. **Dedicated settings page** (`/settings`): Form-based editor for governance
   preferences, accessible from user menu
2. **Agent-mediated**: User tells the agent "update our classification tagging gate
   to require approval" and the agent uses `org_preferences` set action
3. **Hybrid**: Agent shows proposed preference changes as an `action` artifact
   that the user approves before it takes effect

---

## Export & Reporting Primitive

Multiple use cases will need to generate exportable reports. Rather than building
report generation per-use-case, the UI should have a **Report Builder** primitive:

- User selects multiple artifacts from a session (checkboxes in artifact panel/dock)
- Clicks "Generate Report"
- UI compiles selected artifacts into a single downloadable document:
  - **PDF**: Charts as images, tables as formatted tables, text as body copy
  - **Markdown**: Portable text format with embedded data
  - **XLSX**: Each table artifact becomes a worksheet

This is a UI-side operation that doesn't require agent involvement — it just
composes the artifact data that already exists client-side.

---

## Updated Comparison Matrix

| Dimension                    | A: Command Center              | B: Focus                            | C: Workspace                             |
| ---------------------------- | ------------------------------ | ----------------------------------- | ---------------------------------------- |
| **Artifact types supported** | All (registry-based)           | All (registry-based)                | All (registry-based)                     |
| **New artifact type cost**   | Add renderer, appears in panel | Add renderer, appears in slide-over | Add renderer, appears as dock card       |
| **Assessment lifecycle**     | Panel card with status badge   | Toast + floating card               | Dedicated dock tab                       |
| **Diff viewing**             | Slide-over with split pane     | Slide-over with split pane          | Dock expansion with split pane           |
| **File downloads**           | Panel card with icon/size      | Inline card + slide-over            | Dock card with icon/size                 |
| **Multi-use-case nav**       | Top bar dropdown               | Top bar dropdown                    | Top bar dropdown + dock tab per use case |
| **Report builder**           | Multi-select in panel → export | Multi-select in slide-over → export | Multi-select in dock → export            |
| **Governance settings**      | Settings page via user menu    | Settings page via user menu         | Settings page via user menu              |
| **Session resume**           | Session picker in user menu    | Session picker in user menu         | Session picker in user menu              |

---

## Implementation Priority

### Phase 1: Foundation (supports current 3 block types + extensibility)

1. Artifact type registry with generic fallback renderer
2. Core artifact interface with `id`, `kind`, `title`, `data`, `exportFormats`
3. SlideOver component
4. Chart, Table, Recommendation renderers (migrate existing)
5. Multi-format download (JSON, CSV, PNG)

### Phase 2: Agent-Aligned (supports current 14 tools + 2 active use cases)

6. `diff` renderer (for propose_changes)
7. `file` renderer (for media tool)
8. `assessment` renderer (for regulatory assimilation lifecycle)
9. `mapping` renderer (for reg_map_frameworks output)
10. `kpi` renderer (for summary statistics)
11. Assessment lifecycle status tracking
12. Session resume / history

### Phase 3: Growth (supports future use cases)

13. `flow` renderer (for url_flow_check, future auth flow)
14. `entity` renderer (for CMDB items, IdP profiles)
15. `action` renderer (for triggered update actions)
16. Report builder (multi-artifact export)
17. Use-case workspace navigation
18. `heatmap`/`matrix`/`sankey` chart subtypes
19. Governance profile settings page
