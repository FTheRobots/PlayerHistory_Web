# Player History Web Client

Remote admin SPA for the DayZ Player History system. Connects to **PlayerHistory_Server** on the game box over HTTPS with JWT authentication.

The DayZ mod (**PlayerHistory**) and API server (**PlayerHistory_Server**) are sibling projects. Keep them next to this folder if you use `npm run sync-version` from the server.

## Architecture

```
DayZ Server (game box)              Admin PC / anywhere
├── PlayerHistory mod               └── PlayerHistory_Web client
└── PlayerHistory_Server                browser or portable .exe
    0.0.0.0:3847 (or HTTPS proxy)  →  enter server URL on login
    reads profiles/, auth, WS
```

The **server** runs on the game machine. **Clients** connect remotely — via port forward (`http://your-ip:3847`) or reverse proxy (`https://dayz.example.com`). No client-side port forwarding is required.

## Quick start (local dev)

1. Start the server from **PlayerHistory_Server**: `start-server.bat`
2. Start the client: **`start-client.bat`** (or `cd web && npm run dev`)
3. Open **http://localhost:5173**
4. Enter server URL on the login screen — e.g. `http://203.0.113.10:3847` (remote) or `http://localhost:3847` (local). If no URL is saved, Vite dev proxies `/api` to `http://127.0.0.1:3847`.
5. First run: create the **owner** account when prompted

## Remote production client

Build with your server URL baked in:

```powershell
cd web
$env:VITE_API_BASE_URL="https://your-server:3847/api"
npm run build
```

Serve `web/dist/` from any static host (nginx, Caddy, S3, or open the built files locally).

Alternatively, skip `VITE_API_BASE_URL` and enter the server URL on the login screen — it is saved in `localStorage`.

## Configuration

`web/.env` (copy from `.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Production API base, e.g. `https://dayz.example.com/api` |
| `VITE_MAP_*` | Optional map tile/image overrides (server usually provides tiles) |

Dev mode proxies `/api` and WebSocket to `http://127.0.0.1:3847` when no saved server URL is set.

## Auth

Sign in with a user created on the server. Roles: **owner**, **admin**, **moderator**, **viewer**, with optional per-user permission overrides.

Owners manage users under **Admin** in the nav bar.

## Map replay

The **Map replay** tab uses tiles from [dayz.xam.nu](https://dayz.xam.nu/) by default (reported by the server).

## Scripts

| Script | Purpose |
|--------|---------|
| `start-client.bat` | Dev client with hot reload (port 5173) |
| `start-web.bat` | Build + local preview of production bundle |
| `build-desktop.bat` | Build portable Windows admin `.exe` |

See the **PlayerHistory_Server** README for server deployment, TLS, CORS, and JWT setup.

## Portable desktop client (Windows)

Package the admin UI as a single portable `.exe` (no installer). It still connects to **PlayerHistory_Server** over the network — enter your server URL on the login screen.

```powershell
# From this repo root
.\build-desktop.bat
```

Output: `desktop\release\PlayerHistory-Admin.{version}-{Codename}.exe` (e.g. `PlayerHistory-Admin.2.1.0-NimbleJackal.exe`; version and codename from `PlayerHistory_Server/VERSION`).

Dev mode (Electron window, uses `web/dist`):

```powershell
cd web && npm run build
cd ..\desktop && npm install && npm start
```

To bake in a default server URL at build time, set `VITE_API_BASE_URL` before running `build-desktop.bat` (same as the web build).

Do not commit `web/.env`, `web/dist/`, `desktop/release/`, or `node_modules/` — they are gitignored.

## License

MIT. See [LICENSE](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release notes.
