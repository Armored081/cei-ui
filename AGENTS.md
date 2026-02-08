# Agent Development Guide - CEI UI

This document provides guidance for AI agents working on the CEI UI codebase.

## Purpose and Scope

CEI UI is a React SPA that serves as the frontend for the CEI Agent. It communicates with the CEI Agent runtime via SSE streaming through API Gateway HTTP API.

## Directory Structure

```
cei-ui/
├── src/
│   ├── agent/                        # Agent client and type contracts
│   │   ├── AgentClient.ts            # SSE streaming client for /invoke endpoint
│   │   ├── AgentClient.test.ts       # Client tests
│   │   ├── types.ts                  # Zod schemas: StreamEvent, AttachmentInput, StructuredBlock, etc.
│   │   └── types.test.ts             # Schema validation tests
│   │
│   ├── auth/                         # Cognito authentication
│   │   ├── authConfig.ts             # Amplify Auth configuration
│   │   ├── AuthProvider.tsx           # Auth context provider
│   │   ├── LoginPage.tsx             # Login UI
│   │   └── ProtectedRoute.tsx        # Route guard
│   │
│   ├── components/                   # UI components
│   │   ├── ChatPage.tsx              # Main chat interface (composer, attachments, streaming)
│   │   ├── ChatPage.css              # Chat styles
│   │   ├── ChatMessageList.tsx       # Message timeline renderer
│   │   ├── AttachmentPreview.tsx     # Attachment preview with remove/status
│   │   ├── SectionCard.tsx           # Layout wrapper
│   │   └── blocks/                   # Structured output renderers
│   │       ├── ChartBlock.tsx        # 8 chart types (bar/line/pie/area + multi-series variants)
│   │       ├── TableBlock.tsx        # Sortable data tables
│   │       ├── RecommendationBlock.tsx # Severity-graded recommendations
│   │       └── BlockDownloadButton.tsx # CSV/JSON export
│   │
│   ├── test/
│   │   └── setup.ts                  # Vitest setup (jsdom)
│   │
│   ├── App.tsx                       # Router setup
│   └── main.tsx                      # Entry point
│
├── public/                           # Static assets
└── index.html                        # HTML template
```

## Tech Stack

- **Framework:** React 18 + TypeScript 5.9
- **Build:** Vite 7
- **Testing:** Vitest 4 + @testing-library/react + jsdom
- **Linting:** ESLint 9 + Prettier 3
- **Auth:** AWS Amplify (Cognito)
- **Charts:** Recharts 3
- **Validation:** Zod 4
- **Hosting:** AWS Amplify Hosting

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # TypeScript check + Vite build
npm run test         # Vitest run (NOT Jest — no --runInBand)
npm run lint         # ESLint with zero warnings
npm run format       # Prettier write (NOT format:check)
npx tsc --noEmit     # Type check only
```

## Coding Rules (MANDATORY)

### TypeScript
- Explicit return types on exported and non-trivial functions
- No `any`; use `unknown` + narrowing where needed
- Zod schemas at external boundaries (API payloads, stream events)
- Use `||` not `??` for env var fallbacks (empty strings don't fall through with `??`)
- TSDoc for exported functions/types

### React
- Functional components only
- Props interfaces defined above component
- Event handlers prefixed with `on` (e.g., `onRetryMessage`)
- State management via `useState`/`useRef` — no external state library
- Cleanup effects in `useEffect` return

### Testing
- Use Vitest (NOT Jest — no `--runInBand` or other Jest flags)
- Use `@testing-library/react` for component tests
- Test files colocated with source: `Component.test.tsx`
- Mock `fetch` with `vi.fn()` for API tests
- Always run `npm run format` before committing (not `format:check`)

### Patterns
- SSE streaming via `ReadableStream` in AgentClient
- Structured output: agent emits `<!--block-->` markers → parsed into typed blocks → rendered by block components
- Error handling: separate 401 (auth expiry) from 403 (forbidden) — never force logout on transient errors
- Retry: store sent attachments with message item — retry uses stored attachments, not current composer state
- Chart types: 8 total (4 single-series: bar/line/pie/area + 4 multi-series: stacked-bar/grouped-bar/multi-line/stacked-area)
- Color overrides: optional `colors: string[]` with fallback to CSS `--chart-series-N` variables

### Schema Contract (with cei-agent)
- `AttachmentInput`: `{ name: string, mime: string, data: string (base64), sizeBytes: number }`
- `StreamEvent`: delta | done | error | block
- `StructuredBlock`: chart | table | recommendation (with Zod refinement validation)
- Multi-series data requires `label` field for cartesian X-axis
- Data shape must match chartType (enforced via Zod refinement, not discriminatedUnion)

## Key Architecture Decisions
- **SSE over WebSocket:** Simpler, works through API Gateway HTTP API, sufficient for request-response streaming
- **No state management library:** App state is simple enough for React hooks
- **Zod at boundaries:** Type-safe parsing of all API responses and structured blocks
- **Selective retry:** Only retryable errors show retry button — prevents misleading UX for config/permission errors
