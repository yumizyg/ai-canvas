# Aliyun Deployment

Target domain:

```text
https://www.yumiprogram.online/
```

The root URL serves the login page. After login, the app redirects users to
`/canvas`. If a logged-in user opens the root URL, the frontend also sends them
to `/canvas`.

## Server Prerequisites

Install Docker and Docker Compose Plugin on the Aliyun lightweight server.

Open security group ports:

```text
80/tcp
443/tcp
```

Point DNS records to the server public IP:

```text
www.yumiprogram.online  A  <server-ip>
yumiprogram.online      A  <server-ip>
```

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
```

Start:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 app
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 worker
```

Caddy will automatically request and renew HTTPS certificates for
`www.yumiprogram.online`.

## Update Later

Upload a new deploy zip, replace the app files, then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Persistent data stays in Docker volumes:

```text
postgres
assets
caddy_data
```

## Backup

Back up the Postgres and asset volumes before major changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U canvas canvas > canvas-backup.sql
docker run --rm -v app_assets:/assets -v "$PWD":/backup alpine tar czf /backup/assets-backup.tgz /assets
```
