# Deferred Modern UI Enhancements — Reference Document

> **Source:** Codex (gpt-5.3-codex) review of `MODERN-UI-PLAN.md`, 2026-02-20
> **Context:** These recommendations were identified as high-value but too complex for the initial 8-phase Modern UI rollout. They're captured here with full business case, description, and implementation outline for future reference.
> **Decision:** Deferred to post-V1. See `ROADMAP-AND-FEEDBACK-PLAN.md` for roadmap placement.

---

## 1. Shared Agent-UI Contract Source

### Business Case

The agent (`cei-agent`) and UI (`cei-ui`) maintain **separate type definitions** for the same data contracts (ModernContext, StoryCard, EntityGraph, etc.). Today they're manually synchronized — the UI plan defines Zod schemas that mirror the agent's TypeScript interfaces. This works for V1 but creates drift risk as both repos evolve independently. A schema mismatch means the UI silently drops data or crashes on unexpected shapes.

**Impact:** Prevents production bugs from contract drift. Reduces maintenance cost. Enables automated compatibility checks in CI.

### Simple Description

Generate UI-side Zod schemas automatically from the agent's TypeScript type definitions. One source of truth, zero manual synchronization.

### Full Outline

**Approach A: Shared package (monorepo-lite)**
- Extract `modern-types.ts` into a shared npm package (`@cei/contracts`)
- Both repos depend on the package
- Agent exports TypeScript interfaces + Zod schemas
- UI imports Zod schemas directly
- Version bump = contract change = both repos must update
- **Pros:** True single source. **Cons:** Requires package publish pipeline, version coordination.

**Approach B: Code generation**
- Agent repo has a `scripts/generate-ui-contracts.ts` that reads `modern-types.ts` and emits a Zod schema file
- Generated file is committed to the UI repo (or fetched at build time)
- CI check: if agent types change, regenerate and verify UI schemas match
- **Pros:** No shared package, simpler infra. **Cons:** Generation logic to maintain.

**Approach C: Runtime validation only (current + safeParse)**
- Keep separate schemas but enforce `safeParse` at the UI boundary (already in V1 plan)
- Add contract tests: UI test suite imports agent's type definitions and validates schema compatibility
- **Pros:** Simplest. **Cons:** Doesn't prevent drift, only catches it.

**Recommended:** Start with C (already in V1), graduate to A when a third consumer appears or after 2+ drift incidents.

**Key files:**
- Agent types: `cei-agent/src/usecases/core/modern-types.ts` (32 entity types, ModernContext, StoryCard, EntityGraph, VisualizationHint, PivotTarget)
- UI schemas: `cei-ui/src/types/modern-context.ts` (Zod equivalents)
- Both define: EntityType union, EntityReference, EntityRelationship, EntityGroup, EntityGraph, StoryCard, VisualizationHint, PivotTarget, ModernContext

---

## 2. Correlated Timeline Overlay

### Business Case

Datadog's most powerful pattern is **cross-widget time correlation**: brush a time range on a dashboard chart and every other widget filters to that window. For CEI, this means a user looking at a "control effectiveness over time" chart could brush a drop period and instantly see which story cards, entity changes, and audit findings occurred during that same window. This turns passive dashboards into active investigation tools.

**Impact:** Transforms the Home posture dashboard from a display into an investigation surface. Directly maps to Datadog's highest-value UX pattern. Makes temporal correlations (the core of story cards) visually explorable.

### Simple Description

Add a shared time-range selector: when a user brushes a time range on any chart, all story cards, entity graphs, and other charts on the same page filter to that window.

### Full Outline

**Architecture:**
1. **TimeRangeContext** — React context providing `{ start: Date, end: Date, setRange, clearRange }`
2. **Brushable charts** — Recharts/D3 charts emit `onBrush(start, end)` → updates TimeRangeContext
3. **Filtered consumers** — StoryCardList, VizHintRenderer, EntityTopology read TimeRangeContext and filter their data
4. **Visual indicator** — Persistent time-range badge ("Showing: Nov 22 - Dec 15") with clear button

**Components affected:**
- `viz/EnhancedChartBlock.tsx` — Add Recharts `ReferenceArea` + brush handler
- `stories/StoryCardList.tsx` — Filter by `temporalWindow` overlap with selected range
- `home/PostureOverview.tsx` — Filter gauge data to time range
- New: `shell/TimeRangeBadge.tsx` — Persistent indicator

**Data requirement:** Story cards already have `temporalWindow.startDate/endDate`. Viz hints would need a `timeRange` field added to the agent contract (currently not present).

