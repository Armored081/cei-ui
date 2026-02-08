# CEI UI

React SPA for the CEI Agent. Provides a streaming chat interface with authentication, structured output rendering, and error handling.

## Architecture

```
React + Vite + TypeScript
  → AWS Cognito (auth via @aws-amplify/auth)
  → API Gateway HTTP API
  → AgentCore Runtime (SSE streaming)
```

### Key Directories

- `src/auth/` — Cognito auth provider, login page, protected route wrapper, access token helper
- `src/agent/` — SSE streaming client (`AgentClient.ts`), stream event types
- `src/components/` — Chat UI, structured output renderers
- `src/theme/` — Dark theme tokens and global styles

## Features

- **SSE Streaming:** Async generator consumes `/invoke` SSE stream, rendering tokens as they arrive
- **Structured Output Rendering:** Rich blocks emitted by the agent render as interactive components:
  - **8 chart types** (bar, line, pie, area, stacked-bar, grouped-bar, multi-line, stacked-area) via Recharts
  - **Sortable tables** with column headers
  - **Severity-graded recommendations** (high / medium / low)
- **Schema Validation:** Zod schemas validate block payloads; refinement rules ensure data shape matches `chartType` (e.g., multi-series charts require `series` field)
- **Error Handling:** Network and stream errors display inline with selective retry
- **Cancel:** Press Escape to abort an in-flight stream
- **Auth States:** `loading`, `authenticated`, `unauthenticated` with automatic redirect to login

## Stream Contract

SSE events from the agent:

| `type`        | Description                         |
| ------------- | ----------------------------------- |
| `delta`       | Text token                          |
| `block`       | Structured output (chart/table/rec) |
| `tool_call`   | Tool invocation indicator           |
| `tool_result` | Tool response                       |
| `done`        | Stream complete                     |
| `error`       | Server-side error                   |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Fill in the required values:

- `VITE_API_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_REGION`

4. Start the app:

```bash
npm run dev
```

## Scripts

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Start local dev server         |
| `npm run build`        | Typecheck and production build |
| `npm run lint`         | Run ESLint                     |
| `npm run format`       | Format all files with Prettier |
| `npm run format:check` | Verify formatting              |
| `npm test`             | Run Vitest once                |
| `npm run test:watch`   | Run Vitest in watch mode       |

## Testing

- `src/agent/AgentClient.test.ts` — SSE parsing, auth headers, network error handling
- `src/auth/AuthProvider.test.tsx` — Auth state transitions
