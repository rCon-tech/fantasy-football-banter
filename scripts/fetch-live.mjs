// Pulls this season's standings for the league from the public FPL API and writes live.json.
// If FPL can't be reached, it leaves the existing live.json alone so the deploy still works.
import { readFile, writeFile } from 'node:fs/promises';

const LEAGUE_ID = 1206721;
// FPL entry id -> manager name used on the site.
const MANAGERS = { 3235970: 'Con', 981545: 'Steve', 5546592: 'Davs', 5651046: 'Cuffe', 5554380: 'Joyce' };
const SEASON = '2026/2027';
const API = 'https://fantasy.premierleague.com/api';

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: { 'user-agent': 'Mozilla/5.0 (fantasy-football-banter)' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

try {
  const boot = await get('/bootstrap-static/');
  const gw = boot.events.find((e) => e.is_current) ?? boot.events.find((e) => e.is_next);
  // Only publish standings once every match in the gameweek is done and FPL has finalised the points.
  // FORCE=1 (manual runs) skips this check.
  if (!process.env.FORCE) {
    if (!gw?.finished) { console.log(`Gameweek ${gw?.id} is still in progress. Keeping the previous standings.`); process.exit(0); }
    const prev = await readFile(new URL('../live.json', import.meta.url), 'utf8').then(JSON.parse, () => null);
    if (prev?.gameweek === gw.id && prev.gameweekFinished) { console.log(`Gameweek ${gw.id} is already published. Nothing to do.`); process.exit(0); }
  }
  const league = await get(`/leagues-classic/${LEAGUE_ID}/standings/`);
  const rows = league.standings.results.filter((r) => MANAGERS[r.entry]);
  const entries = [];
  for (const r of rows) {
    const e = await get(`/entry/${r.entry}/`);
    entries.push({
      manager: MANAGERS[r.entry], team: r.entry_name, total: r.total, gameweekPoints: r.event_total,
      rank: r.rank, lastRank: r.last_rank, overallRank: e.summary_overall_rank,
    });
  }
  if (entries.length !== Object.keys(MANAGERS).length) throw new Error(`Expected ${Object.keys(MANAGERS).length} managers, got ${entries.length}`);
  entries.sort((a, b) => a.rank - b.rank);
  const live = {
    season: SEASON, league: league.league.name, gameweek: gw?.id ?? null, gameweekFinished: gw?.finished ?? null,
    gameweeks: boot.events.length, updated: new Date().toISOString(), entries,
  };
  await writeFile(new URL('../live.json', import.meta.url), JSON.stringify(live, null, 2) + '\n');
  console.log(`live.json updated: gameweek ${live.gameweek}, ${entries.length} managers`);
} catch (err) {
  console.warn(`Could not refresh live data (${err.message}). Keeping the existing live.json.`);
  try { await readFile(new URL('../live.json', import.meta.url)); } catch { console.warn('No live.json exists yet.'); }
}
