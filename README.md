# Admissions Explorer

Search university programs across UK, US, Canada, Hong Kong, Australia, and Singapore. Compare candidate profiles against real admitted students, with live AI-powered search from The GradCafe, Reddit, GMAT Club, and Poets & Quants.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The full application (single file, no build step) |
| `programs.json` | Program database — edit this to add or update programs |
| `config.js` | Your Anthropic API key (gitignored, never committed) |
| `.gitignore` | Keeps `config.js` and OS files out of git |

---

## Quickstart (local)

1. Clone or download the repo
2. Copy `config.js` and add your Anthropic API key (get one at https://console.anthropic.com/settings/keys)
3. Open `index.html` in a browser — or run a local server:

```bash
# Python 3
python3 -m http.server 8080
# then open http://localhost:8080
```

> The app fetches `programs.json` via `fetch()`, which requires a server (not `file://`). Use Python or VS Code Live Server.

---

## Deploy to GitHub Pages (free, recommended)

1. Create a new GitHub repository
2. Push all files **except `config.js`** (it's gitignored):

```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/admissions-explorer.git
git push -u origin main
```

3. In GitHub → Settings → Pages → set Source to **main branch / root**
4. Your app is live at `https://YOUR_USERNAME.github.io/admissions-explorer/`

**API key on GitHub Pages:** Since `config.js` is gitignored, the live AI search won't work without it. Options:
- Add `config.js` manually to the server after deploying (via FTP/SSH if self-hosted)
- Use a Netlify environment variable + a small serverless function to proxy the key
- Or simply use the pre-loaded program data and let users do manual searches

---

## Deploy to Vercel (auto-redeploy on push)

1. Push to GitHub (as above)
2. Go to https://vercel.com → New Project → Import your GitHub repo
3. Vercel will detect it as a static site — no build settings needed
4. To add the API key securely: Vercel Dashboard → Settings → Environment Variables → add `ANTHROPIC_API_KEY`
5. Create a tiny `/api/search.js` serverless function to proxy requests (see below)

**Vercel serverless proxy** (`/api/search.js`):
```js
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
}
```
Then change the fetch URL in `index.html` from `https://api.anthropic.com/v1/messages` to `/api/search`.

---

## Adding new programs

Open `programs.json` and add a new object to the array. Every program follows this structure:

```json
{
  "id": 99,
  "n": "MSc Data Science",
  "u": "University of Warwick",
  "c": "UK",
  "rk": 6,
  "t": "PG",
  "f": "Data Science",
  "sc": "4.0",
  "agpa": "3.65",
  "url": "https://warwick.ac.uk/...",
  "src": ["The GradCafe", "Reddit r/GradAdmissions"],
  "ad": {
    "gpa": { "v": 3.65, "mn": 3.4, "mx": 4.0, "l": "First / high 2:1" },
    "tst": { "v": 165, "mn": 160, "mx": 170, "l": "GRE Quant avg 165" },
    "wk":  { "v": 0, "mn": 0, "mx": 0, "l": "N/A" },
    "nat": "40% UK, 60% Intl",
    "ex":  "Strong stats/programming background",
    "pr":  "Russell Group or equivalent"
  },
  "req": {
    "UK":    "First class or high 2:1",
    "US":    "3.5+ GPA",
    "IN":    "70%+ aggregate; top institution",
    "CA":    "3.5+ GPA",
    "AU":    "H1 or H2A",
    "OTHER": "Strong quant background"
  }
}
```

### Field reference

| Field | Description |
|-------|-------------|
| `id` | Unique integer — increment from the last entry |
| `n` | Program name |
| `u` | University name |
| `c` | Country code: `UK` `US` `CA` `HK` `AU` `SG` |
| `rk` | Rank within country (used for default sort) |
| `t` | Type: `UG` `PG` `MBA` |
| `f` | Field of study (must match a chip label) |
| `sc` | GPA scale description (e.g. `4.0`, `UK A-levels`, `7.0 (AU)`) |
| `agpa` | Display string for average grade |
| `url` | Official program page |
| `src` | Array of data source names |
| `ad.gpa` | `v`=avg, `mn`=min, `mx`=max, `l`=label |
| `ad.tst` | Same — set `v:0` if no test required |
| `ad.wk` | Same — set `v:0` for undergraduate programs |
| `ad.nat` | Nationality mix string |
| `ad.ex` | Extracurriculars / prestige note |
| `ad.pr` | Typical undergrad background |
| `req` | Object keyed by nationality code |

### Available fields (for `f`)

`Management` · `Economics` · `Finance` · `CS / AI` · `Engineering` · `Law` · `Natural Sciences` · `Public Policy` · `Social Sciences` · `Humanities` · `Medicine` · `Data Science`

You can add new fields — just make sure the `f` value is consistent across entries. The field chip buttons are built automatically from the `FIELDS` array in `index.html`.

---

## Adding student profiles

Student profiles are stored in the `SPROFS` object inside `index.html`. Add entries keyed by program `id`:

```js
SPROFS[99] = [
  {
    an: 'Applicant #WAR-DS-2024-01',
    res: 'accepted',         // 'accepted' | 'waitlist' | 'rejected'
    gpa: '3.78',
    tst: 'GRE Q 167',
    wk: '1 yr data analyst',
    ug: 'University of Birmingham',
    nat: 'British',
    ex: 'Kaggle competition winner',
    src: 'The GradCafe',
    srcUrl: 'https://www.thegradcafe.com/survey/?q=Warwick+Data+Science'
  }
];
```

Or use the "Load profiles via live AI search" button in the app to fetch them dynamically.

---

## Updating data over time

The recommended workflow:

1. Open this conversation with Claude
2. Say "add [N] new programs to programs.json for [discipline/country]"
3. Claude searches official sites and returns new JSON entries
4. Paste them into `programs.json`
5. `git add . && git commit -m "Add programs" && git push`
6. GitHub Pages / Vercel auto-redeploys in ~30 seconds

---

## Tech stack

- Vanilla HTML + CSS + JavaScript (no framework, no build step)
- `programs.json` loaded via `fetch()` at runtime
- Anthropic Claude API (`claude-sonnet-4-6`) with web search for live data
- `localStorage` for caching AI search results between sessions
- Fully dark-mode compatible via CSS variables
