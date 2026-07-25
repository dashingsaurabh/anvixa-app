// Usage: npm run hash-password -- "YourRealPassword"
// Prints a bcrypt hash to paste into .env as ADMIN_PASSWORD_HASH.
const bcrypt = require('bcryptjs');

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: npm run hash-password -- "YourRealPassword"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 10);
console.log('\nAdd this line to your .env file:\n');
console.log('ADMIN_PASSWORD_HASH=' + hash);
console.log('');
