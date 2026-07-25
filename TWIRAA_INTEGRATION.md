# Showcasing ANVIXA on www.twiraa.com

Recommended setup: keep ANVIXA as its own small deploy (its own Netlify
site + its own backend), and make it *appear* to live at
`www.twiraa.com/anvixa` with one redirect rule on your main site. This way
you never have to merge codebases, and you can update/redeploy ANVIXA
independently of the main marketing site.

```
Browser
  │
  ├─ www.twiraa.com/...          → your existing Netlify site (unchanged)
  │
  └─ www.twiraa.com/anvixa/*     → proxied by ONE redirect rule to →
                                     the ANVIXA Netlify site
                                       │
                                       └─ /api/* on THAT site is proxied to →
                                            your ANVIXA backend on Render
```

Nothing about your main site's code changes except one line in its
redirects config, plus whatever you add to the header/footer nav.

## Step 1 — Deploy the ANVIXA backend (the Node app)

Follow `README.md` in this same folder — push to GitHub, deploy on Render
(or Railway/Fly), set `JWT_SECRET` and `ADMIN_PASSWORD_HASH`, and **attach
persistent storage** (see that README's "going to production" section —
this is the step that's easy to skip and expensive to skip).

You'll end up with a URL like `https://anvixa-api.onrender.com`.

## Step 2 — Deploy the ANVIXA frontend as its own Netlify site

1. In `netlify.toml` (in this folder), replace `YOUR-BACKEND-URL` with the
   real Render URL from Step 1.
2. Deploy the `public/` folder to a new Netlify site — either drag-and-drop
   `public/` onto Netlify's dashboard, or connect this repo and set the
   publish directory to `public`.
3. You'll get a Netlify URL like `https://anvixa-twiraa.netlify.app`.
   Visit it and confirm the assessment loads and admin sign-in works —
   that confirms the backend connection (via the `/api/*` proxy) is wired
   correctly before you touch your main site at all.

## Step 3 — Point www.twiraa.com/anvixa at it

In your **main** twiraa.com Netlify site, add this to its `netlify.toml`
(or `_redirects` file):

```
[[redirects]]
  from = "/anvixa/*"
  to = "https://anvixa-twiraa.netlify.app/:splat"
  status = 200
  force = true
```

(Use the real Netlify URL from Step 2.) Redeploy the main site.
`www.twiraa.com/anvixa` now serves the ANVIXA app, still on your domain,
still with your SSL cert — visitors never see the netlify.app URL.

## Step 4 — Add it to your header and footer

Drop-in snippets below, styled to the palette and type you're already
using (Cormorant Garamond / DM Sans, slate-teal-gold). Adjust classes to
match your existing nav markup if you'd rather it inherit your site's own
styles — these are self-contained so they'll look right even pasted as-is.

**Header nav link** — add alongside your existing nav items:

```html
<a href="/anvixa" class="anvixa-nav-link">
  ANVIXA <span class="anvixa-nav-badge">New</span>
</a>

<style>
.anvixa-nav-link{
  font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
  color:#1f3d33; text-decoration:none; display:inline-flex;
  align-items:center; gap:6px;
}
.anvixa-nav-link:hover{ color:#2f9b86; }
.anvixa-nav-badge{
  font-size:9px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
  background:#e6f4ef; color:#2f9b86; padding:2px 6px; border-radius:10px;
}
</style>
```

**Footer product block** — a small card if you don't have a "Products"
section yet; drop this wherever your footer lists services/links:

```html
<div class="anvixa-footer-card">
  <div class="anvixa-footer-eyebrow">FROM TWIRAA CREATIVES</div>
  <a href="/anvixa" class="anvixa-footer-title">ANVIXA →</a>
  <p class="anvixa-footer-desc">
    A free marketing maturity assessment — see where your marketing stands
    against your industry benchmark in 15 minutes.
  </p>
</div>

<style>
.anvixa-footer-card{
  font-family:'DM Sans',sans-serif; max-width:280px;
}
.anvixa-footer-eyebrow{
  font-size:10px; letter-spacing:.14em; color:#8fd3c2; font-weight:700;
  margin-bottom:6px;
}
.anvixa-footer-title{
  font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:600;
  color:#f4f2ec; text-decoration:none; display:block; margin-bottom:6px;
}
.anvixa-footer-title:hover{ color:#8fd3c2; }
.anvixa-footer-desc{
  font-size:12.5px; color:rgba(244,242,236,.65); line-height:1.6; margin:0;
}
</style>
```

(The footer snippet assumes a dark footer background, matching ANVIXA's
own ink/gold palette — flip the colors if your footer is light.)

## Step 5 — Sanity checks before calling it live

- Visit `www.twiraa.com/anvixa` fresh (private/incognito window) and
  complete a real assessment end-to-end.
- Sign into `/anvixa` admin, confirm sample data loads, download both
  files, sign out.
- Click the header link and footer link from a few other pages on the
  main site to confirm they route correctly.
- Change the admin password from the test one (`npm run hash-password`)
  if you haven't already.
- Re-read the "going to production" section of `README.md` — persistent
  storage is the one thing that will quietly break this if skipped.
