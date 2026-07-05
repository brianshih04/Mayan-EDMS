# Cloudflare tunnel configuration

The portal and the Mayan backend are exposed through a single Cloudflare
**named tunnel** (`mayan-emds`). This file documents the sanitized, safe-to-commit
parts of that setup. **Credentials are never stored in this repo.**

## Hostname → service mapping

| Hostname | Service |
|---|---|
| `mayan-emds.avision-gb10.org` | `http://localhost:8080` (Mayan app container) |
| `mayan-portal.avision-gb10.org` | `http://localhost:5174` (Avision portal preview/dev) |

Everything else returns `404`.

## Tunnel identity (NOT in repo)

- Tunnel ID: `30d74dba-9789-4cf3-805e-50e4573d6374`
- Credentials JSON: `C:\Users\<user>\.cloudflared\30d74dba-9789-4cf3-805e-50e4573d6374.json`
- Full config file (with `credentials-file`): `E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml`

The credentials file lives under the user profile, outside this repo, and must
not be copied into git.

## Equivalent sanitized config

This is the shape of `E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml`:

```yaml
tunnel: 30d74dba-9789-4cf3-805e-50e4573d6374
credentials-file: <USER_PROFILE>\.cloudflared\30d74dba-9789-4cf3-805e-50e4573d6374.json

ingress:
  - hostname: mayan-emds.avision-gb10.org
    service: http://localhost:8080
  - hostname: mayan-portal.avision-gb10.org
    service: http://localhost:5174
  - service: http_status:404
```

## Operating the tunnel

Create the DNS route once (already done):

```powershell
cloudflared tunnel route dns mayan-emds mayan-portal.avision-gb10.org
```

Run the tunnel (start-system.ps1 does this for you):

```powershell
cloudflared tunnel --config E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml `
    --logfile E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.log run
```

If you edit the config file, restart the `cloudflared` process for it to apply.
Vite must allow the `mayan-portal.avision-gb10.org` host (already in
`vite.config.js` `allowedHosts`) or the tunnel returns an error page.
