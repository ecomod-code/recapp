# Installing Recapp

This guide describes how to self-host Recapp on a single server using its
Docker Compose stack with **Caddy** as the reverse proxy. Caddy terminates TLS
(automatic Let's Encrypt certificates), serves the frontend, and routes
`/api` and WebSocket traffic to the backend over an internal Docker network —
so only Caddy is exposed to the public internet.

This guide covers a production/staging deployment on a server. Running the
packages locally for development (hot-reload, no Docker for the app code) is a
separate workflow and is not covered here.

## Overview

A deployment consists of three containers, orchestrated by `deployment.sh`:

| Container | Role |
|---|---|
| `caddy` | Reverse proxy, TLS termination, static frontend serving |
| `backend` | Node.js API + WebSocket server |
| `recapp-db` | MongoDB, data persisted on a host bind mount |

`deployment.sh` pulls the chosen branch, runs `npm ci`, builds the images, and
starts the stack. Only ports `80` and `443` are published on the host.

## 1. Prerequisites

- A server (physical or virtual) reachable from the internet on ports `80`/`443`,
  running a recent Linux. Tested on Ubuntu 24.04 / 26.04 LTS.
- A **domain name** you control, with a DNS `A` (and optionally `AAAA`) record
  pointing at the server's public IP. Set this up **before** deploying — Caddy
  needs the domain to resolve to the server to obtain a Let's Encrypt
  certificate.
- An **OpenID Connect (OIDC) provider** (e.g. Keycloak, Authentik, or your
  institution's SSO) for teacher/student login. Anonymous guest participation
  works without it, but at least one OIDC client is required for authenticated
  accounts.

### Install the software prerequisites

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm docker.io docker-compose-v2
```

- **Node.js 20+** is required — `deployment.sh` runs `npm ci` on the host.
  Check with `node -v`; if your distribution ships an older version, install
  Node 20 via [NodeSource](https://github.com/nodesource/distributions) or nvm.
- **`docker-compose-v2`** provides the `docker compose` subcommand. The
  `docker.io` package alone does **not** include it, and `deployment.sh` will
  fail with `unknown command: docker compose` without it.
- The deploying user needs **passwordless `sudo` for Docker**. `deployment.sh`
  runs every Docker command as `sudo docker …` and aborts at the start if
  passwordless `sudo` is unavailable. It does *not* assume rootless Docker or
  `docker`-group membership; `npm ci` is the only step that runs unprivileged.

### Firewall

Expose only what you need:

- `22/tcp` — SSH (administration)
- `80/tcp`, `443/tcp` — Caddy (HTTP challenge + HTTPS)

The backend, frontend, and database publish **no** host ports; they are only
reachable over the internal Docker network.

## 2. Clone the repository

`deployment.sh` expects the repository at `$HOME/recapp`:

```bash
git clone https://github.com/ecomod-code/recapp.git "$HOME/recapp"
cd "$HOME/recapp"
```

## 3. Configure the environment

Copy the template and fill in real values:

```bash
cp .env.template .env.production
```

Edit `.env.production`. The values that **must** change from the template:

| Variable | Set to | Notes |
|---|---|---|
| `DOMAIN` | your public hostname | Must match the DNS record from step 1 |
| `FRONTEND_URI` | `https://<DOMAIN>` | No path suffix |
| `BACKEND_URI` | `https://<DOMAIN>/api` | **Must** include `/api` — Caddy strips the prefix before forwarding |
| `OPENID_PROVIDER` | your OIDC provider base URL | |
| `OID_CLIENT_ID` / `OID_CLIENT_SECRET` | OIDC client credentials | |
| `ISSUER` | OIDC issuer path segment | Appended to `OPENID_PROVIDER` |
| `REDIRECT_URI` | `/auth/callback` | OIDC callback path, appended to `BACKEND_URI` |
| `REQUIRES_OFFLINE_SCOPE` | `false` (usually) | Set `true` only if your provider needs the `offline_access` scope to issue refresh tokens. Some providers (e.g. certain Keycloak setups) reject it — leave `false` there. |
| `API_KEYS` | comma-separated UUIDs | Shared secrets for internal actor authentication; generate fresh ones |
| `MONGODB_USER` / `MONGODB_PW` | database credentials | |
| `JWT_SECRET` | a long random string | Signs temporary (guest) account tokens |

> **Do not leave `BACKEND_URI` / `FRONTEND_URI` at the `localhost` template
> defaults.** `BACKEND_URI` is baked into the frontend bundle at build time (it
> is used for the login link and the WebSocket URL) *and* used to build the OIDC
> redirect. A `localhost` value produces a broken login link and a dead auth
> flow.

### Register the OIDC callback

In your OIDC provider, add the callback as an allowed redirect URI for the
client:

```
<BACKEND_URI>/auth/callback      e.g. https://<DOMAIN>/api/auth/callback
```

If this is missing, login fails at the callback step rather than at the login
link.

## 4. Deploy

```bash
bash deployment.sh <branch>
```

Use the branch you want to deploy (e.g. `main`). The script fetches the branch,
does a clean install, builds the images, starts the stack, and health-checks the
backend. **The first run takes longer than usual** while Caddy obtains its
Let's Encrypt certificate.

A few things the script assumes, worth knowing before you run it:

- It reads **`.env.production`** specifically — the filename is fixed, not
  configurable.
- With **no argument** it deploys the `production` branch; always pass the
  branch you mean.
- It runs `git reset --hard origin/<branch>` in `$HOME/recapp`, so **any
  uncommitted local changes in that directory are discarded**. Your
  `.env.production` is safe — it is gitignored and untracked — but don't keep
  other local edits there.

## 5. Verify

```bash
sudo docker compose --env-file .env.production \
  -f docker/docker-compose.yaml -f docker/docker-compose.prod.yaml ps
```

- All services should be `running` / healthy.
- `https://<DOMAIN>` loads the frontend.
- `https://<DOMAIN>/api/ping` returns HTTP 200.

## Updating

To deploy a newer version, just re-run the script — it resets the working tree
to the exact remote state of the branch, rebuilds, and recreates the containers:

```bash
bash deployment.sh <branch>
```

## Backups

Two host directories hold all persistent state and should be included in backups:

- `docker/mongo/data/db` — the MongoDB data.
- `docker/caddy/` — Caddy's ACME account and issued certificates.

> **Do not delete `docker/caddy/`.** Wiping it forces certificate re-issuance,
> which Let's Encrypt rate-limits. Both directories are bind-mounted and
> gitignored.

## Appendix: migrating data from an existing instance

Because MongoDB data lives on a host bind mount, a physical copy is the simplest
faithful migration (it carries users, indexes, and everything else). Compose
commands are abbreviated below as `docker compose …` — use the same
`--env-file`/`-f` flags shown in step 5.

**Physical copy (full move):**

```bash
# SOURCE — stop the DB for a consistent snapshot, then archive the data dir
sudo docker compose … stop recapp-db
sudo tar czf recapp-db.tar.gz -C docker/mongo/data db
scp recapp-db.tar.gz <new-server>:~/

# NEW — after at least one deploy has created the stack, stop, swap, restart
sudo docker compose … stop
sudo rm -rf docker/mongo/data/db
sudo tar xzf ~/recapp-db.tar.gz -C docker/mongo/data
sudo docker compose … up -d
```

**Logical dump** — use if the MongoDB versions differ or for a selective copy:

```bash
# SOURCE
sudo docker compose … exec -T recapp-db mongodump --archive --gzip > recapp.archive.gz
# NEW
cat recapp.archive.gz | sudo docker compose … exec -T recapp-db mongorestore --archive --gzip --drop
```

## Appendix: Docker MTU on overlay networks

On some cloud platforms the VM sits on a VXLAN/overlay network with a reduced
MTU (commonly **1450**). Docker's default bridge uses 1500, so network calls
made *during an image build* (e.g. `apt-get`) can silently time out even though
image pulls succeed. If builds hang on network operations, set the daemon
default:

```json
// /etc/docker/daemon.json
{ "mtu": 1450 }
```

```bash
sudo systemctl restart docker
```

If your network has a normal MTU (most bare-metal and many cloud setups), you do
not need this.
