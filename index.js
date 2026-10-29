// iBlueText GitHub Action: send an iMessage, SMS or WhatsApp message from a workflow.
// No dependencies: reads inputs from INPUT_* env vars and writes outputs to $GITHUB_OUTPUT, as the Actions runner expects.
// API docs: https://ibluetext.com/docs/  (POST /api/v1/send, POST /api/v1/whatsapp, GET ?id= for status)
const fs = require('node:fs');

const API = 'https://ibluetext.com/api/v1';
const input = (name) => (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim();
const setOutput = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, key, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'ibluetext-github-action/1.0' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  let j = {};
  try { j = await r.json(); } catch { /* non-JSON error page */ }
  return { ok: r.ok, status: r.status, body: j };
}

async function main() {
  const key = input('api-key');
  const to = input('to').split(/[\s,;]+/).filter(Boolean);
  const message = input('message');
  const channel = (input('channel') || 'auto').toLowerCase();
  const mediaUrl = input('media-url');
  const lineId = parseInt(input('line-id'), 10) || 0;
  const wait = Math.min(300, Math.max(0, parseInt(input('wait'), 10) || 0));
  const strict = input('fail-on-error').toLowerCase() !== 'false';

  if (!key) throw new Error('api-key is required. Add your iBlueText API key as a repository secret and pass it in.');
  if (!to.length) throw new Error('to is required: a phone number with country code, e.g. +18135550142.');
  if (!message && !mediaUrl) throw new Error('message is required.');
  if (!['auto', 'imessage', 'sms', 'whatsapp'].includes(channel)) throw new Error('channel must be auto, imessage, sms or whatsapp.');
  console.log(`::add-mask::${key}`);

  const wa = channel === 'whatsapp';
  const sent = [];
  for (const phone of to) {
    const body = wa ? { to: phone, body: message } : { to: phone, body: message, channel };
    if (mediaUrl) { if (wa) body.media_url = mediaUrl; else body.media = [{ url: mediaUrl }]; }
    if (lineId && !wa) body.line_id = lineId;
    const r = await call('POST', wa ? '/whatsapp' : '/send', key, body);
    if (r.ok && r.body.id) {
      console.log(`Queued ${wa ? 'WhatsApp' : 'text'} to ${phone}: message ${r.body.id}${r.body.warning ? ` (${r.body.warning})` : ''}`);
      sent.push({ phone, id: r.body.id, status: 'queued' });
    } else {
      const why = r.body.error || `HTTP ${r.status}`;
      console.log(`::${strict ? 'error' : 'warning'}::Could not send to ${phone}: ${why}`);
      sent.push({ phone, id: '', status: 'failed', error: why });
    }
  }

  // optional: wait until each queued message has left (sent / delivered / failed)
  const deadline = Date.now() + wait * 1000;
  while (wait && Date.now() < deadline && sent.some((m) => m.id && m.status === 'queued')) {
    await sleep(5000);
    for (const m of sent.filter((x) => x.id && x.status === 'queued')) {
      const r = await call('GET', `${wa ? '/whatsapp' : '/send'}?id=${m.id}`, key);
      if (r.ok && r.body.status && r.body.status !== 'queued' && r.body.status !== 'claimed') {
        m.status = r.body.status === 'read' ? 'delivered' : r.body.status;
        m.error = r.body.error || '';
        console.log(`Message ${m.id} to ${m.phone}: ${m.status}${m.error ? ` (${m.error})` : ''}`);
      }
    }
  }

  const states = [...new Set(sent.map((m) => m.status))];
  const overall = states.length === 1 ? states[0] : 'partial';
  setOutput('message-ids', sent.map((m) => m.id).join(','));
  setOutput('status', overall);
  const failed = sent.filter((m) => m.status === 'failed');
  if (failed.length && strict) throw new Error(`${failed.length} of ${sent.length} message(s) failed: ${failed.map((m) => `${m.phone} (${m.error || 'failed'})`).join('; ')}`);
}

main().catch((e) => { console.log(`::error::${e.message}`); process.exitCode = 1; });
