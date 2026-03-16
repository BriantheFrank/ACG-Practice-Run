# ACG Practice Run

Native Next.js App Router workbench for conservative OPORD drafting and mission-graph analysis.

## Current Repo Scope

- `/` renders the primary OPORD workbench.
- `/api/analyze` builds a Mission Planning Graph from planner input.
- `/api/opord` renders a five-paragraph OPORD draft from a Mission Planning Graph.
- `/api/missions` persists drafts and generated versions when Supabase is configured.

There is no legacy static-site sync pipeline in the current tracked repository state. The application is owned directly by the App Router files under `app/`, `components/`, and `lib/`.

## Environment

- `OPENAI_API_KEY`: optional. When absent, the app uses a local conservative fallback builder instead of OpenAI responses.
- `SUPABASE_URL`: optional for analysis and OPORD generation, required for draft and version persistence.
- `SUPABASE_SERVICE_ROLE_KEY`: optional for analysis and OPORD generation, required for draft and version persistence.

## Validation

- `npm run check` verifies critical file integrity, typechecks, and lints.
- `npm run build` runs the integrity guardrail and produces the production Next.js build.

## Deployment Notes

- The repo-side build path is Vercel-ready when `npm run build` succeeds.
- Production persistence requires the Supabase environment variables above.
