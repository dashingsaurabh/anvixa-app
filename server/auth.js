const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const TOKEN_TTL = '12h';

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set real values before starting.');
  process.exit(1);
}
if (!ADMIN_PASSWORD_HASH) {
  console.error('FATAL: ADMIN_PASSWORD_HASH is not set. Run "npm run hash-password" to generate one, then put it in .env.');
  process.exit(1);
}

async function checkPassword(password) {
  if (typeof password !== 'string' || !password) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

function issueToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('wrong role');
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired admin session. Please sign in again.' });
  }
}

module.exports = { checkPassword, issueToken, requireAdmin };
