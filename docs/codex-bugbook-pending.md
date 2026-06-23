## 2026-06-22 - Canvas MVP feels nonfunctional

- Status: archived
- Trigger: User reported the current URL is only a mockup, cannot generate, and lacks edit controls.
- Symptom: The app UI exists but generation/editing workflows are insufficiently discoverable or reliable.
- Context: `src/app/page.tsx`, generation API/worker, canvas node editing.
- Initial read: The first MVP has a minimal property panel and background worker, but lacks explicit canvas edit actions, visible generation output quality, node upload/edit controls, and robust save-before-generate behavior.
- Next check: Resolved by adding editing toolbar/actions, visible mock generated images, upload support, generation diagnostics, and API/build smoke verification.

## 2026-06-22 - Seedream model display name causes Volcengine API failure

- Status: archived
- Trigger: User reported generation error: The model or endpoint Doubao-Seedream-4.0 does not exist or you do not have access to it.
- Symptom: Fireworks/Volcengine Seedream request reaches the provider but fails because the `model` value is not an accessible endpoint/model id.
- Context: `src/lib/providers/volcengine.ts`, `src/app/admin/models/page.tsx`, `/api/admin/models`.
- Initial read: Admin UI allows entering a marketing/display model name, but Volcengine Ark expects the exact model or endpoint id available to the account.
- Next check: Resolved by normalizing common Seedream display names to `doubao-seedream-4-0-250828` in both admin save and provider calls.

## 2026-06-22 - Canvas prompt passing and inspector UX are incomplete

- Status: archived
- Trigger: User reported prompt cards do not pass parameters, right inspector is incomplete, and generated image size cannot be defined.
- Symptom: Canvas interactions feel buggy: prompt nodes are not visibly or reliably applied, inspector fields can be hidden, and size settings are unclear.
- Context: `src/app/canvas/page.tsx`, `src/lib/canvas.ts`, generation payload construction.
- Initial read: The MVP has backend support for prompt resolution and size, but the UI does not make data flow explicit and may use stale selected node data during generation.
- Next check: Resolved by adding multi-prompt passing, visible input preview, explicit size controls, and inspector layout fixes.

## 2026-06-23 - Canvas node operations and output workflow are incomplete

- Status: archived
- Trigger: User reported nodes/edges lack right-click actions, cards cannot resize, images cannot download, resolution/ratio choices are missing, and output nodes do nothing.
- Symptom: The canvas cannot support a full internal generation workflow because generated assets are hard to inspect, resize, export, or route into output nodes.
- Context: `src/app/canvas/page.tsx`, `src/app/globals.css`, `src/lib/canvas.ts`, generation payload/provider params.
- Initial read: React Flow has node/edge data and generated assets, but the UI does not expose context menus, resize handles, download actions, or output-node propagation.
- Next check: Resolved by adding node/edge/pane context menus, resize handles, download actions, aspect/resolution controls, output-node asset propagation, and build/API smoke verification.

## 2026-06-23 - Local startup and login checks wasted development time

- Status: archived
- Trigger: User reported repeated failures opening the canvas, Docker permission confusion, and the app stuck on "正在检查登录状态".
- Symptom: The local app appeared reachable at times but the browser could not reliably enter the canvas; login did not persist and pages sometimes rendered without working client interactions.
- Context: `scripts/start-local-prod.cmd`, `src/lib/auth.ts`, `src/app/page.tsx`, `src/app/api/auth/login/route.ts`, Docker Desktop / local Node startup.
- Initial read: The startup path mixed Docker infra, host Node processes, standalone Next.js output, local HTTP cookies, and stale browser tabs without a single verifier.
- Next check: Resolved by documenting `docs/local-startup-runbook.md`, adding `scripts/verify-local-prod.ps1`, fixing local cookie/session behavior, adding server-side form-login fallback, and requiring startup verification before feature work.

## 2026-06-23 - Next startup stalls at Starting after feature changes

- Status: archived
- Trigger: User asked why the canvas sometimes opens and sometimes cannot open after repeated local startup attempts.
- Symptom: `next build` and `next dev` start Next.js 14.2.20, print environment lines and `Starting...`, then do not reach Ready or emit an actionable error before timeout.
- Context: local Windows host, `npm run build`, `npx next build --debug`, `npm run dev -- --hostname 0.0.0.0 --port 3000`, Node 24.11.1 and a project-local Node 20.20.2 attempt.
- Initial read: This is a separate startup/runtime blockage from the earlier cookie/static/login issue; code type checks and unit tests pass, but a fresh Next build/dev server is not becoming ready, so the known-good standalone app cannot be regenerated.
- Next check: Capture a deeper Next trace or isolate whether a page/module import blocks Next initialization before declaring the local app healthy.

## 2026-06-23 - Docker Compose build fails from non-ASCII BuildKit session header

- Status: archived
- Trigger: Restart through `scripts/start-docker.ps1` failed before creating `ai-canvas-app-1`.
- Symptom: Docker reports `header key "x-docker-expose-session-sharedkey" contains value with non-printable ASCII characters`.
- Context: Windows project path contains Chinese characters: `E:\project\画布网页`; Docker Compose attempted Bake/BuildKit build before app container creation.
- Initial read: Docker BuildKit/Bake session metadata appears to mishandle non-ASCII path/session values, so this is below the app layer.
- Next check: Resolved by syncing Docker build context to `C:\Users\27915\.cache\ai-canvas-docker-context` before running Compose.

## 2026-06-23 - Docker image build fails on missing public directory and OpenSSL

- Status: archived
- Trigger: Docker build progressed after ASCII build-context sync but failed in the runner stage.
- Symptom: Dockerfile `COPY --from=builder /app/public ./public` failed because `/app/public` did not exist; Prisma also warned and errored around missing OpenSSL libraries in Alpine.
- Context: `Dockerfile`, Next standalone build, Prisma client on `node:20-alpine`.
- Initial read: The Dockerfile assumed an optional Next `public` directory was always present and did not install OpenSSL before Prisma generation/runtime.
- Next check: Resolved by adding OpenSSL in the Docker base stage, removing the hard public copy assumption, and verifying Docker app health.

## 2026-06-23 - Reference image edges do not affect image or video generation

- Status: archived
- Trigger: User reported that connecting a previous image as reference does not influence the next image/video generation.
- Symptom: Canvas shows a reference connection, but downstream Seedream/Seedance output ignores the upstream image.
- Context: `src/lib/canvas.ts`, `src/app/canvas/page.tsx`, `src/worker.ts`, `src/lib/providers/volcengine.ts`.
- Initial read: The canvas passes `referenceAssetId`, but the worker/provider sends a local relative `/api/assets/...` URL or ignores reference images entirely; external Volcengine APIs need an accessible URL or base64 data URL.
- Next check: Resolved by converting referenced local image assets to data URLs in the worker and passing them as Seedream `image` / Seedance `image_url` inputs.

## 2026-06-23 - Seedance succeeded task timed out because video URL was not parsed

- Status: pending
- Trigger: User reported `火山引擎 Seedance 任务超时：succeeded`.
- Symptom: Worker saw the Seedance task status become `succeeded`, but the adapter kept polling until timeout because it did not find a video URL in the response shape.
- Context: `src/lib/providers/volcengine.ts`, Seedance task status response parsing.
- Initial read: The result URL is likely nested under a field not covered by the current hand-written extractor.
- Next check: Resolved by adding recursive URL discovery and immediate succeeded-without-url diagnostics.
