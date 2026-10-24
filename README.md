# Fantasy Football Banter: The Stats

A static, football-themed site built from the "Fantasy Football Banter – The Stats" spreadsheet.
No build step: open `index.html`, or serve the folder with any static host (`npx serve .`).

- `data.js`: the spreadsheet data (seasons, points, overall ranks, bets). Edit it to add a new season.
- `app.js`: tables, charts, head-to-head, hall of fame and bets, all computed from `data.js`.
- `style.css`: the pitch theme.

Season positions are by points; ties are broken by better overall FPL rank.

Titles and wooden spoons count from 2017/18, the first official season. Earlier seasons appear in the tables and charts only.

## Echo Counter setup (Vercel)

The Echo Counter needs the Vercel version of the site. `api/echo.js` is a small serverless function that keeps the counts in Upstash Redis.

1. In Vercel, import this repo as a new project (no framework, no build command; `vercel.json` sets the rest).
2. In the project's **Storage** tab, create an **Upstash Redis** database and connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. Redeploy from the **Deployments** tab.

The function only accepts +1 or −1 for the five managers, never goes below zero, and allows one change per second per visitor. There is no login, so anyone with the address can tap.

## Live standings

`.github/workflows/refresh-live.yml` checks FPL every morning. When a gameweek has finished it commits the new `live.json` to `main`, and Vercel publishes it.