**Estimated effort:** ~1.5 Codex phases, ~2.5h, +20 tests

---

## 3. Contract & E2E Test Gates

### Business Case

The V1 Modern UI ships with unit + component tests but no automated verification that the UI's expectations match the agent's actual output format, and no end-to-end tests that verify the full flow (send message → stream modernContext → render story cards → click entity → panel opens). As the system grows, regressions will appear at integration boundaries that unit tests miss.

**Impact:** Catches integration bugs before they reach users. Enables confident refactoring. Required for production-grade release process.

### Simple Description

Add two test tiers: (1) contract tests that verify UI Zod schemas parse actual agent output, and (2) Playwright E2E tests that exercise the full user flow.

### Full Outline

**Contract tests:**
- Snapshot actual agent `modernContext` output (from seed data runs) as JSON fixtures
- UI test suite parses these fixtures through its Zod schemas
- If agent changes a field name/type, contract test fails before deploy
- Run in CI on both repos (agent exports fixtures, UI consumes them)
- ~8 tests covering all major shapes (StoryCard, EntityGraph, VizHint, PivotTarget, empty, malformed)

**E2E tests (Playwright):**
- `tests/e2e/modern-flow.spec.ts` — Full flow: login → send message → wait for story cards → click entity chip → verify panel opens → close panel
- `tests/e2e/home-dashboard.spec.ts` — Home page loads → posture gauges render → story cards render → click story card entity
- `tests/e2e/admin-composer.spec.ts` — Admin toggles composer version → verify toggle persists
- Requires: running agent + UI in CI (Docker compose or similar)

**Accessibility tests:**
- Add `axe-core` integration to Playwright tests
- Verify: EntityChip has ARIA role + label, EntityPanel has focus trap, StoryCard has heading hierarchy, TopologyChart has `aria-label`

**Estimated effort:** ~2 Codex phases, ~3h, +30 tests (contract) + ~12 E2E tests

---

## 4. Live Tail Activity Feed

### Business Case

Datadog's Live Tail shows a real-time stream of events with faceted filtering (by service, status, pattern). For CEI, this would mean a real-time feed of security events — audit findings, control changes, vulnerability discoveries, compliance deadline alerts — with the ability to filter by domain, severity, and entity type. Currently, the CEI Home page shows a static feed; a Live Tail transforms it into a monitoring surface.

**Impact:** Moves CEI from "ask the agent a question" to "watch the security posture in real time." Highest-effort item but also highest differentiation from competitors.

### Simple Description

A real-time, filterable event stream on the Home page showing security events as they happen, with severity badges, entity chips, and pattern grouping.

### Full Outline

**Architecture:**
1. **Server-Sent Events endpoint** — Agent API streams security events (`/v1/events/stream`)
2. **Event types:** audit_finding, control_change, vulnerability_discovered, compliance_deadline, policy_update, assessment_completed
3. **UI component:** `home/LiveTail.tsx` — Scrolling event list with auto-scroll, pause, and filter controls
4. **Faceted filters:** Filter by event type, severity, entity type, domain (R&C/VM/DR)
5. **Pattern clustering:** Group repeated similar events ("12 low-severity findings in last 5 min")

**Agent-side requirements:**
- New SSE endpoint for event streaming
- Event bus that aggregates cross-domain events
- Event deduplication and rate limiting

**UI components:**
- `home/LiveTail.tsx` — Main feed component
- `home/LiveTailFilters.tsx` — Facet sidebar
- `home/EventRow.tsx` — Individual event rendering with entity chips
- `home/EventCluster.tsx` — Grouped similar events
- `hooks/useLiveTail.ts` — SSE connection + state management

**This is the most complex item.** It requires both agent-side event infrastructure and UI streaming. Defer until the core Modern UI is proven and users request real-time monitoring.

**Estimated effort:** ~4 Codex phases (2 agent + 2 UI), ~6h, +40 tests

---

## Summary

| Item | Roadmap Horizon | Effort | Tests | Dependencies |
|---|---|---|---|---|
| Shared Contract Source | Next | ~1h (Approach C) / ~3h (Approach A) | +8 | Both repos |
| Correlated Timeline | Next | ~2.5h | +20 | TimeRangeContext + agent contract addition |
| Contract & E2E Gates | Next | ~3h | +42 | Playwright + Docker CI |
| Live Tail Activity Feed | Later | ~6h | +40 | Agent event bus + SSE endpoint |
