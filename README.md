# ANVIXA — Marketing Maturity Assessment + Admin Console

A real, deployable version of the ANVIXA tool: the client-facing 50-question
assessment on one side, and a password-protected admin console on the other
where your team can see every submission, drill into a client's exact
answers, and generate the full personalised report.

This is a small Node.js server (Express) backed by Postgres, serving one
frontend page.

## What's real here

- **Real database.** Every submission is written to a Postgres database
  (Supabase's free tier works well) via `DATABASE_URL`. Unlike a local disk,
  this survives redeploys and restarts on hosts like Render whose local
  filesystem is ephemeral.
- **Real authentication.** The admin passcode is never stored in the page's
  source — it's hashed with bcrypt on the server, checked server-side, and a
  signed session token (JWT, 12-hour expiry) is issued on success. Viewing
  the page source reveals nothing.
- **Real API.** The frontend talks to the backend over HTTP (`/api/...`),
  the same way any production web app does. This means you can host the
  frontend and backend together (simplest — see below) or split them later
  without rewriting anything.

## Running it locally

```bash
npm install
npm run hash-password -- "choose-a-real-password"
# copy the printed ADMIN_PASSWORD_HASH line into a new .env file
```

Create `.env` (copy `.env.example`) and fill in:

```
JWT_SECRET=<any long random string>
ADMIN_PASSWORD_HASH=<the hash printed above>
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:

```bash
npm start
```

Open `http://localhost:3000`. The client assessment is the homepage; click
"Twiraa team — Admin sign-in" at the bottom of that screen to reach the
console, and sign in with the real password you set above (not the old demo
passcode — that no longer exists anywhere in the code).

The first time the admin console loads with zero submissions, it
auto-loads 5 sample clients so you have something to click through. There's
also a manual "+ Load Sample Clients" button, and a "Clear All" button to
reset to a genuinely empty state for a real launch.

## Deploying it

This is a standard Node app, so it runs on almost any host that runs
Node — Render, Railway, Fly.io, a plain VPS, etc. Render is the simplest
if you haven't deployed a Node app before:

**Showcasing this on an existing site (e.g. `www.twiraa.com/anvixa`) on
Netlify?** See `TWIRAA_INTEGRATION.md` in this folder for the full
step-by-step — Netlify hosts static sites, and this app's backend needs an
always-on Node process, so the two get deployed separately and stitched
together with one redirect rule. That file walks through exactly that.

1. Push this folder to a GitHub repo.
2. On [Render](https://render.com), create a new **Web Service** from that repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add the environment variables from your `.env` (`JWT_SECRET`,
   `ADMIN_PASSWORD_HASH`, `DATABASE_URL`) in Render's dashboard — never
   commit `.env` itself.
5. Deploy. Render gives you a URL immediately; point your own domain at it
   later from Render's "Custom Domains" tab once you're ready.

### Database

Submissions are stored in Postgres via `DATABASE_URL` — [Supabase](https://supabase.com)'s
free tier is the simplest option. Create a project there, copy the
connection string from Settings > Database > Connection string (URI), and
set it as `DATABASE_URL`. Unlike a local disk, this isn't wiped on
redeploys or restarts, so it's safe to use for real client data.

## Project layout

```
anvixa-app/
  server/
    index.js        — Express app + all API routes
    db.js            — the database (JSON file, swap for Postgres later)
    auth.js          — password check + JWT session handling
    hash-password.js — CLI helper to generate ADMIN_PASSWORD_HASH
  public/
    index.html        — the entire frontend (client assessment + admin console)
  data/
    db.json           — created automatically on first run (gitignored)
  netlify.toml         — Netlify config for deploying public/ as its own site
  TWIRAA_INTEGRATION.md — step-by-step for showcasing this at twiraa.com/anvixa
  .env.example
  package.json
```

## API reference

| Method | Path                    | Auth  | Purpose                                  |
|--------|--------------------------|-------|-------------------------------------------|
| GET    | `/api/health`            | none  | Health check                              |
| POST   | `/api/submissions`       | none  | Client submits a completed assessment     |
| POST   | `/api/admin/login`       | none  | `{password}` → `{token}`                  |
| GET    | `/api/submissions`       | admin | List all submissions (summary)            |
| GET    | `/api/submissions/:id`   | admin | Full record for one client                |
| DELETE | `/api/submissions/:id`   | admin | Remove one submission                     |
| DELETE | `/api/submissions`       | admin | Remove all submissions                    |

Admin routes require `Authorization: Bearer <token>` from `/api/admin/login`.

## What's still on you before a real public launch

- **Persistent storage** on your chosen host (above) — the most important one.
- **HTTPS** — any real host (Render, Railway, etc.) gives you this
  automatically; just don't run it over plain HTTP for real client data.
- **A real domain** pointed at the host, if you want `app.twiraa.com` or similar.
- **Rate limiting / abuse protection** on `POST /api/submissions` if you're
  worried about spam submissions once this is public — a package like
  `express-rate-limit` is a five-minute addition when you're ready.
- **Backups** of `data/db.json` (or your Postgres database once you migrate)
  — this is your client data.
- **Changing the admin password** from whatever you test with locally to
  something real before real clients start submitting.
