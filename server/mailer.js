// Sends an email notification (with the full raw submission attached as JSON)
// every time a client completes an assessment. This is the backup channel —
// independent of whatever happens to data/db.json (see README's note on
// ephemeral disks). If SENDGRID_API_KEY isn't set, this module no-ops with a
// warning so local dev doesn't require an API key.

const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'hello@twiraa.com';
const FROM_EMAIL = process.env.FROM_EMAIL || NOTIFY_EMAIL;

if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function getBand(overall) {
  if (overall < 30) return 'Critical — Act Now';
  if (overall < 45) return 'Fragile';
  if (overall < 65) return 'Developing';
  return 'Mature';
}

function buildEmailHtml(record) {
  const { ud, sp, overall, bm, submittedAt } = record;
  const gap = overall - bm.overall;
  const dims = Object.keys(sp);
  const rows = dims.map(sec => {
    const benchVal = bm[sec];
    const g = sec in bm ? sp[sec] - benchVal : null;
    return '<tr><td style="padding:6px 10px;border-top:1px solid #dde4e0">' + esc(sec) + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #dde4e0">' + sp[sec] + '%</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #dde4e0">' + (benchVal != null ? benchVal + '%' : '—') + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #dde4e0;color:' + (g >= 0 ? '#1f7a5f' : '#a5432e') + '">' + (g != null ? (g >= 0 ? '+' : '') + g : '—') + '</td></tr>';
  }).join('');
  const weakest = dims.slice().sort((a, b) => (sp[a] - (bm[a] ?? 0)) - (sp[b] - (bm[b] ?? 0)))[0];

  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#0c1a17;max-width:640px;margin:0 auto">' +
    '<div style="background:#0c1a17;color:#f4f2ec;padding:24px;text-align:center;border-radius:8px 8px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8fd3c2;margin-bottom:8px">ANVIXA &middot; New Assessment Submitted</div>' +
    '<div style="font-size:26px;font-weight:700;color:#8fd3c2">' + overall + '%</div>' +
    '<div style="font-size:13px;color:rgba(248,245,239,.7)">' + esc(getBand(overall)) + '</div>' +
    '</div>' +
    '<div style="padding:20px;background:#fdfcf9;border:1px solid #dde4e0;border-top:none">' +
    '<p style="margin:0 0 4px"><b>' + esc(ud.name) + '</b> &middot; ' + esc(ud.role || 'Leader') + ' at <b>' + esc(ud.co) + '</b></p>' +
    '<p style="margin:0 0 14px;color:#6c7a75;font-size:13px">' + esc(ud.ind) + ' &middot; ' + esc(ud.rev) + (ud.team ? ' &middot; ' + esc(ud.team) : '') + '</p>' +
    '<p style="font-size:13.5px;margin-bottom:16px">Scored <b>' + overall + '%</b> marketing maturity &mdash; ' + Math.abs(gap) + ' points ' + (gap >= 0 ? 'ahead of' : 'behind') + ' the stage-adjusted ' + esc(ud.ind) + ' benchmark of ' + bm.overall + '%. Weakest dimension: <b>' + esc(weakest) + '</b> (' + sp[weakest] + '%).</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">' +
    '<thead><tr style="background:#0c1a17;color:#fff"><th style="padding:6px 10px;text-align:left">Dimension</th><th style="padding:6px 10px;text-align:left">Score</th><th style="padding:6px 10px;text-align:left">Benchmark</th><th style="padding:6px 10px;text-align:left">Gap</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<p style="font-size:11px;color:#6c7a75">Submitted ' + new Date(submittedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) + '. Full raw data (profile, every answer, and scores) is attached as JSON &mdash; this is your backup copy, independent of the admin panel database.</p>' +
    '</div></div>';
}

async function sendSubmissionNotification(record) {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set — skipping submission email notification.');
    return;
  }
  const msg = {
    to: NOTIFY_EMAIL,
    from: FROM_EMAIL,
    subject: 'ANVIXA: New submission — ' + record.ud.co + ' (' + record.overall + '%)',
    html: buildEmailHtml(record),
    attachments: [{
      content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'),
      filename: 'ANVIXA_submission_' + record.id + '.json',
      type: 'application/json',
      disposition: 'attachment'
    }]
  };
  await sgMail.send(msg);
}

module.exports = { sendSubmissionNotification };
