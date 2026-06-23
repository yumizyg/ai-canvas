# Local Startup Runbook

Use one startup path for this project: Docker Compose runs the app, worker,
Postgres, and Redis together. Do not mix Docker infrastructure with a host-side
Next.js process unless you are explicitly debugging startup internals.

## Known Good Local Architecture

- Docker Compose project: `ai-canvas`
- Services:
  - `app` on `http://127.0.0.1:3000`
  - `worker`
  - `postgres` on host port `15432`
  - `redis` on host port `6379`
- Node runtime is pinned to Node 20 via `.nvmrc`, `.node-version`, and
  `Dockerfile`.

Prefer `127.0.0.1` over `localhost` while VPN/proxy tools are active.

## Start

Start Docker Desktop manually, wait for Engine Running, then run:

```powershell
.\scripts\start-docker.ps1
```

or:

```cmd
scripts\start-docker.cmd
```

The script:

- Stops stale host-side Next/worker Node processes for this project.
- Builds the Docker image.
- Starts `app`, `worker`, `postgres`, and `redis`.
- Waits for Docker health checks.
- Runs `scripts\verify-local-prod.ps1`.

The app is ready only when the verifier prints:

```text
OK: local AI canvas startup is healthy at http://127.0.0.1:3000
```

## Fast Commands

```powershell
npm run docker:up
npm run verify:local
docker compose -p ai-canvas ps
docker compose -p ai-canvas logs --tail=120 app
```

## Do Not Treat These As Healthy

- Docker Desktop shows green Postgres/Redis only. The `app` service must also be
  healthy.
- The browser returns HTML but buttons do nothing. Verify `_next/static/*.js`
  chunks with `npm run verify:local`.
- Login API returns 200 but `/api/auth/me` does not show the same session.
- A stale browser tab still shows an old "checking login" screen.

## Backup Host-Side Path

The old host-side production script still exists for emergency debugging:

```cmd
scripts\start-local-prod.cmd
```

Do not use it as the normal workflow. It depends on a local `.next/standalone`
build and can be affected by Windows Node versions, stale processes, and file
locks.

## If Startup Fails

Stop after one failed startup cycle. Do not keep trying random launch methods.

1. Run `docker compose -p ai-canvas ps`.
2. Read `docker compose -p ai-canvas logs --tail=160 app`.
3. Record the failure in `docs/codex-bugbook-pending.md`.
4. Fix the specific failing layer before feature work resumes.
