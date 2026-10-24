// Echo Counter API for Vercel. Counts live in one Redis hash (Upstash, added from Vercel's Storage tab).
// GET  /api/echo                          -> { counts: { Con: 3, ... } }
// POST /api/echo  { manager, delta: ±1 }  -> { counts }
const MANAGERS = ['Con', 'Davs', 'Cuffe', 'Steve', 'Joyce'];
const KEY = 'ffb:echoes';
const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Adds delta to one manager's count, and never lets it go below zero.
const CHANGE = `local c = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
local d = tonumber(ARGV[2])
if d < 0 and c <= 0 then return c end
return redis.call('HINCRBY', KEYS[1], ARGV[1], d)`;

async function redis(command) {
  const res = await fetch(BASE, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(command) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error || `Redis HTTP ${res.status}`);
  return body.result;
}

async function readCounts() {
  const flat = (await redis(['HGETALL', KEY])) || [];
  const counts = Object.fromEntries(MANAGERS.map((m) => [m, 0]));
  for (let i = 0; i < flat.length; i += 2) if (flat[i] in counts) counts[flat[i]] = Number(flat[i + 1]) || 0;
  return counts;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!BASE || !TOKEN) return res.status(503).json({ error: 'Database is not connected.' });
  try {
    if (req.method === 'GET') return res.status(200).json({ counts: await readCounts() });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const { manager, delta } = body || {};
    if (!MANAGERS.includes(manager) || (delta !== 1 && delta !== -1)) return res.status(400).json({ error: 'Send a manager and a delta of 1 or -1.' });

    // One change per second per visitor, to stop runaway tapping.
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    if ((await redis(['SET', `ffb:rl:${ip}`, '1', 'NX', 'EX', '1'])) === null) return res.status(429).json({ error: 'Easy there, one echo at a time.' });

    await redis(['EVAL', CHANGE, '1', KEY, manager, String(delta)]);
    return res.status(200).json({ counts: await readCounts() });
  } catch (err) {
    console.error('echo api error:', err.message);
    return res.status(500).json({ error: 'Could not reach the database.' });
  }
};
