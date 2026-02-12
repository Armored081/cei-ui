# Roadmap & Feedback System — Implementation Plan

**Author:** Clawd (AI) + Adam Thornton  
**Date:** 2026-02-12  
**Status:** Draft  
**Version:** 0.2.0 (Updated post-Codex review)  

---

## Executive Summary

Two new user-facing features for the CEI Command Center:

1. **Roadmap Page** — A transparent, well-structured product roadmap that builds user trust and sets expectations. **Aurora-backed from v1** with dedicated REST API for fast reads. Agent can update roadmap item status as features ship.

2. **Feedback System** — A contextual feedback experience where users can report issues or suggest improvements. Captures thread context (last 20 messages + artifacts), applies PII redaction, stores durably in Aurora, then optionally enriches with agent interview. All feedback includes full reproduction context for bug analysis, UX insight, and feature prioritization.

Both accessible from new TopBar buttons next to the user email.

**Key architectural choices (post-Codex review):**
- **Durable capture first:** Feedback writes to Aurora before any interview (Phase 2 before Phase 3)
- **Dedicated REST endpoints:** `/v1/roadmap/items` and `/v1/feedback` (no tool calls for page data)
- **Security-first:** PII redaction, 90-day retention, rate limiting, row-level auth, idempotency keys
- **Normalized data:** Junction table for feedback-artifact linkage, computed counts (no cached denormalization)

---

## Table of Contents

