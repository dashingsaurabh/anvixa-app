// Postgres-backed submissions store (Supabase or any Postgres works — this
// just needs a standard connection string). Replaces the old local-JSON-file
// version so submissions survive redeploys/restarts on hosts with ephemeral
// disks. Everything else in the app talks to this module through the five
// functions below, so this is the only file that needed to change.

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — see .env.example for how to point this at your Postgres/Supabase database.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ready = pool.query(`
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    ud JSONB NOT NULL,
    answers JSONB NOT NULL,
    sp JSONB NOT NULL,
    overall INTEGER NOT NULL,
    bm JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL
  )
`);
// Without this, a failed connection at startup becomes an unhandled promise
// rejection that crashes the whole process — the `await ready` calls below
// still see and throw the original rejection when they're actually used.
ready.catch(err => console.error('Failed to initialize submissions table', err));

function rowToRecord(r) {
  return {
    id: r.id,
    ud: r.ud,
    answers: r.answers,
    sp: r.sp,
    overall: r.overall,
    bm: r.bm,
    submittedAt: r.submitted_at.toISOString()
  };
}

async function addSubmission(record) {
  await ready;
  await pool.query(
    'INSERT INTO submissions (id, ud, answers, sp, overall, bm, submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      record.id,
      JSON.stringify(record.ud),
      JSON.stringify(record.answers),
      JSON.stringify(record.sp),
      record.overall,
      JSON.stringify(record.bm),
      record.submittedAt
    ]
  );
  return record;
}

async function listSubmissions() {
  await ready;
  const { rows } = await pool.query(
    'SELECT id, ud, overall, submitted_at FROM submissions ORDER BY submitted_at DESC'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.ud.name,
    co: r.ud.co,
    ind: r.ud.ind,
    rev: r.ud.rev,
    role: r.ud.role,
    overall: r.overall,
    submittedAt: r.submitted_at.toISOString()
  }));
}

async function getSubmission(id) {
  await ready;
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

async function clearAll() {
  await ready;
  await pool.query('DELETE FROM submissions');
}

async function removeSubmission(id) {
  await ready;
  await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
}

module.exports = { addSubmission, listSubmissions, getSubmission, clearAll, removeSubmission };
