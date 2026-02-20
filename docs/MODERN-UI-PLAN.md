# Modern UI Plan — Datadog-Caliber CEI Experience

> **Status:** Draft — reviewed by Codex (gpt-5.3-codex), 8 recommendations applied
> **Date:** 2026-02-20 (updated post-review)
> **Author:** Clawd (orchestrating Codex)
> **Repo:** `~/development/cei-ui` (React 18, Vite, Vitest, 252 tests)
> **Agent Repo:** `~/development/cei-agent` (5051 tests, Modern Prompt Composer complete)
> **Prerequisite:** Modern Prompt Composer Phases 0-6 ✅ (all agents ship `modernContext`)
> **Agent Addendum:** `cei-agent/docs/MODERN-AGENT-READINESS-ADDENDUM.md` — 7 agent-side phases (A-G) that must run before/alongside UI phases: streaming fix, seed data, home feed bridge

---

## Table of Contents

1. [Vision](#1-vision)
2. [Current State Audit](#2-current-state-audit)
3. [What Gets Eliminated](#3-what-gets-eliminated)
4. [What Gets Preserved](#4-what-gets-preserved)
5. [Architecture: New Foundation](#5-architecture-new-foundation)
6. [Data Contract: Agent → UI](#6-data-contract-agent--ui)
7. [Component Architecture](#7-component-architecture)
8. [Page Architecture](#8-page-architecture)
9. [Streaming Engine Overhaul](#9-streaming-engine-overhaul)
10. [Entity System](#10-entity-system)
11. [Visualization Engine](#11-visualization-engine)
12. [Implementation Phases](#12-implementation-phases)
13. [Migration Strategy](#13-migration-strategy)
14. [Test Strategy](#14-test-strategy)

---

## 1. Vision

CEI is a **security operations platform**, not a chatbot with a sidebar. The current UI was built incrementally — chat-first, features bolted on. The Modern Prompt Composer now ships rich structured data (`storyCards`, `entityGraph`, `vizHints`, `pivotTargets`) that the current UI cannot render. Rather than bolt on more components to a chat-centric layout, we rebuild the experience around the data.

### Design North Star: Datadog for Security Governance

| Datadog Concept | CEI Equivalent | Current State | Target State |
|---|---|---|---|
| **Dashboard** | Home + Posture Overview | Basic feed cards | Live posture dashboard with story cards, gauges, topology |
| **Service Map** | Entity Topology | ❌ None | Interactive D3 node graph (controls ↔ risks ↔ frameworks) |
| **Watchdog Stories** | Story Cards | ❌ None | Severity-badged cards with correlated signals, inline in responses AND on Home |
| **Side Panel** | Entity Detail Panel | ❌ None | Slide-in panel with tabs (Overview, Related, History) |
| **Pivot Links** | Entity Chips | ❌ None | Clickable `[[entity:type:id|name]]` chips in agent responses |
| **Heatmaps/Charts** | Viz Hints | Basic Recharts blocks | Agent-driven visualization hints rendered as contextual charts |
| **Live Tail** | Activity Feed | Tool log drawer | Real-time activity stream with severity filtering |
| **Notebooks** | Interactive Reports | Static PPTX/PDF | Live data widgets mixed with narrative (future) |

### Key Principle: Eliminate, Don't Accumulate

The old UI has accumulated layers:
- A `ChatPage` component that does nothing (39 lines, just renders CommandCenter)
- A `ChatMessageList` types file used only for re-exports
- Legacy `AppLayout` (61 lines, just an Outlet wrapper) alongside the real `CommandCenter`
- Home page with mock feed data that duplicates real feed schemas
- Separate `components/` and `primitives/` directories with overlapping concerns
- `SectionCard` component used nowhere

**This plan eliminates dead code, merges overlapping modules, and restructures around the new data model.**

---

## 2. Current State Audit

### File Inventory (84 source files, 252 tests)

| Directory | Files | Purpose | Verdict |
|---|---|---|---|
| `agent/` | 2 | AgentClient + types | **Evolve** — add `modernContext` to stream schema |
| `artifacts/` | 6 | ArtifactRegistry + renderers | **Evolve** — renderers become entity-aware |
| `auth/` | 5 | Cognito auth | **Keep as-is** |
| `components/` | 7 | ChatPage, ChatMessageList, blocks, Toast, etc. | **Eliminate** — merge into new structure |
| `components/blocks/` | 5 | ChartBlock, TableBlock, RecommendationBlock, TaskProgress | **Evolve** — move to `blocks/`, add Modern blocks |
| `feedback/` | 5 | Feedback dashboard + slide-over | **Keep** (move to admin/) |
| `home/` | 8 | HomePage, feed, mock data | **Rebuild** — posture dashboard with story cards |
| `hooks/` | 2 | useChatEngine, useThreads | **Rebuild** — useChatEngine gains modernContext |
| `layout/` | 1 | AppLayout (dead wrapper) | **Eliminate** |
| `layouts/` | 2 | CommandCenter + types | **Evolve** — becomes the shell, gains entity panel |
| `metrics/` | 1 | MetricsPage | **Evolve** — becomes data-driven from agent metrics |
| `operations/` | 4 | Operations page | **Keep** |
| `primitives/` | 25 | UI atoms (Composer, MessageList, TopBar, etc.) | **Evolve** — core primitives stay, add entity-aware ones |
| `roadmap/` | 5 | Roadmap page | **Keep** |
| `threads/` | 1 | Thread types | **Merge** into hooks/useThreads |
| `utils/` | 1 | relativeTime | **Keep** |

### Critical Resize Fixes to Preserve

These were hard-won fixes for viewport resizing, mobile breakpoints, and overflow:

1. **`100dvh` height** (`layout-command-center.css:6`) — Uses `dvh` for mobile browser chrome
2. **Grid overflow isolation** (`layout-command-center.css:1-3`) — `isolation: isolate` + `overflow: hidden` on shell
3. **`min-height: 0` on grid children** (lines 62, 63, 69, 180) — Prevents grid blowout
4. **`min-width: 0` on center panel** (line 181) — Prevents horizontal overflow
5. **Compact viewport media query** (`COMPACT_VIEWPORT_QUERY = '(max-width: 1024px)'`) — Responsive breakpoint
6. **`matchMedia` listener with cleanup** (CommandCenter.tsx:295-318) — Proper resize detection
7. **Mobile slide-over/drawer pattern** (SlideOver + SlideUpDrawer) — Touch-friendly mobile panels
8. **Tool status bar overflow fix** (commit `6c369fa`) — Prevents mobile text clip
9. **Artifact overlay CSS containment** (`artifact-overlay-css.test.ts`) — Tested CSS constraints
10. **`grid-template-columns` transition** (line 68) — Smooth rail collapse/expand

**All of these move forward into the new layout system.** They're battle-tested.

---

## 3. What Gets Eliminated

### Dead Code (remove immediately)

| File | Why It's Dead |
|---|---|
| `components/ChatPage.tsx` (39 lines) | Wrapper that just renders `<CommandCenter>` — the route should render CommandCenter directly |
| `components/ChatPage.css` | Styles for dead ChatPage |
| `components/ChatPage.test.tsx` | Tests for dead ChatPage |
| `components/ChatMessageList.tsx` (303 lines) | **Only used for type re-exports.** The actual message list is `primitives/MessageList.tsx`. Types should live in a shared types file. |
| `components/ChatMessageList.test.tsx` | Tests for the dead re-export file |
| `components/SectionCard.tsx` | **Zero imports anywhere in the codebase** |
| `layout/AppLayout.tsx` (61 lines) | Just renders `<Outlet />` with a class name. Redundant with CommandCenter. |
| `layout/__tests__/AppLayout.test.tsx` | Tests for dead wrapper |
| `layout/app-layout.css` | Styles for dead wrapper |
| `threads/types.ts` | Type definitions that belong in `hooks/useThreads.ts` |
| `home/mockFeedData.ts` | Mock data that duplicates real `feedSchema.ts` types — tests should use builders |

### Legacy Patterns (replace during rebuild)

| Pattern | Problem | Replacement |
|---|---|---|
| Flat text message rendering | Agent response is raw markdown string | Parse `[[entity:type:id\|name]]` → render EntityChips |
| Block-only artifacts | Only `StructuredBlock` types in artifact rail | Add `storyCard`, `vizHint`, `entityGraph` artifact types |
| Three separate type locations | `components/ChatMessageList` types, `agent/types`, `threads/types` | Single `src/types/` directory |
| `blockRenderer` prop switching | 4 rendering modes for same block | Single adaptive renderer with context-aware sizing |
| Inline-only charts | Recharts rendered inside message bubbles | Contextual chart rendering (inline preview → expanded → fullscreen) |

---

## 4. What Gets Preserved

### Core Architecture (proven, keep)

- **CommandCenter 3-panel layout** — Left (threads), Center (conversation), Right (artifacts/context)
- **useChatEngine hook** — Core streaming state machine (1341 lines, well-tested)
- **useThreads hook** — Client-side thread management
- **Streaming SSE protocol** — `invokeAgentStream()` with abort controller
- **Artifact zoom state machine** — inline → expanded → fullscreen transitions
- **ArtifactRegistry** — Pluggable renderer pattern
- **Zod schema validation** — `streamEventSchema`, `structuredBlockSchema` at the boundary
- **CSS custom properties** — Design tokens in `theme/tokens.css`
- **"War Room Precision" design system** — Dark palette, amber accents, DM Sans + JetBrains Mono

### Resize & Responsive Fixes (all preserved)

Every fix listed in §2 is carried forward. The new layout system builds ON these, not alongside them.

### Existing Block Renderers (evolved)

- `ChartBlock` → gains viz hint awareness
- `TableBlock` → gains entity chip parsing in cells
- `RecommendationBlock` → gains severity from story cards
- `TaskProgressBlock` → unchanged
- `DocumentArtifact`, `AssessmentListArtifact`, `AssessmentDetailArtifact` → unchanged

---

## 5. Architecture: New Foundation

### Directory Structure

```
src/
├── agent/                          # API client + stream protocol
│   ├── AgentClient.ts              # KEEP — add modernContext parsing
│   └── types.ts                    # EVOLVE — add ModernContext schemas
│
├── auth/                           # KEEP AS-IS
│
├── types/                          # NEW — consolidated type definitions
│   ├── chat.ts                     # Merged from ChatMessageList + threads/types
│   ├── modern-context.ts           # ModernContext, StoryCard, EntityGraph, etc.
│   ├── entity.ts                   # EntityReference, EntityChip props
│   └── stream.ts                   # Stream event types (moved from agent/types)
│
├── hooks/                          # State machines
│   ├── useChatEngine.ts            # EVOLVE — add modernContext state
│   ├── useThreads.ts               # KEEP
│   ├── useEntityPanel.ts           # NEW — entity detail panel state
│   ├── useEntityResolver.ts        # NEW — fetch entity detail by type+id
│   └── useHomeFeed.ts              # MOVED from home/ — rewritten for story cards
│
├── shell/                          # NEW — replaces layouts/ and layout/
│   ├── AppShell.tsx                # Top-level layout (replaces AppLayout + CommandCenter routing)
│   ├── CommandCenter.tsx           # MOVED from layouts/ — the 3-panel layout
│   ├── EntityPanel.tsx             # NEW — right-rail entity detail (slide-in)
│   ├── ContextRail.tsx             # NEW — replaces static artifacts rail
│   ├── TopBar.tsx                  # MOVED from primitives/
│   ├── layout-shell.css            # EVOLVED from layout-command-center.css
│   └── types.ts                    # MOVED from layouts/types
│
├── conversation/                   # NEW — replaces components/ + parts of primitives/
│   ├── MessageList.tsx             # EVOLVED from primitives/MessageList.tsx
│   ├── MessageBubble.tsx           # NEW — extracted from MessageList
│   ├── EntityChipParser.tsx        # NEW — parse [[entity:...]] in text segments
│   ├── StoryCardInline.tsx         # NEW — story card rendered inline in messages
│   ├── Composer.tsx                # MOVED from primitives/
│   ├── ToolStatusBar.tsx           # MOVED from primitives/
│   └── EmptyState.tsx              # NEW — extracted welcome screen
│
├── blocks/                         # EVOLVED from components/blocks/
│   ├── ChartBlock.tsx              # EVOLVED — viz hint awareness
│   ├── TableBlock.tsx              # EVOLVED — entity chip parsing in cells
│   ├── RecommendationBlock.tsx     # KEEP
│   ├── TaskProgressBlock.tsx       # KEEP
│   ├── BlockDownloadButton.tsx     # KEEP
│   └── StoryCardBlock.tsx          # NEW — full story card block renderer
│
├── entities/                       # NEW — the entity system
│   ├── EntityChip.tsx              # Clickable entity reference chip
│   ├── EntityChip.css
│   ├── EntityDetailPanel.tsx       # Slide-in detail panel with tabs
│   ├── EntityTopology.tsx          # D3/vis.js interactive node graph
│   ├── EntityRelationshipMatrix.tsx # Tabular entity relationship view
│   ├── EntityBadge.tsx             # Type icon + status color badge
│   ├── entityTypeConfig.ts         # Icon, color, label mapping per EntityType
│   └── entityUtils.ts              # Parse [[entity:...]], resolve display
│
├── stories/                        # NEW — story card system
│   ├── StoryCard.tsx               # Full story card component
│   ├── StoryCard.css
│   ├── StoryCardList.tsx           # Vertical stack of story cards
│   ├── StoryCardMini.tsx           # Compact card for Home feed
│   ├── StorySeverityBadge.tsx      # Severity indicator (critical/high/medium/low/info)
│   └── StoryTimeline.tsx           # Temporal window visualization
│
├── viz/                            # NEW — visualization hint rendering
│   ├── VizHintRenderer.tsx         # Route vizHint.chartType → correct chart
│   ├── GaugeChart.tsx              # Radial gauge (new)
│   ├── TopologyChart.tsx           # Network topology (wraps D3)
│   ├── TimelineChart.tsx           # Temporal event timeline
│   ├── HeatmapChart.tsx            # Distribution heatmap
│   ├── EnhancedChartBlock.tsx      # Evolved ChartBlock with viz hint data
│   └── viz-theme.ts               # Chart color tokens, consistent with design system
│
├── artifacts/                      # EVOLVED — gains Modern artifact types
│   ├── ArtifactRegistry.ts         # KEEP — register new types
│   ├── registerBuiltinTypes.ts     # EVOLVE — register Modern types
│   └── renderers/                  # EVOLVE — add Modern renderers
│       ├── (existing renderers)
│       ├── StoryCardArtifact.tsx    # NEW
│       ├── EntityGraphArtifact.tsx  # NEW
│       └── VizHintArtifact.tsx      # NEW
│
├── home/                           # REBUILT — posture dashboard
│   ├── HomePage.tsx                # Rebuilt with story cards + entity overview
│   ├── PostureOverview.tsx         # NEW — aggregate posture gauge/summary
│   ├── AttentionSection.tsx        # EVOLVED — renders StoryCardMini from modernContext
│   ├── MetricsGlance.tsx           # EVOLVED — renders VizHints
│   ├── QuickStartGrid.tsx          # KEEP
│   ├── HomeWelcome.tsx             # KEEP
│   ├── feedSchema.ts               # EVOLVE — add modernContext fields
│   ├── useHomeFeed.ts              # MOVED to hooks/ (re-export for compat)
│   └── home.css                    # EVOLVED
│
├── admin/                          # EVOLVED — gains Composer Config
│   ├── AdminDashboard.tsx          # KEEP
│   ├── AdminLayout.tsx             # KEEP
│   ├── IntegrationsPage.tsx        # KEEP
│   ├── ComposerConfigPage.tsx      # NEW — per-agent version toggling
│   └── IntegrationsApi.ts          # KEEP
│
├── feedback/                       # KEEP AS-IS (stays in admin/)
├── metrics/                        # EVOLVE — data-driven from agent metrics
├── operations/                     # KEEP AS-IS
├── roadmap/                        # KEEP AS-IS
├── theme/                          # KEEP — tokens.css
└── utils/                          # KEEP — relativeTime
```

### Key Architectural Decisions

1. **`shell/` replaces `layout/` + `layouts/`** — One canonical layout system, no dead wrappers
2. **`conversation/` replaces `components/` + message parts of `primitives/`** — Message rendering is a domain, not a generic primitive
3. **`entities/` is a first-class module** — Entity chips, panels, topology are the core innovation
4. **`stories/` is a first-class module** — Story cards are the "Watchdog" equivalent
5. **`viz/` is a first-class module** — Visualization hints get their own rendering engine
6. **`types/` consolidates all shared types** — No more 3 separate type locations
7. **`primitives/` retains only true UI primitives** — SlideOver, SlideUpDrawer, FAB, TabBar, etc.

---

## 6. Data Contract: Agent → UI

### Stream Protocol Changes

The agent currently streams events via SSE:
```
delta → text chunk
block → structured block (chart, table, recommendation, document)
task-progress → step tracker
tool_call / tool_result → tool activity
done → stream complete
error → error
```

**New events needed:**

```typescript
// New stream event types
z.object({
  type: z.literal('modern-context'),
  modernContext: ModernContextSchema,
})
```

The `modern-context` event is emitted **once** near the end of the stream (after all `delta` events, before `done`). It carries the full `ModernContext` payload from the agent's invocation response.

**Why a separate event vs. embedding in `done`?** Because the UI needs to start rendering story cards and entity chips as soon as possible. Waiting for `done` adds latency. The `modern-context` event can arrive while the LLM is still generating its final text tokens.

### ModernContext Zod Schema (UI-side)

```typescript
// src/types/modern-context.ts

import { z } from 'zod'

export const entityTypeSchema = z.enum([
  'control', 'risk', 'metric', 'policy', 'standard', 'framework',
  'vendor', 'asset', 'finding', 'person', 'team', 'process',
  'vulnerability', 'cve', 'patch', 'exploit', 'affected_asset',
  'scan', 'sla_policy', 'remediation_group',
  'recovery_plan', 'rto_rpo_target', 'bc_scenario', 'test_exercise',
  'dependency', 'critical_process', 'recovery_team', 'alternate_site',
  'communication_plan', 'escalation_tier', 'vital_record', 'crisis_action',
])

export const entityReferenceSchema = z.object({
  type: entityTypeSchema,
  id: z.string(),
  name: z.string(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export const entityRelationshipSchema = z.object({
  source: entityReferenceSchema,
  target: entityReferenceSchema,
  relationshipType: z.string(),
  weight: z.number().optional(),
})

export const entityGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string(),
  nodeIds: z.array(z.string()),
})

export const entityGraphSchema = z.object({
  nodes: z.array(entityReferenceSchema),
  edges: z.array(entityRelationshipSchema),
  groups: z.array(entityGroupSchema).optional(),
})

export const storyCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  narrative: z.string(),
  correlatedEntities: z.array(entityReferenceSchema),
  temporalWindow: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  triggerMetrics: z.array(z.string()).optional(),
  recommendedActions: z.array(z.string()).optional(),
})

export const vizHintSchema = z.object({
  chartType: z.enum([
    'bar', 'line', 'pie', 'radar', 'heatmap', 'treemap',
    'gauge', 'topology', 'timeline', 'table',
  ]),
  title: z.string(),
  dataKeys: z.array(z.string()),
  groupBy: z.string().optional(),
  description: z.string().optional(),
})

export const pivotTargetSchema = z.object({
  entity: entityReferenceSchema,
  suggestedAction: z.string(),
  targetUseCase: z.string().optional(),
})

export const modernContextSchema = z.object({
  storyCards: z.array(storyCardSchema),
  entityGraph: entityGraphSchema,
  vizHints: z.array(vizHintSchema),
  pivotTargets: z.array(pivotTargetSchema),
})

export type EntityType = z.infer<typeof entityTypeSchema>
export type EntityReference = z.infer<typeof entityReferenceSchema>
export type EntityGraph = z.infer<typeof entityGraphSchema>
export type StoryCard = z.infer<typeof storyCardSchema>
export type VisualizationHint = z.infer<typeof vizHintSchema>
export type PivotTarget = z.infer<typeof pivotTargetSchema>
export type ModernContext = z.infer<typeof modernContextSchema>
```

### Entity Reference Notation

The LLM embeds entity references in its text responses using this notation:
```
[[entity:control:AC-2|Account Management]]
[[entity:risk:RS-042|Privileged Access Abuse]]
[[entity:framework:NIST-800-53|NIST 800-53]]
```

The UI parses these into interactive `EntityChip` components. The regex:
```typescript
const ENTITY_NOTATION_PATTERN = /\[\[entity:([a-z_]+):([^\]|]+)\|([^\]]+)\]\]/g
```

---

## 7. Component Architecture

### 7.1 EntityChip — The Atomic Unit

Every entity reference in the UI resolves to an `EntityChip`. This is the single most important new component.

```
┌──────────────────────────────────────┐
│ 🛡️ AC-2 Account Management          │  ← EntityChip
│    ↑         ↑                       │
│    icon     name (from notation)     │
│    (by type)                         │
└──────────────────────────────────────┘
```

**Behavior:**
- Hover → tooltip with entity type + id
- Click → opens EntityPanel in the right rail
- Status color derived from `entityGraph.nodes` if available
- If entity not in graph → render as plain chip (no status)

### 7.2 StoryCard — Watchdog Equivalent

```
┌─────────────────────────────────────────────────────┐
│ 🔴 HIGH                                              │
│ ─────────────────────────────────────────────────── │
│ AC-2 effectiveness dropped 23% this quarter          │
│                                                      │
│ Cross-topology dependency gap: 3 critical            │
│ dependencies span topology boundaries without        │
│ validated fallback in disaster recovery.              │
│                                                      │
│ 📊 Correlated: [AC-2] [RS-042] [NIST-800-53]       │  ← EntityChips
│                                                      │
│ 💡 Recommended:                                      │
│ • Validate fallback paths for cross-topology deps    │
│ • Prioritize remediation for tier-1 dependencies     │
│                                                      │
│ 📅 Window: Nov 22 2025 → Feb 20 2026                │
└─────────────────────────────────────────────────────┘
```

### 7.3 EntityPanel — Contextual Side Panel

When any EntityChip is clicked, the right rail transforms into an entity detail panel:

```
┌──────────────────────────────────┐
│ ← Back to Artifacts              │
│                                  │
│ 🛡️ AC-2 Account Management      │
│ Type: control  Status: warning   │
│                                  │
│ ┌──────┬─────────┬───────────┐  │
│ │ Overview │ Related │ Graph │  │
│ ├──────────┴─────────┴───────┤  │
│ │                            │  │
│ │ [Overview Tab]             │  │
│ │ Last assessed: 2026-02-15  │  │
│ │ Effectiveness: 67%         │  │
│ │ Framework: NIST 800-53     │  │
│ │                            │  │
│ │ [Related Tab]              │  │
│ │ Mitigates: RS-042, RS-018 │  │
│ │ Maps to: NIST AC-2         │  │
│ │ Depends on: AC-1, AC-3     │  │
│ │                            │  │
│ │ [Graph Tab]                │  │
│ │ (Mini topology centered    │  │
│ │  on this entity)           │  │
│ │                            │  │
│ └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Data source:** The entity detail is derived from:
1. `modernContext.entityGraph` (nodes, edges, groups) — already in the response
2. `modernContext.pivotTargets` — suggested actions for this entity
3. Future: dedicated entity resolution API endpoint

### 7.4 ContextRail — Evolved Right Rail

The current right rail shows artifacts only. The new `ContextRail` is a multi-mode panel:

| Mode | When | Content |
|---|---|---|
| **Artifacts** | Default when artifacts exist | Artifact cards (current behavior) |
| **Entity Detail** | EntityChip clicked | Entity detail panel with tabs |
| **Story Cards** | Story cards in modernContext | Story card list above artifacts |
| **Topology** | Entity graph has >3 nodes | Mini topology map at top of rail |
| **Empty** | No artifacts, no entities | "Context will appear here" |

The rail modes stack: story cards appear ABOVE the artifact list, and the topology map appears as a collapsible section. Clicking an entity chip REPLACES the rail content with the entity detail panel.

---

## 8. Page Architecture

### 8.1 Home Page — Posture Dashboard

The Home page transforms from a simple feed list to a posture dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│ Good morning, Adam.                        Feb 20, 2026 1:30am │
│                                                                  │
│ ┌─── Posture Overview ──────────────────────────────────────┐   │
│ │                                                            │   │
│ │  🛡️ R&C: 78%   🔍 VM: 85%   🔄 DR: 62%                  │   │
│ │  ████████░░     █████████░     ██████░░░░                  │   │
│ │                                                            │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─── Attention Required ────────────────────────────────────┐   │
│ │                                                            │   │
│ │  🔴 HIGH: AC-2 effectiveness dropped 23%                   │   │
│ │  Cross-topology dependency gap detected...                 │   │
│ │  [AC-2] [RS-042] [NIST-800-53]                            │   │
│ │                                                            │   │
│ │  🟡 MEDIUM: 3 CVEs approaching SLA breach                 │   │
│ │  SLA topology indicates backlog exceeding threshold...     │   │
│ │  [CVE-2025-1234] [patch-group-A]                          │   │
│ │                                                            │   │
│ │  🟡 MEDIUM: DR test exercise overdue by 60 days           │   │
│ │  Test readiness gap in disaster recovery...                │   │
│ │  [exercise-1] [team-alpha]                                 │   │
│ │                                                            │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─── Quick Start ───────────────────────────────────────────┐   │
│ │  [Risk Review] [Compliance Check] [Vuln Scan] [DR Plan]   │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Data sources:**
- Posture gauges → aggregate from latest `modernContext.vizHints` across agents
- Story cards → from Home feed endpoint (already exists), enriched with `modernContext`
- Entity chips in stories → parsed from story card `correlatedEntities`

### 8.2 Chat Page — Entity-Aware Conversation

The conversation center gains entity awareness:

1. **Text segments** are parsed for `[[entity:...]]` notation → rendered as `EntityChip`
2. **Story cards** from `modernContext` are rendered above the agent's text response
3. **Viz hints** are rendered as contextual charts inline or in the artifact rail
4. **Entity graph** populates the topology section of the context rail

### 8.3 Admin → Composer Config Page

New route: `/admin/composer-config`

Renders a table of agents with their active composer version (legacy/modern) and a toggle to switch. Calls `PUT /api/admin/composer-config/:agentId` on the agent API.

---

## 9. Streaming Engine Overhaul

### useChatEngine Changes

The `useChatEngine` hook (1341 lines) is the state machine for conversation. Changes needed:

#### Per-Message ModernContext (not thread-global)

**Critical design decision:** `modernContext` is stored **per assistant message**, not as a single thread-level object. Each agent response may produce different story cards, entity graphs, and viz hints. A thread-global `modernContext` would overwrite previous turns and mis-drive the entity panel/rail.

```typescript
// ChatTimelineItem gains optional modernContext
export interface ChatTimelineItem {
  // ... existing fields ...
  modernContext?: ModernContext | null  // NEW — only on assistant messages
}
```

#### New Stream Event Handler

```typescript
// In the stream event loop, add:
if (streamEvent.type === 'modern-context') {
  // Validate with safeParse to degrade gracefully on malformed data
  const parsed = modernContextSchema.safeParse(streamEvent.modernContext)
  if (parsed.success) {
    // Attach to the current assistant message being built
    currentMessage.modernContext = parsed.data
  }
  // On parse failure: silently degrade — no modernContext for this message
  continue
}
```

#### Expose in ChatEngine Interface

```typescript
export interface ChatEngine {
  // ... existing fields ...
  /** Returns the modernContext for the most recent assistant message, or null */
  latestModernContext: ModernContext | null  // NEW — derived from last assistant message
}
```

#### Snapshot/Restore

No changes needed to `ConversationSnapshot` — `modernContext` travels with each `ChatTimelineItem`. Thread switching naturally preserves per-message context.

#### Entity Chip Click Handler

```typescript
// New callback in ChatEngine
onEntityClick: (entityRef: EntityReference) => void
```

This opens the EntityPanel in the right rail. The panel draws data from the `modernContext` of the message containing the clicked entity chip.

---

## 10. Entity System

### Entity Type Configuration

```typescript
// src/entities/entityTypeConfig.ts

export interface EntityTypeConfig {
  icon: string        // Emoji or SVG path
  label: string       // Human-readable type name
  color: string       // CSS custom property name
  category: 'governance' | 'vulnerability' | 'disaster-recovery' | 'core'
}

export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  control:          { icon: '🛡️', label: 'Control',          color: '--accent',          category: 'governance' },
  risk:             { icon: '⚠️', label: 'Risk',              color: '--warning',         category: 'governance' },
  framework:        { icon: '📋', label: 'Framework',         color: '--chart-series-3',  category: 'governance' },
  policy:           { icon: '📜', label: 'Policy',            color: '--chart-series-4',  category: 'governance' },
  metric:           { icon: '📊', label: 'Metric',            color: '--text-muted',      category: 'core' },
  vulnerability:    { icon: '🔓', label: 'Vulnerability',     color: '--severity-high',   category: 'vulnerability' },
  cve:              { icon: '🐛', label: 'CVE',               color: '--severity-high',   category: 'vulnerability' },
  recovery_plan:    { icon: '🔄', label: 'Recovery Plan',     color: '--accent-strong',   category: 'disaster-recovery' },
  dependency:       { icon: '🔗', label: 'Dependency',        color: '--chart-series-2',  category: 'disaster-recovery' },
  // ... all 32 entity types
}
```

### Entity Notation Parser

```typescript
// src/entities/entityUtils.ts

const ENTITY_PATTERN = /\[\[entity:([a-z_]+):([^\]|]+)\|([^\]]+)\]\]/g

export interface ParsedEntityRef {
  type: EntityType
  id: string
  displayName: string
  raw: string       // Original [[entity:...]] string
  startIndex: number
  endIndex: number
}

export function parseEntityNotations(text: string): ParsedEntityRef[] {
  const results: ParsedEntityRef[] = []
  let match: RegExpExecArray | null

  while ((match = ENTITY_PATTERN.exec(text)) !== null) {
    results.push({
      type: match[1] as EntityType,
      id: match[2],
      displayName: match[3],
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return results
}

export function stripEntityNotation(text: string): string {
  return text.replace(ENTITY_PATTERN, '$3')
}
```

### Entity Topology (D3)

The EntityTopology component renders the `EntityGraph` as an interactive force-directed graph:

- **Nodes** = entity references (sized by edge count, colored by type)
- **Edges** = entity relationships (labeled with relationship type)
- **Groups** = entity groups (background regions with labels)
- **Interactions:** Click node → open entity panel, hover → tooltip, drag to rearrange
- **Library:** D3.js force simulation (already lightweight, no heavy deps)

```
dependency: d3 (d3-force, d3-selection, d3-zoom)
size: ~30KB gzipped (tree-shaken)
```

---

## 11. Visualization Engine

### VizHint → Chart Mapping

| `vizHint.chartType` | Component | Library |
|---|---|---|
| `bar`, `line`, `pie`, `area` | `EnhancedChartBlock` | Recharts (existing) |
| `gauge` | `GaugeChart` | Custom SVG (new) |
| `topology` | `TopologyChart` | D3 (new) |
| `timeline` | `TimelineChart` | Custom SVG + Recharts |
| `heatmap` | `HeatmapChart` | Custom SVG |
| `treemap` | Recharts Treemap | Recharts |
| `radar` | Recharts Radar | Recharts |
| `table` | `TableBlock` | Existing |

### Gauge Chart Spec

The gauge is a key visual for posture overview:

```
        ╭───────────╮
      ╱               ╲
    ╱    ████████░░░     ╲
   │     ████████░░░      │
    ╲         78%        ╱
      ╲               ╱
        ╰───────────╯
        Control Health
```

- Semi-circle or full-circle radial gauge
- Color zones: green (>80), amber (60-80), red (<60)
- Animated value transition
- Center: large numeric value + label

---

## 12. Implementation Phases

### Phase 0: Foundation — Types + Dead Code + Shell Restructure (1 Codex phase, ~1.5h)

**Goal:** Clean slate. Remove dead code, consolidate types, and restructure directories in one pass.

**Dead code removal:**
- [ ] Delete: `ChatPage.tsx`, `ChatPage.css`, `ChatPage.test.tsx`
- [ ] Delete: `ChatMessageList.tsx`, `ChatMessageList.test.tsx` (move types to `types/chat.ts`)
- [ ] Delete: `SectionCard.tsx`
- [ ] Delete: `layout/AppLayout.tsx`, `layout/__tests__/`, `layout/app-layout.css`
- [ ] Delete: `threads/types.ts` (merge into `hooks/useThreads.ts`)
- [ ] Delete: `home/mockFeedData.ts` (inline test data in test files)

**Type consolidation:**
- [ ] Create: `src/types/chat.ts`, `src/types/modern-context.ts`, `src/types/entity.ts`, `src/types/stream.ts`

**Shell restructure** (folded in — pure file moves, no behavior change):
- [ ] Move: `layouts/CommandCenter.tsx` → `shell/CommandCenter.tsx`
- [ ] Move: `primitives/TopBar.tsx` → `shell/TopBar.tsx`
- [ ] Move: `primitives/Composer.tsx` → `conversation/Composer.tsx`
- [ ] Move: remaining conversation primitives to `conversation/`
- [ ] Create: `shell/AppShell.tsx` — replaces AppLayout as the route wrapper
- [ ] Delete: empty `layouts/`, `layout/`, `components/` directories
- [ ] Update: `App.tsx` routes — render CommandCenter directly, remove ChatPage indirection
- [ ] Update: all imports that referenced deleted/moved files
- [ ] Tests: All existing tests still pass (refactor, not behavior change)
- [ ] Target: **252 tests passing** (same count, dead test files removed, new type tests added)

### Phase 1: Streaming Protocol — ModernContext in Stream (1 Codex phase, ~1h)

**Goal:** The UI can receive and store `modernContext` from the agent, per-message.

- [ ] Add `modern-context` to `streamEventSchema` in `agent/types.ts`
- [ ] Add optional `modernContext` field to `ChatTimelineItem` (assistant messages only)
- [ ] Handle `modern-context` event in stream loop with **`safeParse` validation** (degrade gracefully on malformed data — never crash)
- [ ] Derive `latestModernContext` from most recent assistant message for convenience
- [ ] Thread switching naturally preserves per-message context (no separate snapshot field needed)
- [ ] Tests: Stream parsing with valid/invalid/missing modernContext, thread switch preserves per-message context
- [ ] Target: **+20 tests**

### Phase 2: Entity System — Chips + Parser (1 Codex phase, ~1.5h)

**Goal:** Entity references in agent text become clickable chips.

- [ ] Create: `entities/entityTypeConfig.ts` — icon/color/label per type (all 32 types)
- [ ] Create: `entities/entityUtils.ts` — `parseEntityNotations()`, `stripEntityNotation()`
- [ ] Create: `entities/EntityChip.tsx` + CSS — clickable chip component
- [ ] Create: `entities/EntityBadge.tsx` — type icon + status color
- [ ] Create: `conversation/EntityChipParser.tsx` — transforms text segments containing `[[entity:...]]`
- [ ] Update: `conversation/MessageList.tsx` — text segments pass through EntityChipParser
- [ ] **Memoize parsed results:** `useMemo` keyed on message text — parse `[[entity:...]]` once per finalized message, not on every render
- [ ] Tests: Parser edge cases, chip rendering, click handler, memoization (no re-parse on re-render)
- [ ] Target: **+28 tests**

### Phase 3: Story Cards — Inline + Rail (1 Codex phase, ~1.5h)

**Goal:** Story cards render in agent responses and in the context rail.

- [ ] Create: `stories/StoryCard.tsx` + CSS — full story card component
- [ ] Create: `stories/StoryCardList.tsx` — vertical stack
- [ ] Create: `stories/StoryCardMini.tsx` — compact card for Home
- [ ] Create: `stories/StorySeverityBadge.tsx`
- [ ] Create: `stories/StoryTimeline.tsx` — temporal window bar
- [ ] Create: `conversation/StoryCardInline.tsx` — renders story cards above agent text (reads from that message's `modernContext`)
- [ ] Update: `MessageList.tsx` — if message has `modernContext.storyCards`, render above message
- [ ] Register: `StoryCardArtifact` in `ArtifactRegistry`
- [ ] Tests: Story card rendering, severity colors, entity chips within cards
- [ ] Target: **+24 tests**

### Phase 4: Context Rail + Entity Panel (1 Codex phase, ~2.5h)

**Goal:** Right rail gains multi-mode context display AND entity detail panel. (Merged — same surface and state transitions.)

**Context Rail:**
- [ ] Create: `shell/ContextRail.tsx` — replaces static artifact listing
- [ ] Modes: artifacts-only (default), stories+artifacts, entity-detail
- [ ] Story cards appear at top of rail when present
- [ ] Entity topology preview (static, small) when graph has >3 nodes
- [ ] "View Full Topology" button → expand to overlay
- [ ] Update: `CommandCenter.tsx` — replace static artifact aside with ContextRail
- [ ] Preserve: All resize fixes (min-height:0, grid isolation, dvh, etc.)

**Entity Panel:**
- [ ] Create: `entities/EntityDetailPanel.tsx` — slide-in panel with tabs
- [ ] Create: `hooks/useEntityPanel.ts` — state for open/close/active entity
- [ ] Tabs: Overview (attributes), Related (edges from graph), Graph (mini topology)
- [ ] "Back to Artifacts" button restores previous rail mode
- [ ] Wire: `onEntityClick` callback through CommandCenter → EntityPanel
- [ ] Panel draws data from the `modernContext` of the message containing the clicked chip

- [ ] Tests: Mode switching, resize behavior, mobile responsive, panel open/close, tab switching, back navigation
- [ ] Target: **+36 tests**

### Phase 5: Visualization Engine + Entity Topology (1 Codex phase, ~3h)

**Goal:** Viz hints render as interactive charts AND entity graph renders as interactive topology. (Merged — same visualization substrate and D3 dependency.)

**Viz Engine:**
- [ ] Create: `viz/VizHintRenderer.tsx` — routes chartType to component
- [ ] Create: `viz/GaugeChart.tsx` — SVG radial gauge with animated value
- [ ] Create: `viz/TimelineChart.tsx` — temporal event timeline
- [ ] Create: `viz/HeatmapChart.tsx` — distribution heatmap (SVG grid)
- [ ] Create: `viz/viz-theme.ts` — chart tokens
- [ ] Create: `viz/EnhancedChartBlock.tsx` — ChartBlock wrapper that accepts vizHint data
- [ ] Update: `blocks/ChartBlock.tsx` — if vizHint metadata present, use enhanced rendering
- [ ] Register: `VizHintArtifact` in ArtifactRegistry

**Entity Topology:**
- [ ] Add dependency: `d3` (d3-force, d3-selection, d3-zoom, d3-drag)
- [ ] Create: `entities/EntityTopology.tsx` — force-directed graph component
- [ ] Create: `entities/EntityRelationshipMatrix.tsx` — tabular fallback
- [ ] Features: Click node → entity panel, hover → tooltip, zoom/pan, group regions
- [ ] Responsive: Renders in context rail (small) or expanded overlay (full)
- [ ] Register: `EntityGraphArtifact` in ArtifactRegistry

- [ ] Tests: Gauge rendering, heatmap cells, theme tokens, node rendering, click handlers, resize, empty state
- [ ] Target: **+40 tests**

### Phase 6: Home Page — Posture Dashboard Rebuild (1 Codex phase, ~1.5h)

**Goal:** Home page becomes a live posture dashboard.

- [ ] Create: `home/PostureOverview.tsx` — aggregate posture gauges per agent domain
- [ ] Update: `home/AttentionSection.tsx` — render `StoryCardMini` from feed
- [ ] Update: `home/MetricsGlance.tsx` — render `VizHintRenderer` for metric items
- [ ] Update: `home/HomePage.tsx` — new layout with posture overview at top
- [ ] Entity chips in story cards are clickable → navigate to /chat with entity context
- [ ] Tests: Dashboard rendering, gauge values, story card integration
- [ ] Target: **+16 tests**

### Phase 7: Admin — Composer Config Page (1 Codex phase, ~1h)

**Goal:** Admin can toggle composer version per agent.

- [ ] Create: `admin/ComposerConfigPage.tsx` — agent list with version toggle
- [ ] Add route: `/admin/composer-config`
- [ ] API: `GET/PUT` calls to agent API for composer config
- [ ] Tests: Toggle behavior, API error handling
- [ ] Target: **+12 tests**

### Total

| Phase | Feature | Codex Phases | Duration | New Tests |
|---|---|---|---|---|
| 0 | Foundation + Dead Code + Shell Restructure | 1 | ~1.5h | ~0 (refactor) |
| 1 | Streaming Protocol (per-message + safeParse) | 1 | ~1h | +20 |
| 2 | Entity System (with memoization) | 1 | ~1.5h | +28 |
| 3 | Story Cards | 1 | ~1.5h | +24 |
| 4 | Context Rail + Entity Panel | 1 | ~2.5h | +36 |
| 5 | Viz Engine + Entity Topology | 1 | ~3h | +40 |
| 6 | Home Dashboard | 1 | ~1.5h | +16 |
| 7 | Admin Composer Config | 1 | ~1h | +12 |
| **TOTAL** | | **8** | **~13.5h** | **~176** |

---

## 13. Migration Strategy

### Approach: Incremental, Not Big-Bang

Each phase produces a working, deployable UI. No feature flags needed because:

1. **Phase 0** removes dead code + restructures directories — no behavior change
2. **Phase 1** adds modernContext handling but doesn't change rendering (data flows through, ignored if absent)
3. **Phases 2-5** add NEW components — existing rendering unchanged for messages without modernContext
4. **Phase 6** rebuilds Home — biggest visible change, but Home is already a separate page
5. **Phase 7** adds an admin page — no impact on existing pages

### Graceful Degradation

If the agent returns no `modernContext` (legacy mode or error):
- Entity chips → not rendered (text stays as-is with `[[entity:...]]` stripped)
- Story cards → not rendered (agent response displayed normally)
- Viz hints → not rendered (existing chart blocks work as before)
- Topology → not rendered (artifact rail shows artifacts only)
- Entity panel → not openable (no entity data to display)

**The UI NEVER breaks when modernContext is absent.** It just looks like the current UI.

### Agent-Side Requirements

Before the UI can fully leverage Modern features, the agent needs one streaming change:

**The agent must emit a `modern-context` stream event.** Currently, `modernContext` is part of the `InvocationResponse` schema but is NOT streamed as a separate event. The protocol is:

1. **Primary:** Agent emits `{ type: 'modern-context', modernContext: {...} }` event before `done`
2. **Fallback:** Agent includes `modernContext` in the `done` event payload (for resilience)

The UI handles the `modern-context` event in the stream loop, with `safeParse` validation and graceful fallback. No other protocol variants are needed.

---

## 14. Test Strategy

### Test Categories

| Category | Tools | What It Tests |
|---|---|---|
| **Unit** | Vitest | Entity parser, strip notation, type config, chart data transforms |
| **Component** | Vitest + Testing Library | EntityChip render, StoryCard severity colors, GaugeChart values |
| **Integration** | Vitest + Testing Library | useChatEngine with modernContext events, thread switch, snapshot |
| **Visual** | Manual (future: Chromatic) | Dark theme rendering, responsive breakpoints, D3 graph layout |
| **E2E** | Future: Playwright | Full flow: send message → story cards render → click entity → panel opens |

### Key Test Scenarios

1. **Stream with modernContext** → context stored, story cards render, entity chips parsed
2. **Stream without modernContext** → graceful degradation, no errors
3. **Thread switch** → modernContext preserved per thread
4. **Entity chip click** → entity panel opens in right rail
5. **Entity panel back** → returns to artifact view
6. **Resize** → all panels adapt, no overflow, mobile drawers work
7. **Story card severity** → correct colors, icons, ARIA labels
8. **Entity notation in text** → parsed into chips, plain text fallback
9. **Viz hint gauge** → correct value, color zone, animation
10. **Topology graph** → nodes render, click opens panel, zoom works

---

## Appendix A: Dependency Changes

### New Dependencies

| Package | Size (gzipped) | Purpose |
|---|---|---|
| `d3-force` | ~8KB | Force simulation for topology |
| `d3-selection` | ~6KB | DOM manipulation for D3 |
| `d3-zoom` | ~5KB | Zoom/pan for topology |
| `d3-drag` | ~3KB | Node dragging |

**Total new deps: ~22KB gzipped** — Acceptable for the functionality gained.

### Existing Dependencies (no change)

- `react`, `react-dom`, `react-router-dom`
- `recharts` — existing charts
- `zod` — schema validation
- `uuid` — ID generation

---

## Appendix B: CSS Architecture

### New CSS Files

| File | Purpose |
|---|---|
| `entities/EntityChip.css` | Chip styles, hover, status colors |
| `stories/StoryCard.css` | Card layout, severity colors, timeline bar |
| `viz/gauge-chart.css` | Gauge SVG styles, color zones |
| `viz/topology-chart.css` | D3 container, node styles, edge styles |
| `shell/context-rail.css` | Multi-mode rail layout |
| `shell/entity-panel.css` | Panel slide-in, tabs |

### Design Token Usage

All new components use existing CSS custom properties from `theme/tokens.css`:
- Severity colors: `--severity-critical`, `--severity-high`, `--severity-medium`, `--severity-low`
- Chart series: `--chart-series-1` through `--chart-series-4`
- Surfaces: `--bg-panel`, `--bg-elevated`, `--bg-panel-muted`
- Accents: `--accent`, `--accent-strong`, `--accent-subtle`

No new design tokens needed. The "War Room Precision" system already has everything.

---

## Appendix C: Recommended Phase Sequence

```
1. Phase 0: Foundation + Shell Restructure          — Clean slate + directory moves
2. Phase 1: Streaming Protocol                      — Data flows through (per-message + safeParse)
3. Phase 2: Entity System                           — Atomic building block (memoized parsing)
4. Phase 3: Story Cards                             — Uses Entity System
5. Phase 4: Context Rail + Entity Panel             — Houses stories + entities + click target
6. Phase 5: Viz Engine + Entity Topology            — All visualization (charts + D3 graph)
7. Phase 6: Home Dashboard                          — Uses all above
8. Phase 7: Admin Composer Config                   — Admin tooling
```

Each phase depends on the previous. No parallelization needed — they're small enough for single Codex runs.

### Agent-Side Prerequisites (from `MODERN-AGENT-READINESS-ADDENDUM.md`)

The UI phases cannot fully demonstrate features without these agent-side fixes:

| Agent Phase | Blocks UI Phase | Why |
|---|---|---|
| **A: Stream Protocol** | UI Phase 1 (Streaming) | UI won't receive `modernContext` without this |
| **B: Composer Config Seed** | UI Phase 2+ (all features) | Without 'modern' mode enabled, no modernContext is generated |
| **C-E: Modern Scenarios** | UI Phase 6 (Home Dashboard) | Empty story cards = empty dashboard |
| **F: Shared Services** | UI Phase 5 (Topology) | Sparse entity graphs = boring topology |
| **G: Home Feed Bridge** | UI Phase 6 (Home Dashboard) | Story cards don't appear on Home without this |

**Recommended execution order:**
```
Agent Phase A: Stream Protocol     ← FIRST (unblocks everything)
Agent Phase B: Composer Config     ← Enables Modern engines
UI Phase 0: Foundation             ← Can run in parallel with Agent B
UI Phase 1: Streaming Protocol     ← Requires Agent Phase A complete
Agent Phases C-E: Seed Scenarios   ← Can run in parallel with UI Phases 2-4
UI Phases 2-5: Entity/Story/Viz   ← Feature development
Agent Phase F: Shared Services     ← Before UI Phase 5
Agent Phase G: Home Feed Bridge    ← Before UI Phase 6
UI Phase 6: Home Dashboard         ← Requires Agent Phases C-G complete
UI Phase 7: Admin Composer Config
```

---

_This document is the definitive plan for the CEI UI modernization. The agent-side Modern Prompt Composer is complete. This is the other half — the visual experience that makes all that structured data sing._
