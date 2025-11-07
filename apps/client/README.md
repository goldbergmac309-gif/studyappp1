# @studyapp/client — Client Foundation (Phase 3 · Sprint 1)

This is the client application for Synapse OS. It uses Next.js (App Router), Tailwind CSS v4, shadcn/ui, Zustand, Axios, and TypeScript. The core UX principle is “Calm, Focused, Fluid.”

The current sprint delivers:

- Protected app shell with persistent Header + Sidebar.
- Authentication flow (login/signup) backed by a global auth store and Axios interceptors.
- Dashboard with subject creation and listing.
- Subject Workspace with Breadcrumbs, Overview/Documents/Insights tabs, and a wired Upload document button.

## Getting Started

1) Install dependencies from the monorepo root:

```bash
pnpm install
```

2) Configure environment variables. Create `apps/client/.env.local` with:

```bash
NEXT_PUBLIC_API_BASE_URL=/api
```

Notes:

- In development, the client proxies all requests from `/api/*` to the backend on `http://localhost:3000/*` via a Next.js rewrite configured in `next.config.ts`. You do not need to hardcode the backend URL here.

3) Start the dev servers:

- Backend (from the backend service directory):

```bash
pnpm start:dev
```

- Client (from this directory):

```bash
pnpm dev
```

The client runs on http://localhost:3100 by default (see `package.json`), and the backend on http://localhost:3000.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Public base path for API calls. In development, set to `/api` to use the Next.js rewrite proxy.

## Architecture Notes

- Global auth state is managed with a Zustand store in `src/lib/store.ts`. The `useAuth()` hook exposes `token`, `user`, and `actions`.
- All API calls go through the pre-configured Axios instance in `src/lib/api.ts`.
  - Request interceptor attaches `Authorization: Bearer <token>` from the store.
  - Response interceptor logs out automatically on `401`, clearing the session.
- UI components use shadcn/ui primitives for visual consistency.
- The protected layout lives at `app/(dashboard)/layout.tsx` and redirects to `/login` when no token is present.

## Insight Sessions (SSE)

The client subscribes to real-time Insight Session updates using Server-Sent Events (SSE) to avoid polling.

- Helper: `src/lib/api.ts` — `streamInsightSession(sessionId, { onEvent, onError, onDone })`
- Integration: `app/(dashboard)/subjects/[subjectId]/_components/insights-tab.tsx`
  - Automatically aborts the stream when the session reaches `READY` or `FAILED`.
  - Falls back to periodic polling if the SSE connection fails.

## Upload Allowlist & Security

Uploads are limited to: PDF, TXT, MD, DOCX, DOC. Unsupported files are rejected with HTTP 415 before a `Document` is created.

All accepted uploads are scanned for malware prior to storage, and the UI surfaces common error cases via toasts.

## Useful Scripts

```bash
pnpm dev        # Start the client app on port 3100 (Turbopack)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript typecheck
pnpm lint       # ESLint
```

## Troubleshooting

- CORS in development: ensure `NEXT_PUBLIC_API_BASE_URL=/api` and that `next.config.ts` contains a rewrite from `/api/:path*` to `http://localhost:3000/:path*`.
- 401 responses: verify the backend is running and that your credentials are valid. The client will auto-logout on 401.

## License

Proprietary — internal use only.
