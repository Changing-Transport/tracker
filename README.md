# NDC Transport Tracker

Interactive dashboard for visualising transport commitments in national
climate policy documents (NDCs). Part of the Mobilize Net Zero project.

This repository (`Changing-Transport/tracker`) is the single active
repository for development and publishing. It started as a fork of
`belentdc/tracker`, which is no longer used. Make all changes here. The
public version is published through the Changing Transport website
(changing-transport.org).

## Products

Main dashboard: `https://changing-transport.github.io/tracker/`
Entry point, embedded via iframe on changing-transport.org.

NDC Comparison: `https://changing-transport.github.io/tracker/comparison/`
Direct link.

Country Explorer: `https://changing-transport.github.io/tracker/profiles/`
Direct link. Also reached from the map on the main dashboard and from country
names in the comparison tool (both open in a new tab).

Search: `https://changing-transport.github.io/tracker/search/`
Linked from the Country Explorer page.

Methodology: `https://changing-transport.github.io/tracker/methodology/`
Direct link.

Ask the Tracker: `https://changing-transport.github.io/tracker/ask/`
Direct link. Still under development.

Home page widget: `widget/`
Small stats widget embedded as an iframe on the Changing Transport home page.
See [`widget/README.md`](widget/README.md).

Quick search widget: `search/quick_search_widget.html`
A snippet pasted into a WordPress Custom HTML block. See Quick search widget
below before using it.

Embed the main dashboard in WordPress via iframe:

```html
<iframe src="https://changing-transport.github.io/tracker/"
        width="100%" style="border:none;" height="900"></iframe>
```

