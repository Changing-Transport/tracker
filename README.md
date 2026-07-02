# NDC Transport Tracker

Interactive dashboard for visualising transport commitments in national climate
policy documents (NDCs). Part of the
[Changing Transport](https://changing-transport.org/) initiative (GIZ · SLOCAT
· Mobilize Net-Zero).

## Live URLs

| Product | URL |
|---|---|
| Main dashboard | `https://belentdc.github.io/tracker/` |
| NDC Comparison | `https://belentdc.github.io/tracker/comparison/` |
| Country Explorer | `https://belentdc.github.io/tracker/profiles/` |

Embed in WordPress via iframe:
```html
<iframe src="https://belentdc.github.io/tracker/"
        width="100%" style="border:none;" height="900"></iframe>
```

> 📖 **What each dashboard shows and where every number comes from:**
> see [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) — the full mapping
> of every KPI, chart and section to its source database and column.

---

## Repository structure

```
tracker/
├── assets/
│   ├── design-tokens.css          ← single source of brand (colours, font, tokens)
│   └── flags/                     ← self-hosted country flag images (ISO 2-letter codes)
│
├── comparison/
│   ├── index_c.html               ← comparison dashboard HTML
│   ├── script_c.js                ← comparison JavaScript
│   └── styles_c.css               ← comparison styles (imports design-tokens)
│
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx  ← SOURCE 1: upload to update policy data
│   ├── publications.xlsx          ← SOURCE 2: upload to update publications (CI rebuilds the JSON)
│   ├── publications.json          ← GENERATED in CI from publications.xlsx — never edit
│   ├── ghg.csv                    ← SOURCE 3: EDGAR transport emissions (rebuild via scripts/build_ghg_csv.py)
│   ├── ghg_metadata.json          ← EDGAR provenance notes (version, retrieval date) — informational only
│   └── processed/
│       ├── data.json              ← GENERATED — main dashboard data
│       ├── comparison-data.json   ← GENERATED — comparison data
│       ├── country-urls.json      ← ⚠ MANUAL — ISO3 → changing-transport.org URL map (see below)
│       └── countries_simplified.geojson  ← simplified world map (~850 KB, the ONLY GeoJSON used)
│
├── docs/
│   └── DATA_DICTIONARY.md         ← every KPI/section → source variable mapping
│
├── pipeline/
│   ├── update_data.py             ← main pipeline: Excel + JSON/CSV → all dashboard outputs
│   └── fetch_database.py          ← Option B: download database from TDC API
│
├── profiles/
│   ├── index.html                 ← Country Explorer: searchable list of all country profiles
│   ├── country.html               ← individual country profile page template
│   ├── styles.css                 ← profile styles (imports design-tokens)
│   ├── js/country.js              ← country profile JavaScript
│   ├── countries/<slug>/          ← GENERATED — static shell page per country (SEO/sharing)
│   └── data/countries/*.json      ← GENERATED — one JSON per country (199 files) + index.json
│
├── scripts/
│   ├── build_data_files.py        ← publications.xlsx → publications.json (runs automatically in CI)
│   ├── build_ghg_csv.py           ← EDGAR source Excel/CSV → data/ghg.csv
│   ├── smoke_test.py              ← output validation, runs in CI after the pipeline
│   └── download_flags.py          ← one-off: downloads country flag images to assets/flags/
│
├── taxonomy/
│   ├── TAXONOMY.md                ← full NDC taxonomy v4.0 with Mermaid diagrams
│   ├── ndc_taxonomy.json          ← machine-readable taxonomy
│   └── ndc_taxonomy.csv           ← spreadsheet version
│
├── .github/workflows/
│   └── update-data.yml            ← GitHub Actions: auto-runs on any data push
│
├── requirements.txt               ← Python dependencies
├── index.html                     ← main dashboard HTML
├── script.js                      ← main dashboard JavaScript
└── styles.css                     ← main dashboard styles (imports design-tokens)
```