1. [Roadmap Page Design](#1-roadmap-page-design)
2. [Feedback System Design](#2-feedback-system-design)
3. [Data Model](#3-data-model)
4. [Implementation Phases](#4-implementation-phases)
5. [Testing Strategy](#5-testing-strategy)

---

## 1. Roadmap Page Design

### 1.1 Research: Roadmap Best Practices

Drawing from established product roadmap patterns (Linear, Notion, Productboard, GitHub public roadmaps):

| Principle | Implementation |
|-----------|---------------|
| **Time horizons, not dates** | "Now / Next / Later" columns — avoids false precision on delivery dates |
| **Outcome-oriented** | Each item describes the *user outcome*, not the technical task |
| **Status transparency** | Clear status indicators: Shipped ✅, In Progress 🔄, Planned 📋, Exploring 🔍 |
| **Categorization** | Group by domain: Analysis & Reporting, Integrations, Agent Intelligence, Platform |
| **Changelog section** | "Recently shipped" section at top — shows momentum and builds confidence |
| **No-promise language** | Footer disclaimer: roadmap reflects current thinking, subject to change |

### 1.2 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ◆ CEI                              Roadmap  Feedback  adam@... Sign out │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← Back to Command Center                                  │
│                                                             │
│  # Product Roadmap                                          │
│  See what we're building and where CEI is heading.          │
│                                                             │
│  ┌─────────── Recently Shipped ───────────┐                │
│  │ ✅ Command Center Redesign              │                │
│  │    War-room precision for risk analysis │                │
│  │    Shipped Feb 2026                     │                │
│  │ ✅ Risk & Control Matrix Analysis       │                │
│  │    Coverage gaps, hotspots, residual    │                │
│  │    Shipped Feb 2026                     │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌── Now ──┐  ┌── Next ──┐  ┌── Later ──┐                 │
│  │ 🔄 SNOW │  │ 📋 Thread│  │ 🔍 Multi- │                 │
│  │ Actions │  │ Persist  │  │ agent     │                 │
│  │         │  │          │  │ workflows │                 │
│  │ 🔄 Feed-│  │ 📋 Impact│  │           │                 │
│  │ back    │  │ Simula-  │  │ 🔍 SOAR   │                 │
│  │ System  │  │ tions    │  │ Integr.   │                 │
│  └─────────┘  └──────────┘  └───────────┘                  │
│                                                             │
│  ┌─────────── By Category ────────────────┐                │
│  │ Analysis & Reporting                    │                │
│  │  • RCM quantitative analysis    ✅      │                │
│  │  • Assessment-as-artifact       ✅      │                │
│  │  • Impact simulations           📋      │                │
│  │                                         │                │
│  │ Integrations                            │                │
│  │  • ServiceNow action worker     🔄      │                │
│  │  • Thread persistence (Aurora)  📋      │                │
│  │  • SOAR platform integration    🔍      │                │
│  │                                         │                │
│  │ Agent Intelligence                      │                │
│  │  • Contextual feedback system   🔄      │                │
│  │  • Confidence decay tracking    ✅      │                │
│  │  • Multi-agent orchestration    🔍      │                │
│  │                                         │                │
│  │ Platform                                │                │
│  │  • Command Center redesign      ✅      │                │
│  │  • Visual regression tests      📋      │                │
│  │  • Role-based access control    🔍      │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ─────────────────────────────────────────                  │
│  This roadmap reflects our current plans and priorities.    │
│  Items may shift as we learn from user feedback and         │
│  evolving requirements.                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Data Source

Roadmap items are stored in **Aurora from v1**. This enables the agent to create/update roadmap items, link feedback to items, and keeps the roadmap as a living document without redeployment.

```typescript
interface RoadmapItem {
  id: string
  title: string
  description: string
  category: 'analysis' | 'integrations' | 'intelligence' | 'platform'
  status: 'shipped' | 'in-progress' | 'planned' | 'exploring'
  horizon: 'now' | 'next' | 'later'
  shippedDate?: string           // "Feb 2026"
  feedbackCount?: number         // Linked feedback count
  sortOrder: number              // Display ordering within horizon
  createdAt: string
  updatedAt: string
}
```

**Seeding:** Initial roadmap items are seeded via an ingestion script (same pattern as risk instance seeding). The script is idempotent using natural key upsert on `id`.

**Agent tool:** `roadmap_manage` tool allows the agent to create, update, and query roadmap items. This means the agent can update the roadmap as features ship — no manual editing needed.

### 1.4 Design Notes

- Full-page route (`/roadmap`), not a modal — roadmaps need space to breathe
- Same dark theme as Command Center, amber accents for status badges
- "Back to Command Center" link at top (not browser back — SPA routing)
- Responsive: columns stack vertically on mobile
- No authentication required? **Decision: Keep behind auth** — roadmap may contain internal-facing items. Can revisit when we have public/internal item flags.

---

## 2. Feedback System Design

### 2.1 Architecture Overview

The feedback system has three layers:

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Feedback Entry (UI)                    │
│  • Feedback button in TopBar                     │
│  • SlideOver panel with category + free text     │
│  • Auto-captures current thread context snapshot │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  Layer 2: Agent Interview (Agent-side)           │
│  • Agent receives feedback + thread context      │
│  • Asks 1-3 clarifying questions                 │
│  • Categorizes, extracts reproduction steps      │
│  • Writes structured feedback record to Aurora   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  Layer 3: Feedback Storage (Aurora)              │
│  • Structured feedback record                    │
│  • Full thread context snapshot                  │
│  • Agent interview transcript                    │
│  • Tags, priority, category                      │
│  • Linked to: thread, user, artifacts, roadmap   │
└─────────────────────────────────────────────────┘
```

### 2.2 Feedback Entry Flow (UI Side)

**Step 1: User clicks "Feedback" in TopBar**

A SlideOver panel opens from the right with:

```
┌──────────────────────────────────────┐
│  📝 Share Feedback           ×       │
├──────────────────────────────────────┤
│                                      │
│  What kind of feedback?              │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 🐛   │ │ 💡   │ │ 🎨   │        │
│  │ Bug  │ │ Idea │ │ UX   │        │
│  └──────┘ └──────┘ └──────┘        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Tell us what happened...       │  │
│  │                                │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ☑ Include current thread context    │
│    (last 20 messages + artifacts)    │
│                                      │
│  [ Submit Feedback ]                 │
│                                      │
└──────────────────────────────────────┘
```

**What "Include current thread context" captures:**
- Last N messages from the current thread (configurable, default 20)
- All artifacts from the current thread (block payloads, not rendered HTML)
- Current thread ID and title
- Agent model/session metadata (no credentials)
- Timestamp of feedback submission
- User email

**What it does NOT capture:**
- Other threads
- User credentials or tokens
- Full conversation history beyond N messages
- PII beyond the user's own email

**Step 2: Submit**

The UI sends the feedback payload to the agent via the existing streaming API (a special tool-use message, or a dedicated feedback endpoint). The agent then begins the interview.

### 2.3 Agent Interview Flow (Agent Side)

When the agent receives a feedback submission, it enters a **feedback interview mode** for the current exchange:

**System prompt injection for feedback mode:**
```
You are now in feedback interview mode. A user has submitted feedback about 
their experience. Your goals:

1. ACKNOWLEDGE the feedback warmly and specifically
2. ASK 1-3 targeted clarifying questions based on the feedback type:
   - Bug: "Can you describe what you expected to happen?" / "Did this occur 
     consistently or intermittently?"
   - Idea: "What problem would this solve for you?" / "How would you envision 
     using this?"
   - UX: "What were you trying to accomplish when this felt wrong?" / 
     "What would have felt more natural?"
3. GROUND your questions on the thread context — reference specific messages, 
   artifacts, or agent responses the user saw
4. After the user responds, SUMMARIZE the feedback into a structured record 
   and confirm with the user
5. STORE the feedback record via the feedback storage tool

DO NOT:
- Ask more than 3 questions total
- Make the user repeat what they already said
- Be defensive about agent behavior — this is about learning
- Share feedback from other users

Thread context for grounding:
{threadContextJson}
```

**Example interview:**

> **User submits:** "The stacked bar chart had two scrollbars and they weren't aligned"
> 
> **Agent:** "Thanks for flagging that — I can see you were looking at the 'Risk Concentration by Asset Class' stacked bar chart (artifact 3 in this thread). A couple of quick questions:
> 1. Were both scrollbars vertical, or was one horizontal?
> 2. Did this happen when you clicked the chart in the artifacts panel, or in the expanded overlay view?"
> 
> **User:** "Both vertical, in the expanded overlay"
> 
> **Agent:** "Got it. Here's what I've captured:
> 
> **Bug Report: Double vertical scrollbars in artifact overlay**
> - Where: Expanded artifact overlay (expanded zoom level)
> - Artifact: Stacked bar chart with 6 data columns
> - Issue: Two vertical scrollbars appeared, misaligned
> - Thread: 'Risk Matrix Analysis' (thread-abc123)
> - Related artifacts: artifact-3 (stacked-bar, 6 data points)
> 
> Does that capture it accurately?"

### 2.4 Feedback Storage Tool (Agent Side)

New agent tool: `feedback_store` with **discriminated union schemas** for type safety.

```typescript
const FeedbackStoreSchema = z.discriminatedUnion('action', [
  // Create action: all key fields required
  z.object({
    action: z.literal('create'),
    idempotencyKey: z.string().min(8),          // Prevent duplicate submissions
    category: z.enum(['bug', 'idea', 'ux']),
    title: z.string().min(5).max(200),
    summary: z.string().min(10).max(4000),
    
    // Structured reproduction (for bugs):
    reproductionSteps: z.array(z.string()).max(20).optional(),
    expectedBehavior: z.string().max(2000).optional(),
    actualBehavior: z.string().max(2000).optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    
    // Context references (optional — may be unavailable):
    threadId: z.string().optional(),
    artifactIds: z.array(z.string()).max(50).optional(),
    relatedComponent: z.string().optional(),     // e.g., 'artifact-overlay', 'chart-block'
    
    // Thread context snapshot (captured by UI, passed through)
    threadContext: z.record(z.unknown()).optional(),
  }),
  
  // List action: cursor-based pagination
  z.object({
    action: z.literal('list'),
    limit: z.number().int().positive().max(50).default(20),
    cursor: z.string().optional(),               // Stable pagination
    statusFilter: z.array(z.enum(['new', 'triaged', 'in-progress', 'resolved', 'wont-fix'])).optional(),
    categoryFilter: z.enum(['bug', 'idea', 'ux']).optional(),
  }),
  
  // Get action: fetch by ID
  z.object({
    action: z.literal('get'),
    feedbackId: z.string().uuid(),
  }),
])
```

**Key changes from initial design:**
- Action-specific required fields prevent malformed submissions
- Idempotency key prevents duplicate feedback from retry storms
- Max array lengths protect against abuse
- Cursor-based pagination (not offset) for stable results

### 2.5 Thread Context Snapshot Format

```typescript
interface FeedbackThreadContext {
  threadId: string
  threadTitle: string | null
  messageCount: number
  
  // Last N messages (sanitized, redacted)
  messages: Array<{
    role: 'user' | 'agent'
    text: string                    // Rendered text content (redacted)
    timestamp: string               // NOTE: ChatMessageItem doesn't have timestamp yet — needs to be added
    hasArtifacts: boolean
    artifactSummaries?: string[]    // e.g., "stacked-bar chart: 6 data points"
  }>
  
  // Artifact snapshots stored in feedback_artifacts junction table
  // (not included in this JSON to avoid duplication)
  
  // Session metadata
  sessionMetadata: {
    agentModel: string
    streamStatus: string
    submittedAt: string
    userEmail: string               // Redacted before storage if different from submitter
  }
}
```

**⚠️ Prerequisites:**
- Add `createdAt: string` to `ChatMessageItem` in `src/components/ChatMessageList.tsx` before implementing context capture
- Implement redaction pipeline (strip emails, phone numbers, API keys, credentials) before writing to Aurora

### 2.6 Security & Privacy

| Concern | Decision |
|---------|----------|
| Context capture consent | Checkbox is ON by default but user can uncheck to submit without context |
| Context scope | Only current thread, max 20 messages. No cross-thread access. |
| **PII in feedback** | **Redaction pipeline applied before storage** — strips emails (except submitter's), phone numbers, API keys, AWS account IDs, IP addresses, credit card patterns. Agent does NOT filter — backend service handles redaction. |
| **Retention policy** | **90-day default retention.** `retention_expires_at` set on creation. Automated job purges expired records. User can request early deletion. |
| Feedback visibility | User sees only their own feedback. Admin view (role-gated) sees all. Row-level security enforced. |
| Storage | Aurora, same security posture as assessments. No public access. |
| Feedback in agent training | Never. Feedback is operational data only. |
| Audit trail | All status changes, assignments, and resolutions logged to `feedback_audit` table (Phase 5). |
| Rate limiting | Max 10 feedback submissions per user per hour to prevent abuse/spam. |

---

## 3. Data Model

### 3.1 Feedback Table (Aurora)

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,  -- Prevent duplicate submissions
  
  -- Classification
  category TEXT NOT NULL CHECK (category IN ('bug', 'idea', 'ux')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new' 
    CHECK (status IN ('new', 'triaged', 'in-progress', 'resolved', 'wont-fix')),
  
  -- Structured bug reproduction
  reproduction_steps JSONB DEFAULT '[]'::jsonb,
  expected_behavior TEXT,
  actual_behavior TEXT,
  
  -- Context (thread_id is ephemeral until thread persistence ships)
  thread_id TEXT,
  thread_title TEXT,
  thread_context JSONB,             -- FeedbackThreadContext snapshot (redacted)
  related_component TEXT,           -- UI component identifier
  
  -- Interview
  interview_transcript JSONB,       -- Agent interview Q&A pairs
  agent_classification JSONB,       -- Agent's analysis: root cause hypothesis, affected components
  
  -- Metadata
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,         -- Redacted before display if not own feedback
  session_id TEXT,
  
  -- Linkage
  roadmap_item_id TEXT,             -- Link to roadmap item if applicable
  
  -- Retention & privacy
  redacted_at TIMESTAMPTZ,          -- When PII redaction was applied
  retention_expires_at TIMESTAMPTZ, -- Auto-delete after this date (compliance)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_feedback_status_created ON feedback(status, created_at DESC);
CREATE INDEX idx_feedback_user_created ON feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_thread ON feedback(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_roadmap_item ON feedback(roadmap_item_id) WHERE roadmap_item_id IS NOT NULL;

-- Partial index for unresolved feedback
CREATE INDEX idx_feedback_unresolved ON feedback(created_at DESC) 
  WHERE status IN ('new', 'triaged', 'in-progress');

-- Retention expiry index for cleanup jobs
CREATE INDEX idx_feedback_retention_expiry ON feedback(retention_expires_at) 
  WHERE retention_expires_at IS NOT NULL;
```

### 3.2 Feedback-Artifact Junction Table

```sql
CREATE TABLE IF NOT EXISTS feedback_artifacts (
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,       -- 'chart', 'table', 'recommendation', etc.
  artifact_title TEXT,
  artifact_block JSONB,              -- Full block payload for reproduction
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (feedback_id, artifact_id)
);

CREATE INDEX idx_feedback_artifacts_feedback ON feedback_artifacts(feedback_id);
```

**Why a junction table?** Normalizes the many-to-many relationship, enables querying "all feedback for artifact X", prevents array length abuse, and stores artifact snapshots for reproduction.

### 3.3 Roadmap Items Table (Aurora — v1)

```sql
CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('analysis', 'integrations', 'intelligence', 'platform')),
  status TEXT NOT NULL CHECK (status IN ('shipped', 'in-progress', 'planned', 'exploring')),
  horizon TEXT NOT NULL CHECK (horizon IN ('now', 'next', 'later')),
  shipped_at DATE,                   -- DATE type, not TEXT (better for queries/sorting)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for roadmap page queries
CREATE INDEX idx_roadmap_horizon_sort ON roadmap_items(horizon, sort_order);
CREATE INDEX idx_roadmap_category_sort ON roadmap_items(category, sort_order);
CREATE INDEX idx_roadmap_status ON roadmap_items(status);
```

**Note:** `feedback_count` removed — computed via `SELECT COUNT(*) FROM feedback WHERE roadmap_item_id = ?` to avoid drift. Can add a materialized view or trigger-maintained count if performance requires it.

---

## 4. Implementation Phases

### Phase 1: TopBar + Roadmap Page (Aurora-Backed)

**Goal:** Roadmap and Feedback buttons in TopBar, roadmap page backed by Aurora.

**Deliverables:**

**Agent side (cei-agent):**
- `src/storage/roadmap.ts` — RoadmapStorage adapter (create, update, list, get, upsert)
- `src/tools/roadmap_manage.ts` — Agent tool: `roadmap_manage` with actions `list`, `get`, `create`, `update` (for agent-driven updates)
- `src/api/routes/roadmap.ts` — **REST endpoint:**
  - `GET /v1/roadmap/items` — List all roadmap items (public or auth-required, no pagination needed for v1)
- `db_lookup` extension: `type='roadmap'` for querying roadmap items
- Migration for `roadmap_items` table
- `scripts/seed-roadmap.ts` — Idempotent seed script with initial roadmap data
- System prompt addition: agent can update roadmap item status as features ship

**UI side (cei-ui):**
- TopBar update: Add "Roadmap" and "Feedback" buttons between email and sign-out
- New route: `/roadmap` (protected)
- `src/roadmap/RoadmapPage.tsx` — Full roadmap layout with Now/Next/Later + categories
- `src/roadmap/RoadmapCard.tsx` — Individual item card with status badge
- `src/roadmap/RoadmapColumn.tsx` — Time horizon column
- `src/roadmap/RoadmapCategorySection.tsx` — Category grouping
- `src/roadmap/roadmap.css` — Styling (same design system)
- `src/roadmap/RoadmapFetch.ts` — HTTP client: `GET /v1/roadmap/items` with auth token
- Back to Command Center navigation
- Responsive layout (columns → stacked on mobile)

**Why REST endpoint instead of tool call?** Roadmap page data should not depend on LLM behavior. Dedicated endpoint is faster, cacheable, and decouples UI rendering from agent streaming.

**Tests:** ~18 new tests (storage adapter, tool validation, seed script, page render, routing, category filtering)  
**Risk:** Low-medium — new table + tool, but follows established patterns (same as risk instance storage)

### Phase 2: Feedback Storage (Agent + Aurora + REST API)

**Goal:** Minimal durable feedback storage with redaction, auth, and REST API. No interview yet.

**Deliverables:**

**Agent side (cei-agent):**
- `src/storage/feedback.ts` — FeedbackStorage adapter (create, list, get with row-level security)
- `src/storage/feedback-artifacts.ts` — FeedbackArtifactsStorage adapter (junction table)
- `src/tools/feedback_store.ts` — Agent tool for storing/querying feedback (discriminated union schema)
- `src/api/routes/feedback.ts` — REST endpoints:
  - `POST /v1/feedback` — Create feedback (returns `feedbackId`)
  - `GET /v1/feedback` — List own feedback (cursor pagination, auth required)
  - `GET /v1/feedback/:id` — Get feedback detail (auth + row-level security)
- `src/security/redaction.ts` — PII redaction pipeline (emails, phone numbers, API keys, IPs)
- Migration scripts for `feedback` + `feedback_artifacts` tables
- `db_lookup` extension: `type='feedback'` for querying stored feedback
- Rate limiter: max 10 submissions/user/hour

**Tests:** ~25 new (storage adapter, junction table, tool validation, REST endpoints, redaction, authz, rate limiting)  
**Risk:** Medium — new Aurora tables, REST API, redaction logic

### Phase 3: Feedback SlideOver (UI Side)

**Goal:** Feedback entry UI that submits directly to the REST API. No agent involvement yet.

**Deliverables:**

**UI side (cei-ui):**
- `src/feedback/FeedbackSlideOver.tsx` — SlideOver with category picker, text area, context toggle
- `src/feedback/FeedbackContextCapture.ts` — Utility to snapshot current thread (messages + artifacts)
- `src/feedback/FeedbackSubmit.ts` — HTTP client to POST to `/v1/feedback` endpoint
- TopBar "Feedback" button opens the SlideOver
- On submit:
  1. Capture thread context (if checkbox enabled)
  2. Generate idempotency key (`crypto.randomUUID()`)
  3. POST to `/v1/feedback` with auth token
  4. Show success confirmation with feedback ID
- Error handling: network failures, rate limit (429), validation errors

**Why this approach:** Durable capture first. Interview enrichment is optional and can happen asynchronously after the core feedback is safely stored.

**Tests:** ~8 new tests (SlideOver render, context capture, submit flow, error handling)  
**Risk:** Low — UI-only, calls existing REST endpoint

### Phase 4: Feedback Interview Enhancement

**Goal:** Full contextual interview with thread grounding. Agent references specific messages and artifacts.

**Deliverables:**
- Thread context injection into feedback interview prompt
- Agent references specific artifact titles, chart types, message content
- Structured reproduction step extraction from conversation
- Agent classification: root cause hypothesis, affected component, severity recommendation
- Interview transcript stored alongside feedback record

**Tests:** ~10 new  
**Risk:** Medium — prompt engineering, quality depends on agent reasoning

### Phase 5: Feedback Dashboard (Admin View, Future)

**Goal:** View all feedback, filter by category/status/severity, link to roadmap items.

**Deliverables:**
- New route: `/feedback/dashboard` (admin-only, role-gated)
- Feedback list with filters (category, status, severity, date range)
- Feedback detail view with thread context replay
- Link feedback to roadmap items
- Feedback count badges on roadmap items
- Status management (triage → in-progress → resolved)

**Tests:** ~12 new  
**Risk:** Low-medium — read-only views + status updates

### Phase 6: Roadmap Enhancements (Future)

**Goal:** Advanced roadmap features: user voting, public visibility, feedback-driven prioritization.

**Deliverables:**
- User voting on roadmap items (upvote count stored in Aurora)
- Public vs internal item visibility flags (unauthenticated roadmap view)
- Feedback-driven priority scoring (items with most linked feedback rise)
- Roadmap changelog: auto-generated "Recently Shipped" from status transitions

---

## 5. Testing Strategy

### Unit Tests
- TopBar button rendering and navigation
- Roadmap data structure validation
- RoadmapPage category filtering and horizon grouping
- FeedbackSlideOver form validation
- Context capture utility (message truncation, artifact serialization)
- Feedback storage adapter (CRUD operations)

### Integration Tests
- Router navigation: `/` → `/roadmap` → back
- Feedback submission flow: SlideOver → message injection → agent response
- Thread context snapshot accuracy (correct messages, correct artifacts)

### CSS Regression Tests
- Roadmap responsive layout (columns vs stacked)
- Feedback SlideOver positioning and scroll behavior

### E2E Tests (Future, with Playwright)
- Full feedback flow: open → fill → submit → agent interview → confirmation
- Roadmap page renders all categories and statuses
- Cross-page navigation between Command Center and Roadmap

---

## Appendix A: Roadmap Content (Initial)

### Recently Shipped
| Item | Description | Date |
|------|-------------|------|
| Command Center Redesign | War-room precision layout with thread navigation, artifact zoom, activity drawer | Feb 2026 |
| Risk & Control Matrix | Coverage gaps, duplicate detection, risk hotspots, residual risk scoring | Feb 2026 |
| Agent UI Enhancements | Confidence badges with decay, reasoning transparency, task progress | Feb 2026 |
| Assessment-as-Artifact | Inline assessment summaries with drill-down to mappings | Feb 2026 |
| Direct AgentCore Invoke | Streaming agent responses via direct invoke (bypassing API Gateway 30s limit) | Feb 2026 |
| Regulatory Assimilation | Framework ingestion, scope analysis, requirement-to-control mapping | Jan 2026 |

### Now (In Progress)
| Item | Category | Description |
|------|----------|-------------|
| ServiceNow Action Worker | Integrations | Draft change requests, incidents, and problems in ServiceNow from agent analysis |
| Feedback System | Platform | Contextual feedback with agent interview and thread grounding |

### Next (Planned)
| Item | Category | Description |
|------|----------|-------------|
| Thread Persistence | Platform | Server-side thread storage in Aurora (currently client-side only) |
| Impact Simulations | Analysis | "What if" modeling for control changes and risk scenarios |
| Artifact Navigation | Platform | Prev/next switching, artifact search, cross-thread artifact view |

### Later (Exploring)
| Item | Category | Description |
|------|----------|-------------|
| Multi-Agent Workflows | Intelligence | Parallel agent runs for complex analysis tasks |
| SOAR Integration | Integrations | Bi-directional integration with security orchestration platforms |
| Role-Based Access Control | Platform | Scoped permissions per user role (analyst, admin, auditor) |
| Public Roadmap | Platform | Unauthenticated roadmap view for stakeholder transparency |

---

## Appendix B: Design References

- **Linear Roadmap** — Clean, minimal, time-horizon columns, status badges
- **GitHub Public Roadmap** — Category grouping, quarterly horizons, linked issues
- **Productboard** — Outcome-oriented descriptions, user impact scoring
- **Notion Product Roadmap Template** — Kanban-style Now/Next/Later with rich cards
- **Intercom** — In-app feedback with conversation context, auto-categorization
- **Canny** — Feedback boards with voting, status tracking, changelog linkage

---

## Appendix C: Open Questions

1. **Multi-tenancy:** Is CEI multi-tenant per org/account? If yes, `org_id` must be first-class in all feedback and roadmap queries with row-level security.
   - **Current assumption:** Single-org deployment for v1. Add org scoping in v2 if needed.

2. **Feedback mutability:** Should feedback be immutable after submission, or editable by reporter for a short window?
   - **Current assumption:** Immutable. User can submit new feedback if they have more info. Edit capability can be added in Phase 5.

3. **Retention compliance:** Is there a compliance retention window requirement (e.g., 90/180/365 days)?
   - **Current assumption:** 90-day default retention. Configurable via environment variable.

4. **Thread persistence timing:** When will server-side thread persistence ship?
   - **Current assumption:** Phase 4 or later. Until then, `thread_id` in feedback is ephemeral/optional.

---

## Appendix D: Codex Review Summary

This plan was reviewed by Codex (gpt-5.2-codex) on 2026-02-12. Key recommendations incorporated:

**Critical fixes applied:**
- Phase ordering: Storage before UI SlideOver (durable capture first)
- Discriminated union schemas with action-specific required fields
- Idempotency key for duplicate prevention
- Redaction pipeline and retention policy added to v1 scope
- Junction table for feedback-artifact linkage (normalized)

**Architecture improvements applied:**
- Dedicated REST endpoints (`/v1/roadmap/items`, `/v1/feedback`) instead of tool calls for page data
- Cursor-based pagination (not offset)
- Proper indexes: composite, partial, retention expiry
- `shipped_at` DATE instead of `shipped_date TEXT`
- Computed feedback counts (no cached denormalization)

**Security enhancements applied:**
- Row-level authorization on `list/get`
- Rate limiting (10 submissions/user/hour)
- Audit trail placeholder (Phase 5)
- Explicit PII redaction (emails, phones, API keys, IPs)

**Still deferred to future phases:**
- Dedupe/similarity clustering
- Full-text search
- Notifications to reporter
- User voting on roadmap items
- Public roadmap visibility flags

**Testing recommendations noted:**
- Migration tests (constraints/indexes)
- Authz leakage tests
- Redaction tests
- Idempotency tests
- Prompt-injection tests
- Contract tests (UI ↔ backend schema alignment)