For what each dashboard shows and where every number comes from, see
[`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md).

## Repository structure

```
tracker/
├── index.html                     main dashboard
├── script.js
├── styles.css
├── requirements.txt               Python dependencies for the pipeline
│
├── comparison/                    NDC Comparison tool
│   ├── index_c.html
│   ├── script_c.js
│   └── styles_c.css
│
├── profiles/                      Country Explorer
│   ├── index.html                 list of all country profiles
│   ├── country.html               profile page template
│   ├── styles.css
│   ├── js/country.js
│   ├── quick_country_widget_old.html   old version, kept for reference
│   ├── countries/<slug>/          generated: static page per country (199)
│   ├── data/countries/*.json      generated: one file per country (199) + index.json
│   ├── data/initiatives-index.json   generated: countries per initiative, read by the profile page
│   └── factsheets/*.pdf           generated: per country PDF, not currently linked in the profile page
│
├── search/                        global search across targets and measures
│   ├── index.html
│   └── quick_search_widget.html   snippet for a WordPress Custom HTML block
│
├── methodology/                   methodology, data sources, citation
├── ask/                           guided Q&A
│
├── widget/                        home page widget (has its own README)
│   ├── index.html
│   ├── widget-summary.json        generated: the headline numbers
│   ├── tracker.jpg
│   └── widget_old.html            old version, kept for reference
│
├── assets/
│   ├── design-tokens.css          brand colours, font, shared tokens
│   └── flags/                     country flag images
│
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx   source: policy data
│   ├── publications.xlsx                             source: publications
│   ├── publications.json                             generated, do not edit
│   ├── ghg.csv                                       source: EDGAR transport emissions
│   ├── ghg_metadata.json                             EDGAR version and year
│   └── processed/
│       ├── data.json                  generated: main dashboard
│       ├── comparison-data.json       generated: comparison tool
│       ├── search-index.json          generated: search
│       ├── questions.json             generated: Ask the Tracker
│       ├── benchmarks.json            generated: profile page context
│       ├── country-urls.json          hand maintained, see Country URLs
│       └── countries_simplified.geojson
│
├── pipeline/
│   ├── update_data.py             main pipeline
│   ├── build_search_index.py      builds search-index.json, questions.json, benchmarks.json
│   ├── build_factsheets.py        builds the PDF factsheets
│   ├── widget_snippet.py          standalone reference copy of the widget summary code
│   ├── fetch_database.py          optional: download the database from the TDC API
│   └── push_database.py           uploads the database to the TDC portal (runs in CI)
│
├── scripts/
│   ├── build_data_files.py        publications.xlsx to publications.json
│   ├── build_ghg_csv.py           EDGAR source to data/ghg.csv
│   ├── smoke_test.py              validates outputs after the pipeline runs
│   └── download_flags.py          one off: downloads flag images
│
├── taxonomy/
│   ├── TAXONOMY.md                full NDC taxonomy
│   ├── ndc_taxonomy.json
│   └── ndc_taxonomy.csv
│
├── docs/
│   └── DATA_DICTIONARY.md
│
└── .github/workflows/
    └── update-data.yml
```

Files marked "generated" are overwritten every time the pipeline runs.
Don't edit them directly. The one exception is `country-urls.json`, which
is hand maintained (see Country URLs).

## Updating the data

There are three data sources. Upload whichever changed, alone or together,
in any order. GitHub Actions rebuilds everything else automatically.

```
data/GIZ-SLOCAT_Transport-Tracker-database.xlsx   policy data
data/publications.xlsx                             publications
data/ghg.csv                                       EDGAR emissions
```

### Updating the policy database

Replace `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx`, commit, push.
The filename must match exactly.

Keep the structure of the workbook as it is:

* Keep the sheet names and the column names. The pipeline checks these before
  it starts and stops with "SCHEMA CHECK FAILED" if a required one is missing.
* Keep the column order. The pipeline reads many columns by position, not by
  name, and the schema check does not test positions. Inserting or moving a
  column in the middle of a sheet does not cause an error. It silently puts
  data into the wrong fields.
* If you need a new column, add it at the end of the sheet.
* If the layout has to change on purpose, update the column positions and
  `REQUIRED_SCHEMA` in `pipeline/update_data.py` in the same commit, then
  check the dashboards against the Excel.

### Updating publications

Edit or replace `data/publications.xlsx`, commit, push. CI regenerates
`publications.json` automatically.

### Updating GHG (EDGAR) data

Convert the new EDGAR source to the canonical CSV first:

```bash
python scripts/build_ghg_csv.py <new_edgar_source> data/ghg.csv
```

Then commit `data/ghg.csv` and push.

### Fetching the database from the TDC API (optional)

```bash
python pipeline/fetch_database.py
```

Downloads, validates and saves the database to `data/`. Commit and push the
result, or trigger the workflow manually from the Actions tab.

The script reads two environment variables, both optional because the script
has defaults: `CKAN_BASE` and `CKAN_RESOURCE_ID`. Set them in your own shell
before running it, or edit the constants at the top of
`pipeline/fetch_database.py`. The workflow does not run this script, so
GitHub repository variables have no effect on it.

### Pushing the database to the TDC portal

After each push that changes the pipeline inputs, the workflow uploads the
source Excel to the tracker's dataset on the TDC portal
(`pipeline/push_database.py`). This needs a CKAN API token stored as the
repository secret `CKAN_API_TOKEN` (Settings, then Secrets and variables,
then Actions). Secrets are not copied when a repository is forked, so it must
be added here.

This step runs only for pushes, not for manual runs. It never fails the
workflow: if the token is missing or the portal is unreachable, the step goes
yellow in the log and the dashboards are still built and published.
`CKAN_BASE` and `CKAN_DATASET_ID` can override the defaults in the script.

### Running locally

```bash
pip install -r requirements.txt
python scripts/build_data_files.py     # only if publications.xlsx changed
python pipeline/update_data.py
python scripts/smoke_test.py           # optional
```

The fetch and push scripts also need `pip install requests`, which is not in
`requirements.txt`. Open the site with VS Code Live Server or
`python -m http.server 8000`.

## How the pipeline runs

```
push a data file
        |
GitHub Actions (update-data.yml)
        1. rebuild publications.json
        2. run pipeline/update_data.py
        3. run scripts/smoke_test.py (stops here if outputs look broken)
        4. run pipeline/build_search_index.py
        5. run pipeline/build_factsheets.py
        6. commit everything regenerated
        7. push the database to the TDC portal (pushes only, never blocks)
        |
Live on GitHub Pages in 3 to 5 minutes
```

Step 6 commits these generated files: `data/publications.json`,
`data/processed/data.json`, `data/processed/comparison-data.json`,
`data/processed/search-index.json`, `data/processed/questions.json`,
`data/processed/benchmarks.json`, `widget/widget-summary.json`,
`profiles/data/initiatives-index.json`, and everything under
`profiles/data/countries/`, `profiles/countries/` and `profiles/factsheets/`.

The workflow starts on a push to any of these files:

* `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` (policy database)
* `data/publications.xlsx` (publications)
* `data/publications.json` (publications, direct edit)
* `data/ghg.csv` (emissions)
* `pipeline/update_data.py` (pipeline logic)
* `scripts/build_data_files.py` (publications build logic)
* `pipeline/build_search_index.py` (search and Ask the Tracker logic)
* `pipeline/build_factsheets.py` (factsheet PDF logic)

If any step fails, the workflow opens a GitHub issue labelled
`pipeline-failure` with a link to the failed run. The live site keeps serving
the last good data until it is fixed. The workflow can also be triggered
manually from Actions, then "Update Dashboard Data", then Run workflow.

## Display rules

A few rules live in the code rather than the data itself:

**Net zero and overall mitigation targets** are mentioned once, in the
narrative text at the top of a country profile. Everything below that (the
Transport Targets section, its count, the type filters, and the generation
comparison chart) counts only transport mitigation and transport adaptation
targets. Energy sector targets are excluded everywhere on the profile. If you
add a new place that counts targets, use `transportTargets(p, "Active")` in
`profiles/js/country.js`, not `p.targets` directly, which includes
everything.

CSV downloads are the exception: they export every target with its `area`
column, unfiltered. The rule above only affects what is displayed on the
page.

**No country ranking.** Comparisons are always a country against its own past
generations, or aggregate and descriptive. Never a leaderboard.

## Country URLs

`data/processed/country-urls.json` maps each country's ISO-3 code to its
page on changing-transport.org, for example `AFG` to
`https://changing-transport.org/ndc_country/afghanistan/`. It has 199 entries
and is used to make country names clickable. The pipeline never overwrites
it.

When a country is added, or a page address on the website changes, edit this
file by hand. The smoke test warns (it does not fail) if a country on the
dashboard or in the Country Explorer has no entry, and if a URL slug differs
from the profile folder name, so that you can check it against the live
website.

## Publications registry

`data/publications.xlsx` links Changing Transport publications to specific
country profiles. Edit it in Excel, commit, push.

Columns, in this order:

* `title`: publication title as shown on the profile page
* `url`: full URL on changing-transport.org
* `date`: YYYY-MM-DD, blank if unknown
* `type`: Publication / Report / Brief / Tool / Dataset / Article
* `countries`: ISO-3 codes, comma separated. `GLOBAL` shows on all profiles
* `notes`: internal only, not shown on the site
* `active`: yes to show, no to hide without deleting

ISO-3 codes must match the policy database. The "ISO-3 Reference" sheet is a
lookup list of 126 codes with country name and region. Profiles exist for 199
Parties, so a country that is missing from that sheet can still be used if
its code matches the database. Special codes: `EEU` is the European Union
collective NDC, `XKX` is Kosovo.

## Home page widget

`widget/` holds the small stats widget embedded on the Changing Transport
home page. The three headline numbers come from `widget/widget-summary.json`,
which the pipeline regenerates and the workflow commits on every run. Details
are in [`widget/README.md`](widget/README.md).

## Quick search widget

`search/quick_search_widget.html` is a snippet for a WordPress Custom HTML
block. It contains a `TRACKER_BASE` address that it uses to find the search
index. In the current file this still points to the old development site
(`https://belentdc.github.io/tracker/`). Change it to
`https://changing-transport.github.io/tracker/` before using the snippet on
the live website.

## Taxonomy

`taxonomy/` contains the full NDC Transport Tracker taxonomy (version 4.0,
licensed CC BY 4.0). It is the reference used by the dashboard and by the
Transport Policy Miner pipeline.

## Map

This representation does not imply any opinion on the part of GIZ concerning
the legal status of any country, territory, or the delimitation of
frontiers or boundaries.

The map uses a simplified world silhouette
(`data/processed/countries_simplified.geojson`, about 850 KB, simplified from
Natural Earth data). To regenerate from a new source:

```bash
npx mapshaper source.geojson -simplify 8% keep-shapes \
  -filter-fields ISO_A3,ADM0_A3,BRK_A3,NAME,NAME_EN,ADMIN \
  -o precision=0.001 data/processed/countries_simplified.geojson
```

## Troubleshooting

**Dashboard not updating after uploading a file?**
Check the Actions tab for a workflow run. If there is none, see the next
entry. Check Issues for an auto opened `pipeline-failure` issue. The database
filename must match exactly: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`.

**Actions tab shows "Workflows aren't being run on this forked repository"?**
GitHub disables workflows on forks. Open the Actions tab, click "I understand
my workflows, go ahead and enable them", then open "Update Dashboard Data"
and use Run workflow. After that, pushes to the files listed above start it
automatically. An earlier upload does not start it retroactively.

**Workflow runs but the commit step fails?**
In Settings, then Actions, then General, set Workflow permissions to Read and
write.

**Pipeline failed with "SCHEMA CHECK FAILED"?**
A sheet or column the pipeline expects was renamed or removed in the Excel.
The error lists which ones. Fix the Excel, or if the change was intentional,
update `REQUIRED_SCHEMA` in `pipeline/update_data.py`.

**Pipeline succeeded but numbers look wrong or shifted after an Excel update?**
A column was probably inserted or moved. The pipeline reads many columns by
position and the schema check does not catch this. Restore the original column
order, or update the column positions in `pipeline/update_data.py`. See
Updating the policy database.

**Dashboard shows old data?**
Clear the browser cache. GitHub Pages can take 3 to 5 minutes to deploy after
a push. Check `data/processed/data.json` directly to confirm it was
regenerated. Its `last_updated` value shows the date of the last run.

**Home page widget shows old numbers?**
The numbers come from `widget/widget-summary.json`. Check that the last
Auto-update commit changed that file.

**"Push database to TDC" step is yellow?**
The `CKAN_API_TOKEN` secret is missing or expired, or the portal was
unreachable. The dashboards are not affected. See Pushing the database to the
TDC portal.

**Map shows equal sized circles?**
The emissions field comes from `data/ghg.csv`. Push a change to any trigger
file, or run the workflow manually, to regenerate it.

**Country profiles show stale data?**
Profiles regenerate in the same run as the main dashboard. Check that the
Actions workflow committed them (look for the commit titled "Auto-update:
Dashboard data refreshed").

**Publications not appearing on a country profile?**
Check the country's ISO-3 code in `publications.xlsx` matches the database,
and the row has `active = yes`.

**A country's name isn't a clickable link?**
Add its entry to `data/processed/country-urls.json` (see Country URLs).

**Comparison font looks different from the main dashboard?**
`comparison/index_c.html` must load `../assets/design-tokens.css`, and
`comparison/styles_c.css` must use `var(--ct-font)` for `--font-sans`.

**Factsheet PDF exists but nothing links to it?**
The download button was removed from the profile page. The PDFs still build in
CI and live in `profiles/factsheets/`.

**Search or Ask the Tracker shows old results?**
Both read files built by `pipeline/build_search_index.py`. Check that step ran
in the Actions log.

## Credits

Data: GIZ and SLOCAT Transport Tracker Database. Emissions: EDGAR. Map
silhouette: Natural Earth (public domain).

Built for Mobilize Net Zero Changing Transport (changing-transport.org).
