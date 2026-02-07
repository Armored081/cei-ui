# CEI UI

Standalone React SPA for the CEI Agent. Phase 1 provides authentication with Cognito and a minimal streaming client that calls the CEI `/invoke` endpoint over SSE.

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

## Architecture (Phase 1)

- `src/auth/`
- `AuthProvider` for auth state (`loading`, `authenticated`, `unauthenticated`)
- Login page and protected route wrapper
- Access token helper for authenticated API calls

- `src/agent/`
- `types.ts` with the stream contract (`delta`, `block`, `tool_call`, `tool_result`, `done`, `error`)
- `AgentClient.ts` async generator for `/invoke` SSE streaming

- `src/components/ChatPage.tsx`
- Minimal proof-of-concept chat UI
- Sends a prompt and concatenates incoming `delta` stream events
- Shows `Connecting...`, `Streaming...`, `Done`, and `Error` states

- `src/theme/`
- Dark theme tokens and global styles

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - typecheck and production build
- `npm run lint` - run ESLint
- `npm run format` - format all files with Prettier
- `npm run format:check` - verify formatting
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode

## Testing

- `src/agent/AgentClient.test.ts` validates SSE parsing, auth/request headers, and network error handling.
- `src/auth/AuthProvider.test.tsx` validates auth state transitions.