> **Never edit files marked GENERATED** — they are overwritten on every
> pipeline run. The one exception in `data/processed/` is
> `country-urls.json`, which is **hand-maintained** (see below).

---

## How to update the data — upload anything, in any order

There are three independent data sources. **Upload whichever changed —
alone or together, in any order.** GitHub Actions detects what changed,
rebuilds every intermediate file itself, reruns the full pipeline, and
deploys. There is no local pre-processing step and no required sequence.

```
SOURCE 1: GIZ-SLOCAT_Transport-Tracker-database.xlsx  (policy data — changes often)
SOURCE 2: publications.xlsx                            (publications — changes often)
SOURCE 3: ghg.csv                                      (EDGAR emissions — changes ~yearly)
        │
        ▼  push any of them
GitHub Actions (update-data.yml)
        │  1. rebuilds data/publications.json from publications.xlsx
        │  2. runs pipeline/update_data.py  (reads all three sources)
        │  3. runs scripts/smoke_test.py    (blocks deploy if outputs look broken)
        │  4. commits regenerated files back
        ▼
data/processed/data.json · comparison-data.json · profiles/data/countries/*.json
        ▼
Live on GitHub Pages in ~3–5 minutes
```

### Updating the policy database (most common)
1. Replace `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx`
   (GitHub Desktop drag-and-drop, or GitHub web UI → Upload files)
2. Commit and push. Done.

> Filename must be exact and case-sensitive:
> `GIZ-SLOCAT_Transport-Tracker-database.xlsx`

### Updating publications
1. Edit/replace `data/publications.xlsx`
2. Commit and push. Done — CI regenerates `publications.json` itself.

### Updating GHG (EDGAR) data — roughly yearly
The EDGAR source needs one local conversion to the canonical CSV:
```bash
python scripts/build_ghg_csv.py <new_edgar_source> data/ghg.csv
```
Then commit `data/ghg.csv` and push. Done.

### Option B — fetch the database from the TDC API
```bash
python pipeline/fetch_database.py           # download + validate + save to data/
```
Then commit and push the downloaded Excel (or run the workflow manually:
GitHub → Actions → "Update Dashboard Data" → Run workflow).

**Configuration** (no code change needed): set repository variables
`CKAN_BASE` and `CKAN_RESOURCE_ID` under Settings → Variables, or edit the
two constants at the top of `pipeline/fetch_database.py`.

### Running locally
```bash
pip install -r requirements.txt
python scripts/build_data_files.py     # only if you changed publications.xlsx
python pipeline/update_data.py
python scripts/smoke_test.py           # optional sanity check
```
Open with VS Code Live Server or `python -m http.server 8000`.

---

## country-urls.json — the one hand-maintained file

`data/processed/country-urls.json` maps ISO-3 codes to each country's page
on changing-transport.org (`/ndc_country/<slug>/`). It is **not generated**
because the WordPress slugs are not derivable from country names
(e.g. Iran → `iran-islamic-republic-of`, Türkiye → `tuerkiye`).

- When a **new country page goes live** on changing-transport.org, add its
  line here by hand.
- If a country has no entry, its name simply shows as plain text (no link) —
  nothing breaks, but the smoke test prints a warning listing missing codes
  in the Actions log so drift is visible.

---

## Publications registry

`data/publications.xlsx` links Changing Transport publications to specific
country profiles. Edit it directly in Excel, commit, push — CI does the rest.

| Column | Description |
|---|---|
| `title` | Publication title as it appears on the profile page |
| `url` | Full URL on changing-transport.org/publications/… |
| `date` | YYYY-MM-DD (leave blank if unknown) |
| `type` | Publication / Report / Brief / Tool / Dataset / Article |
| `countries` | ISO-3 codes, comma-separated (e.g. `BRA,COL,MEX`). Use `GLOBAL` to show on all profiles |
| `notes` | Internal only — not shown on the site |
| `active` | `yes` to show · `no` to hide without deleting |

