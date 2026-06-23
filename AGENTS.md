# Project Agent Rules

Before changing features in this repository, read:

- `docs/codex-bugbook-pending.md`
- `docs/codex-bugbook.md`
- `docs/local-startup-runbook.md`

Bug data is project-local and must stay in the two bugbook files above.

## Startup Contract

Use the known-good local setup from `docs/local-startup-runbook.md`:

- Docker runs Postgres and Redis only.
- Windows host runs the Next.js standalone server and worker through `scripts/start-local-prod.cmd`.
- Open `http://127.0.0.1:3000`, not `localhost`, when VPN/proxy tools may interfere.

Before declaring the app usable, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local-prod.ps1
```

Do not call the app healthy unless the verifier passes.

## Important Local Pitfalls

- `output: "standalone"` means do not use `next start` as the primary local production runtime.
- The standalone server must have `.next/static` copied to `.next/standalone/.next/static`; otherwise pages render HTML but React does not hydrate.
- Local HTTP cookies must not be `Secure`; set `COOKIE_SECURE=false`.
- Stop old Node app/worker processes before `npm run build` to avoid Prisma DLL lock errors.
- If Docker is needed, confirm the active user is the real Windows user and is in `docker-users`.
