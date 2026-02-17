# CEI Home Experience — Frontend Plan (v2)

## Overview

The Home Experience is the front door to CEI. It replaces the current direct-to-chat routing with a dashboard that surfaces the **3+3 feed matrix** (3 agentic + 3 deterministic items) from the Home Agent curator, combined with quick-start use-case cards.

The backend already has `HomeAgentCurator`, `FeedApiService`, `FeedScoringService`, and `HomeAgentPromptBuilder` in `cei-agent`. This plan covers the frontend only. Backend work (Phases 9A/9B/9C from `RC-HOME-BRIDGE-PLAN.md`) runs in parallel.

---

## Architecture

### Data Flow

```
User loads / → HomePage
  → useHomeFeed() calls proxy POST /invoke { action: 'home_feed' }
  → Returns CuratedFeed { agentic[3], deterministic[3], cadenceState, generatedAt }
  → HomePage renders feed items + metrics + quick start
  → User clicks item → navigates to /chat with pre-filled composer draft
```

### Route Structure

```
/           → HomePage (protected)
/chat       → ChatPage (protected)
/roadmap    → RoadmapPage (protected)
/feedback   → FeedbackDashboard (protected)
/login      → LoginPage
```

**Note:** Existing `navigate('/')` calls in RoadmapPage and FeedbackDashboard now navigate to Home (correct behavior — back to front door). No `/chat/:sessionId` deep links until thread persistence exists.

### Component Tree

```
HomePage
├── HomeWelcome          — greeting + date
├── AttentionSection     — 3 agentic feed items (cards with severity, click → /chat)
├── MetricsGlance        — 3 deterministic items (stat cards with threshold color + trend arrow)
└── QuickStartGrid       — 4 use-case cards → open /chat with pre-filled composer
```

**Deferred to later:** RecentThreads (requires shared thread state provider or server-backed persistence).

---

## CuratedFeed Response Shape (from backend via POST /invoke)

```typescript
// Zod-validated at the boundary in feedSchema.ts
const feedCandidateSchema = z.object({
  id: z.string(),
  type: z.enum(['agentic', 'deterministic']),
  category: z.string(),
  agentDomain: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low', 'unknown']), // matches existing UI types
  significanceScore: z.number(),
  metricId: z.string().optional(),
  entityId: z.string().optional(),
  entityPath: z.string().optional(),
  value: z.number().optional(),
  previousValue: z.number().optional(),
  threshold: z
    .object({
      red: z.number(),
      amber: z.number(),
      direction: z.enum(['above', 'below']),
    })
    .optional(),
  deepLink: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const curatedFeedSchema = z.object({
  agentic: z.array(feedCandidateSchema),
  deterministic: z.array(feedCandidateSchema),
  generatedAt: z.string(),
  cadenceState: z.object({
    currentPeriod: z.string(),
    isReviewWeek: z.boolean(),
    dayOfWeek: z.number(),
    activeTargets: z.number(),
  }),
})
```

**Confidence mapping at boundary:** Backend may send `verified` → map to `high`. Backend may send `stale` → map to `low`.

---

## Phase H1: Home Page Shell + Routing (~35 min)

### What Gets Built

1. **Route restructure** in `App.tsx`:
   - `/` → `HomePage` (new)
   - `/chat` → `ChatPage` (existing)
   - Update catch-all `*` → redirect to `/`

2. **`src/home/HomePage.tsx`** — main container
   - Uses existing `TopBar` from primitives
   - Scrollable single-page layout
   - Calls sub-components with mock data

3. **`src/home/HomeWelcome.tsx`** — welcome banner
   - "Good [morning/afternoon/evening], [name]" (time-of-day from local clock)
   - Current date formatted
   - Minimal — no tenant/profile info (not available in current auth context)

4. **`src/home/AttentionSection.tsx`** — 3 agentic items
   - Card per item: severity indicator (red dot / amber dot), title, 1-line summary
   - Reuse existing `ConfidenceBadge` from `src/primitives/ConfidenceBadge.tsx`
   - Click → navigate to `/chat` (no pre-fill in H1, just navigation)
   - Empty state: "All clear — no urgent items right now"

5. **`src/home/MetricsGlance.tsx`** — 3 deterministic metric cards
   - Stat value with threshold color (uses CSS custom properties)
   - Metric label + trend arrow (↑↓→) based on `value` vs `previousValue`
   - Click → navigate to `/chat`
   - Empty state: "No metrics available yet"

6. **`src/home/QuickStartGrid.tsx`** — 4 use-case entry points
   - 2×2 grid:
     - Risk Assessment, Compliance Gap Analysis (R&C)
     - Control Effectiveness Review, DR Readiness (mixed)
   - Each card: icon/emoji, title, 1-line description
   - Click → navigate to `/chat` (pre-fill wired in H2)

7. **`src/home/mockFeedData.ts`** — hardcoded Vektora data **for development only**
   - Used only when `import.meta.env.DEV` is true AND feed API is not configured
   - Never shown in production — production shows error/empty states

8. **`src/home/home.css`** — styles using existing design tokens
   - CSS prefix: `cei-home-`
   - Responsive: single column on mobile (≤768px), multi-col on desktop

### Constraints

