// Sends the reminders due this hour (Europe/Paris) to the phone subscription stored in GitHub secrets.
import webpush from 'web-push';
import { readFileSync } from 'node:fs';

const { timezone, reminders } = JSON.parse(readFileSync(new URL('../reminders.json', import.meta.url)));
const sub = process.env.PUSH_SUBSCRIPTION, priv = process.env.VAPID_PRIVATE, pub = process.env.VAPID_PUBLIC || 'BHq5C-ONckJvT6h9GKmmLzUmYAhKkqK5-ge3PNUW7KX12lv-gnbElt4RtZYQytsLgEWLNzI_RkHi2ggZpWt_zV0';
if (!sub || !priv || !pub) { console.log('Secrets missing: PUSH_SUBSCRIPTION / VAPID_PRIVATE / VAPID_PUBLIC. Nothing sent.'); process.exit(0); }

const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]));
const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
const hour = Number(parts.hour) % 24;
const force = process.env.FORCE_TEST === 'true';

const due = force ? [{ title: 'Test Tatami Coach', body: 'Les notifications marchent.' }] : reminders.filter(r => r.days.includes(day) && Number(r.time.split(':')[0]) === hour);
if (!due.length) { console.log(`Nothing due (day ${day}, ${hour}h ${timezone}).`); process.exit(0); }

webpush.setVapidDetails('mailto:noreply@example.com', pub, priv);
for (const r of due) {
  try { await webpush.sendNotification(JSON.parse(sub), JSON.stringify({ title: r.title, body: r.body, tag: r.title })); console.log('Sent:', r.title); }
  catch (e) { console.error('Push failed:', e.statusCode, e.body); if (e.statusCode === 404 || e.statusCode === 410) console.error('Subscription expired: re-enable notifications in the app and update PUSH_SUBSCRIPTION.'); process.exitCode = 1; }
}
