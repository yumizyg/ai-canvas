# Aliyun Subpage Deployment

Goal:

```text
Keep the resume website at https://www.yumiprogram.online/
Expose AI Canvas at https://www.yumiprogram.online/ai-canvas
```

Your resume website only needs a button or link to:

```html
<a href="/ai-canvas">企业 AI 画布</a>
```

The AI Canvas app is built with `NEXT_PUBLIC_BASE_PATH=/ai-canvas`, so its
frontend assets and APIs live under the same subpath and will not take over the
root resume website.

## Server Prerequisites

Install Docker and Docker Compose Plugin on the Aliyun lightweight server.

The existing resume website should continue to own ports `80` and `443`.
This AI Canvas package only binds the app to local port `127.0.0.1:3000`.

## Package Locally

From the project root:

```powershell
.\scripts\package-deploy.ps1
```

Upload:

```text
dist/ai-canvas-deploy.zip
```

to the server, for example `/opt/ai-canvas`.

## First Server Start

On the server:

```bash
cd /opt/ai-canvas
unzip ai-canvas-deploy.zip -d app
cd app
cp .env.production.example .env.production
nano .env.production
```

Set at least:

```text
POSTGRES_PASSWORD=...
JWT_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
NEXT_PUBLIC_BASE_PATH=/ai-canvas
COOKIE_SECURE=true
```

Start the AI Canvas internal service:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 app
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 worker
curl -I http://127.0.0.1:3000/ai-canvas
```

## Add Reverse Proxy To Existing Resume Site

If the resume site uses Caddy, add this inside the existing
`www.yumiprogram.online` site block:

```caddy
handle /ai-canvas* {
  reverse_proxy 127.0.0.1:3000
}
```

If the resume site uses Nginx, add this inside the existing
`server { ... }` block:

```nginx
location /ai-canvas/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location = /ai-canvas {
  return 301 /ai-canvas/;
}
```

Example final user-facing URL:

```text
https://www.yumiprogram.online/ai-canvas
```

After login, users enter:

```text
https://www.yumiprogram.online/ai-canvas/canvas
```

## Update Later

Upload a new deploy zip, replace the app files, then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Persistent data stays in Docker volumes:

```text
postgres
assets
```

## Backup

Back up the Postgres and asset volumes before major changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U canvas canvas > canvas-backup.sql
docker run --rm -v app_assets:/assets -v "$PWD":/backup alpine tar czf /backup/assets-backup.tgz /assets
```
