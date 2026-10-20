# Fantasy Football Banter: The Stats

A static, football-themed site built from the "Fantasy Football Banter – The Stats" spreadsheet.
No build step: open `index.html`, or serve the folder with any static host (`npx serve .`).

- `data.js`: the spreadsheet data (seasons, points, overall ranks, bets). Edit it to add a new season.
- `app.js`: tables, charts, head-to-head, hall of fame and bets, all computed from `data.js`.
- `style.css`: the pitch theme.

Season positions are by points; ties are broken by better overall FPL rank.

Titles and wooden spoons count from 2017/18, the first official season. Earlier seasons appear in the tables and charts only.

## Echo Counter setup

The Echo Counter keeps its counts in a free Firebase Realtime Database so everyone sees the same numbers.

1. Go to https://console.firebase.google.com and click **Add project** (turn Google Analytics off).
2. In the project, open **Build → Realtime Database → Create database**. Pick a location near you and start in **locked mode**.
3. Open the database's **Rules** tab, paste in the contents of `database.rules.json`, and click **Publish**. These rules only allow adding or removing a single echo for the five managers.
4. On the **Data** tab, copy the database URL (it looks like `https://your-project-default-rtdb.europe-west1.firebasedatabase.app`).
5. Paste it into `echo-config.js` as `databaseURL` and push to `main`.

Anyone with the site address can tap, because there is no login. The rules stop anything except +1 or −1 on the five names.
