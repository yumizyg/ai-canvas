## 2026-06-22 - Canvas MVP needed real edit and generation affordances

- Symptom: The workbench looked like a mockup; generation appeared to do nothing and common edit actions were missing.
- Cause: Mock generation returned a transparent 1px image, the canvas lacked explicit copy/delete/upload/reset controls, and task errors were not visible enough in the UI.
- Fix: Added visible mock SVG generation, upload API, floating toolbar, node copy/delete/reset actions, asset upload/replacement, clearer job/error states, and rewrote the page text/UI controls.
- Prevention: For canvas tools, verify both API success and visible canvas output before calling the feature complete.
- Verification: `npm test`, `npm run build`, and API smoke test from login through generated asset file HTTP 200.

## 2026-06-22 - Seedream display name was sent as model id

- Symptom: Volcengine returned `The model or endpoint Doubao-Seedream-4.0 does not exist or you do not have access to it`.
- Cause: The admin UI allowed a marketing/display name to be saved as the provider `model` value, but Ark expects an accessible model or endpoint id.
- Fix: Added Seedream model-id normalization for common aliases and changed the admin UI to a recommended model-id selector.
- Prevention: Provider adapters should normalize or validate user-facing model labels before sending API requests.
- Verification: `npm test`, `npm run build`, and admin API smoke test showing `Doubao-Seedream-4.0` saves as `doubao-seedream-4-0-250828`.

## 2026-06-22 - Canvas prompt and size controls were unclear

- Symptom: Prompt cards appeared to have no effect, the inspector panel was hard to use, and image size selection was unclear.
- Cause: The UI did not expose the resolved prompt flowing into generation, only allowed one prompt edge per input, and used a basic size dropdown buried in the inspector.
- Fix: Added multi-prompt input resolution, visible node port labels, input preview, one-click prompt linking, size buttons plus custom size input, and a sticky/scrollable inspector layout.
- Prevention: Canvas data-flow tools should always show the effective inputs used before running a generation.
- Verification: `npm test`, `npm run build`, and login/canvas/model API smoke test.

## 2026-06-23 - Canvas output and asset operations were incomplete

- Symptom: Nodes and edges lacked right-click actions, node previews could not be resized, generated images had no download path, ratio/resolution choices were missing, and output nodes did not collect usable asset details.
- Cause: Canvas asset data existed on generated/source nodes but was not propagated into output nodes or exposed through context menus, resize controls, and export affordances.
- Fix: Added React Flow context menus, node resize handles, image download actions, ratio/resolution/W/H controls, generation payload dimensions, and output-node preview/prompt/parameter propagation.
- Prevention: Treat generated images as first-class canvas assets with inspect, resize, route, and export actions wherever they appear.
- Verification: `npm test`, `npm run build`, and dev-server smoke test for login, `/canvas`, and `/api/models`.

## 2026-06-23 - Local startup repeatedly stalled before development

- Symptom: The app alternated between connection failures, a stuck "正在检查登录状态" screen, login loops, and server-rendered pages where buttons did nothing.
- Cause: Several environment problems stacked together: the Codex runtime briefly used a restricted Windows user without Docker pipe access, Docker only had Postgres/Redis running, stale host Node processes held port 3000, local production cookies were marked `Secure` over HTTP, and the standalone Next.js server was started without copying `.next/static` into `.next/standalone/.next/static`, so client chunks returned 404 and React never hydrated.
- Fix: Changed local auth cookies to require explicit `COOKIE_SECURE=true`, added form-login fallback for no-JS/no-hydration cases, fixed `scripts/start-local-prod.cmd` to set local env and copy standalone static assets, added `scripts/verify-local-prod.ps1`, and documented the known-good local startup flow.
- Prevention: Before feature work, follow `docs/local-startup-runbook.md` and run `powershell -ExecutionPolicy Bypass -File .\scripts\verify-local-prod.ps1`; do not treat HTML 200 as healthy unless session login and `_next/static` chunks also pass.
- Verification: `npm run build`; manual checks that form login returns 303 to `http://127.0.0.1:3000/canvas`, local cookie does not include `Secure`, `/api/auth/me` returns admin with the same session, and the startup verifier covers static chunks, login, session, and canvas HTTP 200.

## 2026-06-23 - Docker startup needed an ASCII build context

- Symptom: Docker Compose failed before creating the app container with `x-docker-expose-session-sharedkey` containing non-printable ASCII characters.
- Cause: Docker BuildKit/Bake session metadata did not tolerate the Chinese project path `E:\project\画布网页`.
- Fix: `scripts/start-docker.ps1` now mirrors the project into `C:\Users\27915\.cache\ai-canvas-docker-context` before running Docker Compose.
- Prevention: Build Docker images from an ASCII-only path on Windows; keep the source project path separate if needed.
- Verification: `powershell -ExecutionPolicy Bypass -File .\scripts\start-docker.ps1` and `scripts\verify-local-prod.ps1`.

## 2026-06-23 - Docker image and worker runtime were not production-ready

- Symptom: Docker build failed on missing `/app/public`, Prisma warned about missing OpenSSL, and the worker exited on unresolved `@/` imports.
- Cause: The Dockerfile assumed optional Next public assets existed, Alpine lacked OpenSSL for Prisma, and `tsx src/worker.ts` does not resolve Next's path aliases at runtime.
- Fix: Added an OpenSSL-equipped Docker base stage, removed the hard public copy, added `public/.gitkeep`, set `HOSTNAME=0.0.0.0`, and changed worker/provider imports to runtime-safe relative paths.
- Prevention: Verify both `app` and `worker` containers after Compose startup, not just browser HTTP 200.
- Verification: `npx tsc --noEmit`, `npm test`, `docker compose -p ai-canvas ps`, and `scripts\verify-local-prod.ps1`.

## 2026-06-23 - Canvas generation controls did not match model type

- Symptom: Video nodes had no generation button, and Seedream image output ignored selected aspect ratio.
- Cause: The canvas submit handler only allowed `imageGen` nodes, while the Seedream adapter prioritized coarse `1K/2K/4K` resolution over the selected pixel size.
- Fix: Allowed `videoGen` submissions, added Seedance video task handling in the Volcengine adapter/worker, and made Seedream submit `widthxheight` when canvas dimensions are set.
- Prevention: For every model type exposed in the admin panel, verify there is a matching canvas action and provider worker path.
- Verification: `npx tsc --noEmit`, `npm test`, Docker rebuild, `docker compose -p ai-canvas ps`, and `scripts\verify-local-prod.ps1`.