- Named exports only
- Extensionless imports (match existing codebase convention)
- All CSS uses existing design token variables from `tokens.css`
- Reuse `TopBar`, `ConfidenceBadge` from `src/primitives/`
- No new dependencies
- Tests: 20+ (rendering, empty states, navigation clicks, responsive)

---

## Phase H2: Wire to Live Feed API (~25 min)

### What Gets Built

1. **`src/home/feedSchema.ts`** — Zod schemas for `CuratedFeed` + `FeedCandidate`
   - Validates and coerces backend response at boundary
   - Maps `verified` → `high`, `stale` → `low` for confidence

2. **`src/home/HomeFeedApi.ts`** — API client
   - POST to invoke endpoint with `{ action: 'home_feed', inputs: { role: 'ciso' } }`
   - Uses `VITE_API_URL` base (same as existing FeedbackApi pattern)
   - Bearer token from `getAccessToken()`
   - Parses response with Zod schema
   - Returns typed `CuratedFeed` or throws

3. **`src/home/useHomeFeed.ts`** — React hook
   - Returns `{ feed: CuratedFeed | null, loading: boolean, error: string | null, refresh: () => void }`
   - Calls `HomeFeedApi` on mount
   - Explicit error states (no mock fallback in production)
   - Auto-refresh every 5 min

4. **Replace mock data** in `HomePage.tsx` with `useHomeFeed()` output

5. **Quick Start pre-fill behavior:**
   - Click card → navigate to `/chat?draft=[encoded message]`
   - ChatPage reads `?draft=` param → pre-fills composer text (user must hit Enter to send)
   - No auto-send, no side effects on mount

6. **Attention item click behavior:**
   - Click → navigate to `/chat?draft=[contextual prompt from deepLink]`
   - Same pre-fill pattern as Quick Start

### Constraints

- Follow existing API client patterns from `FeedbackApi.ts` and `RoadmapFetch.ts`
- Error messages follow existing `isRetryableError` pattern
- Tests: 20+ (Zod validation, API error handling, hook lifecycle, draft param parsing)

---

## Phase H3: Polish + Responsive (~20 min)

### What Gets Built

1. **Skeleton loading states** for AttentionSection and MetricsGlance (shimmer animation)
2. **Error states** per section (retry button, non-retryable message)
3. **Mobile layout refinements**
   - ≤768px: single column, cards stack vertically, QuickStart 1-col
   - > 768px: MetricsGlance 3-col, QuickStart 2×2
4. **Threshold color tokens** — extend `tokens.css`:
   - `--cei-threshold-red`, `--cei-threshold-amber`, `--cei-threshold-green`
5. **Keyboard navigation** — cards are focusable, Enter to navigate
6. **TopBar update** — add Home icon/link that navigates to `/`
7. **Tests:** 15+ (skeleton, error states, responsive, keyboard nav)

---

## Quick Start Use Case Mapping

| Card            | Draft Message                                           | Agent Profile     |
| --------------- | ------------------------------------------------------- | ----------------- |
| Risk Assessment | "Run a risk assessment for my organization"             | risk-compliance   |
| Compliance Gap  | "Analyze compliance gaps against our active frameworks" | risk-compliance   |
| Control Review  | "Review control effectiveness and attestation health"   | risk-compliance   |
| DR Readiness    | "Assess our disaster recovery readiness"                | disaster-recovery |

---

## File Structure

```
src/home/
├── HomePage.tsx              — main container
├── HomeWelcome.tsx           — greeting banner
├── AttentionSection.tsx      — 3 agentic items
├── MetricsGlance.tsx         — 3 deterministic cards
├── QuickStartGrid.tsx        — 4 use-case cards
├── feedSchema.ts             — Zod schemas (Phase H2)
├── HomeFeedApi.ts            — API client (Phase H2)
├── useHomeFeed.ts            — feed hook (Phase H2)
├── mockFeedData.ts           — dev-only mock data
├── home.css                  — all styles
└── __tests__/
    ├── HomePage.test.tsx
    ├── AttentionSection.test.tsx
    ├── MetricsGlance.test.tsx
    ├── QuickStartGrid.test.tsx
    ├── feedSchema.test.ts        (Phase H2)
    ├── HomeFeedApi.test.ts       (Phase H2)
    └── useHomeFeed.test.ts       (Phase H2)
```

---

## Timing

| Phase     | Scope                                   | Tests   | Est. Duration |
| --------- | --------------------------------------- | ------- | ------------- |
| H1        | Shell + routing + mock data             | 20+     | ~35 min       |
| H2        | Feed API + Zod validation + draft param | 20+     | ~25 min       |
| H3        | Polish + responsive + skeleton + a11y   | 15+     | ~20 min       |
| **Total** |                                         | **55+** | **~80 min**   |

---

## Design Principles

1. **Substance over chrome** — the 3+3 feed is the star, not decorative UI
2. **Every pixel earns its place** — no filler, no hero sections
3. **Action-oriented** — every card leads to chat with context
4. **Never show fake data** — error states > mock data in production
5. **Pre-fill, don't auto-send** — user confirms intent before message goes
6. **Reuse existing primitives** — TopBar, ConfidenceBadge, design tokens
7. **Mobile-first responsive** — field CISOs use tablets and phones
