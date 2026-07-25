# ANVIXA Launch — Handover to Claude Code

Paste this whole file as your first message to Claude Code (or point it at
this file) to get full context without re-explaining everything.

## What this project is

ANVIXA is a marketing maturity assessment tool for Twiraa Creatives —
a 50-question client-facing quiz plus a password-protected admin console
where the team reviews submissions and generates reports. It's a working
Node.js + Express app (not a static site) with its own database.

It needs to end up live at **www.twiraa.com/anvixa**, on top of Twiraa's
existing Netlify-hosted site (which must NOT be disrupted).

## What's already done and tested

- Full app built and working: `server/` (Express API, JWT auth, JSON-file
  database) + `public/index.html` (the entire frontend — client quiz +
  admin console). Tested end-to-end locally multiple times: real
  submissions, wrong/right password, session persistence, sample data
  seeding, CSV export, full report generation — all confirmed working.
- A dedicated Netlify site already exists for this:
  **name: `twiraa-anvixa`, site ID: `7827d624-b71b-498b-a23a-7c9a53d45666`**
  (created via the Netlify MCP connector, empty — no deploy yet).
  It's under the "Twiraa" team (slug `dashingsaurabh`) in the same Netlify
  account as the live twiraa.com site.
- The live main site is the Netlify project named `voluble-rolypoly-dfeb21`
  (primary URL `https://twiraa.com`) — do not modify its deploy settings
  without care; only a small redirect addition is needed there (Step 3
  below).
- `netlify.toml` is already written to publish `public/` and proxy
  `/api/*` to a backend URL — currently a placeholder
  (`YOUR-BACKEND-URL.onrender.com`) that needs updating once the backend
  is deployed.
- Full deploy documentation already written: see `README.md` (general
  setup + Render deployment steps) and `TWIRAA_INTEGRATION.md` (the
  twiraa.com/anvixa integration specifically, including header/footer
  snippets).

## Why this wasn't finished from chat

Netlify hosts static sites; this app's backend needs an always-on Node
process with real disk access, which Netlify can't run directly. Chat's
sandboxed environment also couldn't reach Netlify's upload endpoint to
push files. Both are non-issues for Claude Code, which has real network
and terminal access — this is exactly the kind of job it's suited for.

## The remaining work, in order

1. **Deploy the backend.** `server/` needs to run somewhere that keeps a
   process alive and has persistent disk — Render is the default
   recommendation in `README.md` (steps included there: push to GitHub,
   connect on Render, set `JWT_SECRET` and `ADMIN_PASSWORD_HASH` env vars,
   attach a persistent disk so `data/db.json` survives redeploys). Railway
   or Fly.io work too if preferred.
   - Generate `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Generate `ADMIN_PASSWORD_HASH`: `npm run hash-password -- "<a real password, not the test one>"`
   - **Change the admin password** from the test value (`TWIRAA2026`) used during local testing — don't ship that.

2. **Update `netlify.toml`** with the real backend URL from Step 1, replacing
   `YOUR-BACKEND-URL.onrender.com`.

3. **Deploy the frontend to the `twiraa-anvixa` Netlify site.** From inside
   this project's root directory:
   ```
   npx -y @netlify/mcp@latest --site-id 7827d624-b71b-498b-a23a-7c9a53d45666
   ```
   (If that proxy token has expired since this was written, use the
   Netlify MCP connector or `netlify link --id 7827d624-b71b-498b-a23a-7c9a53d45666`
   with the Netlify CLI to re-establish the link, then `netlify deploy --prod`.)
   Verify `twiraa-anvixa.netlify.app` actually works — full assessment,
   admin login, sample data, both downloads — before touching the main site.

4. **Add the redirect on the main twiraa.com site** (`voluble-rolypoly-dfeb21`)
   so `/anvixa/*` proxies to the URL from Step 3. Exact syntax and the
   header/footer nav snippets to add are in `TWIRAA_INTEGRATION.md`.
   This requires access to whatever repo/deploy controls that site.

5. **Final check**: visit `www.twiraa.com/anvixa` in a private window,
   run through a full assessment, confirm admin console works, confirm
   nav links from other pages on the site reach it correctly.

## Constraints worth respecting

- Don't touch the live main site's existing deploy/build settings beyond
  the one redirect addition.
- Don't launch collecting real client data on a host without persistent
  storage confirmed working (this is called out prominently in `README.md`
  for a reason — free-tier ephemeral disks will silently delete
  submissions on redeploy).
- The admin passcode currently baked into local `.env` (`TWIRAA2026`) is a
  test value — must be changed before this is exposed to real users.
