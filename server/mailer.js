// Sends an email notification every time a client completes an assessment —
// the backup channel, independent of whatever happens to data/db.json (see
// README's note on ephemeral disks). Uses Web3Forms (https://web3forms.com)
// rather than SendGrid: it doesn't require sending "as" your domain, so
// there's no SPF/DKIM/DMARC setup needed — it just delivers to whatever
// inbox is already configured against your Web3Forms access key.
//
// If WEB3FORMS_ACCESS_KEY isn't set, this module no-ops with a warning so
// local dev doesn't require a key.

const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY;
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

function getBand(overall) {
  if (overall < 30) return 'Critical — Act Now';
  if (overall < 45) return 'Fragile';
  if (overall < 65) return 'Developing';
  return 'Mature';
}

function buildMessage(record) {
  const { ud, sp, overall, bm, submittedAt } = record;
  const gap = overall - bm.overall;
  const dims = Object.keys(sp);
  const dimLines = dims.map(sec => {
    const benchVal = bm[sec];
    const g = benchVal != null ? sp[sec] - benchVal : null;
    return '- ' + sec + ': ' + sp[sec] + '% (benchmark ' + (benchVal != null ? benchVal + '%' : '—') +
      ', gap ' + (g != null ? (g >= 0 ? '+' : '') + g : '—') + ')';
  }).join('\n');
  const weakest = dims.slice().sort((a, b) => (sp[a] - (bm[a] ?? 0)) - (sp[b] - (bm[b] ?? 0)))[0];

  return [
    'New ANVIXA assessment submitted.',
    '',
    'Name: ' + ud.name,
    'Email: ' + (ud.email || '—'),
    'Company: ' + ud.co,
    'Role: ' + (ud.role || '—'),
    'Industry: ' + ud.ind,
    'Revenue: ' + ud.rev,
    'Team size: ' + (ud.team || '—'),
    '',
    'Overall score: ' + overall + '% (' + getBand(overall) + ')',
    'Stage-adjusted benchmark: ' + bm.overall + '%',
    'Gap: ' + (gap >= 0 ? '+' : '') + gap + ' points ' + (gap >= 0 ? 'ahead of' : 'behind') + ' benchmark',
    'Weakest dimension: ' + weakest + ' (' + sp[weakest] + '%)',
    '',
    'Dimension scorecard:',
    dimLines,
    '',
    'Submitted: ' + new Date(submittedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }),
    'Submission ID: ' + record.id,
    '',
    'Full raw data (for backup/recovery — paste into a .json file if needed):',
    JSON.stringify(record)
  ].join('\n');
}

async function sendSubmissionNotification(record) {
  if (!WEB3FORMS_ACCESS_KEY) {
    console.warn('WEB3FORMS_ACCESS_KEY not set — skipping submission email notification.');
    return;
  }
  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: 'ANVIXA: New submission — ' + record.ud.co + ' (' + record.overall + '%)',
      from_name: 'ANVIXA',
      message: buildMessage(record)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error('Web3Forms send failed: ' + (data.message || res.status));
  }
}

module.exports = { sendSubmissionNotification };