ISO-3 codes match the GIZ database exactly. The second sheet "ISO-3 Reference"
lists all 199 Parties. Key special codes: `EEU` = European Union collective
NDC, `XKX` = Kosovo.

---

## Taxonomy

`taxonomy/` contains the full NDC Transport Tracker classification taxonomy
(version 4.0, licensed CC BY 4.0). It is the reference used by both the
dashboard and the Transport Policy Miner pipeline.

---

## Map

This representation does not imply any opinion on the part of GIZ concerning
the legal status of any country, territory, or the delimitation of frontiers
or boundaries.

The map uses a simplified world silhouette
(`data/processed/countries_simplified.geojson`, ~850 KB, simplified from
Natural Earth data). To regenerate from a new source:

```bash
npx mapshaper source.geojson -simplify 8% keep-shapes \
  -filter-fields ISO_A3,ADM0_A3,BRK_A3,NAME,NAME_EN,ADMIN \
  -o precision=0.001 data/processed/countries_simplified.geojson
```

---

## GitHub Actions

`.github/workflows/update-data.yml` triggers automatically on push when any
of these files change:

| Trigger file | What changed |
|---|---|
| `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` | New NDC database version |
| `data/publications.xlsx` | Publications registry updated (raw Excel) |
| `data/publications.json` | Publications JSON updated directly (rare) |
| `data/ghg.csv` | GHG emissions data updated |
| `pipeline/update_data.py` | Pipeline logic changed |
| `scripts/build_data_files.py` | Publications build logic changed |

The workflow rebuilds `publications.json`, runs `pipeline/update_data.py`,
validates all outputs with `scripts/smoke_test.py`, and commits the
regenerated files back to the branch. **If any step fails, it automatically
opens a GitHub issue labelled `pipeline-failure`** with a link to the failed
run — the live site keeps serving the last good data.

It can also be triggered manually via GitHub → Actions → "Update Dashboard
Data" → Run workflow.

---

## Troubleshooting

**Dashboard not updating after uploading a file?**
- Check the Actions tab → "Update Dashboard Data" — did the workflow run?
- Check the Issues tab for an auto-opened `pipeline-failure` issue: it links
  to the failed step and error message.
- The database filename must be exact: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`
- Commit `pipeline/update_data.py` changes *before* uploading a new Excel

**Pipeline failed with "SCHEMA CHECK FAILED"?**
- A sheet or column the pipeline needs was renamed/removed in the Excel.
  The error lists exactly which ones. Fix the Excel (or, if the change was
  intentional, update `REQUIRED_SCHEMA` in `pipeline/update_data.py`).

**Dashboard shows old data?**
- Clear browser cache (`Ctrl+Shift+R` / `Cmd+Shift+R`)
- Wait 3–5 minutes after pushing — GitHub Pages takes time to deploy
- Check `data/processed/data.json` directly to see if it was regenerated

**By CO₂ map shows equal circles?**
- The `ghg_transport` field comes from `data/ghg.csv`. Push a change to any
  trigger file (or run the workflow manually) to regenerate.

**Country profiles show stale data?**
- Profiles regenerate in the same run as the main dashboard. Check the
  Actions workflow committed them (`🤖 Auto-update: Dashboard data refreshed`).

**Publications not appearing on a country profile?**
- Check the country's ISO-3 code in `publications.xlsx` matches the database,
  and the row has `active = yes`. CI rebuilds the JSON automatically — no
  local step needed anymore.

**A country's name isn't a clickable link?**
- Add its entry to `data/processed/country-urls.json` (hand-maintained —
  see the section above). The smoke test warning in the Actions log lists
  every missing code.

**Comparison font looks different from the main dashboard?**
- `comparison/styles_c.css` must import `../assets/design-tokens.css` and
  use `var(--ct-font)` for `--font-sans`.

---

## Credits

**Data:** GIZ-SLOCAT Transport Tracker Database · Emissions: EDGAR ·
Map silhouette: Natural Earth (public domain)

**Built for:** GIZ · SLOCAT · Mobilize Net-Zero · Changing Transport
(changing-transport.org)