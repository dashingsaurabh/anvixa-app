// Minimal, dependency-free JSON file "database" for submissions.
// Good enough for an internal assessment tool at modest volume.
// A single in-process write queue avoids concurrent writes corrupting the file.
// For higher scale or multi-instance hosting, swap this module for Postgres —
// everything else in the app talks to this module through the functions
// below, so that's the only file that would need to change.

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ submissions: [] }, null, 2));
  }
}
ensureDb();

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('DB file was corrupt, resetting.', e);
    const fresh = { submissions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

// Serialize writes so two near-simultaneous submissions can't clobber each other.
let writeChain = Promise.resolve();
function writeDb(data) {
  writeChain = writeChain.then(() => {
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, DB_PATH);
  });
  return writeChain;
}

async function addSubmission(record) {
  const data = readDb();
  data.submissions.push(record);
  await writeDb(data);
  return record;
}

function listSubmissions() {
  const data = readDb();
  return data.submissions
    .map(r => ({
      id: r.id, name: r.ud.name, co: r.ud.co, ind: r.ud.ind, rev: r.ud.rev,
      role: r.ud.role, overall: r.overall, submittedAt: r.submittedAt
    }))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

function getSubmission(id) {
  const data = readDb();
  return data.submissions.find(r => r.id === id) || null;
}

async function clearAll() {
  await writeDb({ submissions: [] });
}

async function removeSubmission(id) {
  const data = readDb();
  data.submissions = data.submissions.filter(r => r.id !== id);
  await writeDb(data);
}

module.exports = { addSubmission, listSubmissions, getSubmission, clearAll, removeSubmission, DB_PATH };
