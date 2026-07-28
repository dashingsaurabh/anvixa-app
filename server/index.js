require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const mailer = require('./mailer');
const { checkPassword, issueToken, requireAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// In production, set ALLOWED_ORIGIN to your real frontend origin
// (e.g. https://www.twiraa.com) to restrict which sites can call this API.
// Left permissive by default so local dev and quick testing just work.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '2mb' })); // assessment payloads are small, but leave headroom

// ─── Static frontend ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ─── Public: submit a completed assessment ─────────────────────────
// No auth — this is what the client-facing quiz calls when someone finishes.
app.post('/api/submissions', (req, res) => {
  const { ud, answers, sp, overall, bm } = req.body || {};
  if (!ud || !ud.name || !ud.co || !ud.ind || !ud.rev) {
    return res.status(400).json({ error: 'Missing required profile fields.' });
  }
  if (!Array.isArray(answers) || !sp || typeof overall !== 'number' || !bm) {
    return res.status(400).json({ error: 'Missing or malformed score data.' });
  }
  const providedDate = new Date(req.body && req.body.submittedAt);
  const submittedAt = !isNaN(providedDate) ? providedDate.toISOString() : new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    ud, answers, sp, overall, bm,
    submittedAt
  };
  db.addSubmission(record)
    .then(() => {
      res.status(201).json({ id: record.id });
      // Fire-and-forget: an email failure should never affect the saved submission or the response already sent.
      mailer.sendSubmissionNotification(record).catch(err => {
        console.error('Failed to send submission notification email', err);
      });
    })
    .catch(err => {
      console.error('Failed to save submission', err);
      res.status(500).json({ error: 'Could not save submission.' });
    });
});

// ─── Admin: login ───────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body || {};
  const ok = await checkPassword(password);
  if (!ok) return res.status(401).json({ error: 'Incorrect passcode.' });
  res.json({ token: issueToken() });
});

// ─── Admin: list / read / delete submissions (auth required) ───────
app.get('/api/submissions', requireAdmin, async (req, res) => {
  try {
    res.json(await db.listSubmissions());
  } catch (err) {
    console.error('Failed to list submissions', err);
    res.status(500).json({ error: 'Could not load submissions.' });
  }
});

app.get('/api/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const rec = await db.getSubmission(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found.' });
    res.json(rec);
  } catch (err) {
    console.error('Failed to load submission', err);
    res.status(500).json({ error: 'Could not load submission.' });
  }
});

app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
  try {
    await db.removeSubmission(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to remove submission', err);
    res.status(500).json({ error: 'Could not remove submission.' });
  }
});

app.delete('/api/submissions', requireAdmin, async (req, res) => {
  try {
    await db.clearAll();
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to clear submissions', err);
    res.status(500).json({ error: 'Could not clear submissions.' });
  }
});

// ─── Fallback: serve the SPA for any other GET ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ANVIXA server running on http://localhost:${PORT}`);
  console.log('Database: Postgres (DATABASE_URL)');
});
