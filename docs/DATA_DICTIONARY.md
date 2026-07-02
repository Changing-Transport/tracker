# Data Dictionary — GIZ-SLOCAT NDC Transport Tracker

**Save as: `docs/DATA_DICTIONARY.md`**

This document maps every indicator, KPI, chart and content section across the
three products to the exact source variable it comes from, so anyone can trace
any number on screen back to a database column.

Every mapping below was verified directly against the repository source code
(`pipeline/update_data.py`, `script.js`, `comparison/script_c.js`,
`profiles/js/country.js`) and the real database (main branch, July 2026).

---

## 1. The three source databases

### Source 1 — GIZ-SLOCAT Transport Tracker database (Excel)
`data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` — single source of truth for
all **policy document data**. Sheets and the columns the pipeline reads:

| Sheet | Columns used by the pipeline |
|---|---|
| **Country** | `Country Codes` (ISO-3), `Country` (name), `Region`, `Income Level Group`, coalition columns (`EU27`, `G7`, `G20`, `OECD`, `Annex I or Non-Annex I`, `MENA region`), fallback emissions columns (`GHG total 2023 (Mt)`, `GHG transport 2023 (Mt)` — used only if a country is missing from ghg.csv) |
| **Document** | `Country Code`, `Document ID`, `Type of document` (NDC/LTS/BTR), `Document name`, `Version number` (→ generation), `Date`, `Status` (Active/Archived), `URL`, `Transport content`, `Contains transport mitigation target`, `Summary transport target`, `GHG transport target type`, `Contains transport adaptation target`, `Contains transport mitigation measures`, `Contains transport adaptation measures`, `Contains benefits`, `Contains reference to just transition` |
| **Targets** | `Country Code`, `Document ID`, `Document name`, `Version number`, `Type of Document`, `Status`, `Target area`, `Target scope`, `GHG target?`, `Target type`, `Target Year`, `Conditionality`, `Content` (verbatim quote), `Page Number`, ICE phase-out columns (`ICE phase-out target`, `ICE phase-out target type`, `ICE phase-out target year`), `Net-zero target` |
| **Mitigation** | `Country Code`, `Document ID`, `Category`, `Purpose`, `Instrument`, `A-S-I`, `Measure`, `Quote`, `Page Number`, `Status of measure`, mode/geography columns |
| **Adaptation** | same pattern as Mitigation — feeds the `adaptation` array and the comparison Adaptation tabs |
| **Benefits** | `Country Code`, `Document ID`, `Type of benefit`, quote — feeds the `benefits` profile array |
| **References** | `Country Code`, `Document ID`, `Further document type`, `URL to further document` — feeds the `references` profile array |

(The workbook also contains `Read me` and `Glossary` sheets — documentation only, not read by the pipeline.)

### Source 2 — Publications registry (Excel)
`data/publications.xlsx` → CI builds `data/publications.json`.
Columns: `title`, `url`, `date`, `type`, `countries` (ISO-3 list or `GLOBAL`),
`notes` (internal), `active` (yes/no). `GLOBAL` entries are merged into every
country's publication list by the pipeline.

### Source 3 — EDGAR transport emissions (CSV)
`data/ghg.csv` — wide format, one row per country, year columns 1970–2024 with
unit-suffixed headers. The pipeline's `load_ghg_csv()` derives, per country:

| Derived field | Meaning |
|---|---|
| `total_mt` | Total GHG emissions, latest year (Mt CO₂e) |
| `transport_mt` | Transport GHG emissions, latest year (Mt CO₂e) |
| `transport_share_pct` | Transport as % of the country's total emissions |
| `transport_global_share_pct` | Country's transport emissions as % of world transport emissions |
| `transport_per_capita` | Transport emissions per capita |
| `transport_sector_rank` | Where transport ranks among the country's sectors (from `Rank1_Sector`/`Rank2_Sector`/`Rank3_Sector` columns) |
| `year` | The latest data year the snapshot refers to |
| `trends` | Full 1970–2024 time series: `years`, `total`, `transport` |

**EU special case:** the `EEU` (EU collective NDC) emissions entry is computed
as the **sum of the 27 member states** from EDGAR — it is not an EDGAR row.

---

## 2. Key derived fields (used everywhere)

| Field | Logic | Source |
|---|---|---|
| `generation` (gen1/gen2/gen3) | From `Version number`: "NDC 1.x" → gen1, "NDC 2.x" → gen2, "NDC 3.x" → gen3. Labels: 1st Gen 2015–2019, 2nd Gen 2020–2024, 3rd Gen 2024–ongoing | Document sheet |
| `latest_active_gen` | Highest generation containing an **Active** document; falls back to highest generation with any document | Document sheet `Status` |
| `latest_has_transport` | Latest active NDC contains a transport target | Document sheet |
| `had_transport_previously` | An **earlier** generation NDC had a transport target while the latest active one does not (distinguishes "dropped transport" from "never had it") | Document sheet across generations |
| `covered_by_eu` / `via_eu` | EU member states inherit the EU collective NDC (`EEU`); their documents/targets/measures are flagged `via_eu: true` | Country sheet + EU member list |
| `asi` | A-S-I labels normalised to `["Avoid","Shift","Improve"]` order | Mitigation sheet |
| `slug` | Country name → URL slug (ASCII, lowercase, hyphens), used for static profile pages | Country sheet name |

---

## 3. Main dashboard (`index.html` — data from `data/processed/data.json`)

### Tab 1 — Progress in Transport Targets

| Element | What it shows | Variables / source |
|---|---|---|
| **Generation bar chart** | Per NDC generation: how many NDCs were submitted vs how many contained a transport target, filterable by region. Each bar = 100% of NDCs submitted in that generation | `tab1.generations[gen].regions[region].total` and `.with_transport` — counted from Document sheet (`Version number` + transport target flag), region from Country sheet |
| **World map (target status)** | Three-colour choropleth: green = transport target in latest active NDC (`latest_has_transport`), light blue = transport target only in a previous NDC (`had_transport_previously`), grey = never. EU members counted once via the EU NDC (green), not individually | `tab1.countries[iso3]` fields above |
| **"Currently showing" counters** | Counts of green / light blue / grey countries for the selected region | Same fields, computed client-side in `script.js` |
| **By CO₂ map (Dorling cartogram)** | Circle per country, area ∝ transport CO₂e (radius ∝ √Mt). EU shown as individual members (EEU excluded to avoid double counting). Countries without data get a small equal fallback circle | `ghg_transport` per country ← `transport_mt` from `data/ghg.csv`; positions from `countries_simplified.geojson` centroids (manual centroids for EEU, XKX) |

### Tab 2 — Leading Measures for Decarbonisation

| Element | What it shows | Variables / source |
|---|---|---|
| **Measure category breakdown** | Count of mitigation measures per category (Electrification, Mode shift and demand management, Alternative fuels, Aviation and maritime, Transport system improvements, Energy efficiency, …) per country/region | `tab2` category counts ← Mitigation sheet category column. EU members display the EU NDC's measure mix |

### Country name links
Country names link out to the country's page on changing-transport.org via the
hand-maintained `data/processed/country-urls.json`. Missing entry = plain text.

---

## 4. NDC Comparison dashboard (`comparison/` — data from `comparison-data.json`)

Up to 3 columns; two modes via URL deep-links from profiles:
`?mode=track&c=COL` (one country across gen1/gen2/gen3) or
`?mode=compare&c1=..&c2=..&c3=..&gen=latest` (countries side by side).

### Column header
| Element | Source |
|---|---|
| Country + generation + version selector | `countries[iso3].generations[gen][versionIndex]` |
| Submitted date | Document sheet `Date` |
| Active/Archived badge | Document sheet `Status` |
| "Reports collectively through the EU NDC" note | EU member list (member codes resolve to `EEU` data) |

### Summary KPI cards (5 per column, clickable → tab)
| KPI | Counting rule | Source |
|---|---|---|
| **Mit. targets** | Targets where `target_area == "Transport sector mitigation target"` | Targets sheet |
| **Mit. measures** | Sum of all mitigation measures across categories in that document | Mitigation sheet |
| **Net zero** | Targets where `target_area == "Net zero target"` | Targets sheet |
| **Adapt. targets** | Targets where `target_area == "Transport sector adaptation target"` | Targets sheet |
| **Adapt. measures** | Sum of adaptation measures across categories | Adaptation sheet |

### Content tabs
| Tab | Per item shown | Source columns |
|---|---|---|
| Mitigation / Adaptation targets | target area, GHG vs Non-GHG, target type (e.g. "GHG: Base year", "Zero emission vehicle targets"), conditionality, target year, verbatim quote, page number | Targets sheet |
| Mitigation / Adaptation measures | grouped by category; per measure: quote + classification | Mitigation/Adaptation sheets |
| Net zero | net-zero targets with same target fields | Targets sheet |

### Filters
Targets tabs: GHG / Non-GHG (`GHG target?` column). Measures tabs: A-S-I
(Avoid/Shift/Improve) and transport modes (Mitigation sheet columns).

---

## 5. Country Profile pages (`profiles/` — data from `profiles/data/countries/<ISO3>.json`)

### Hero header
Country name, flag (`assets/flags/<iso2>.png`), country switcher (searchable,
loads `profiles/data/countries/index.json`), region and income group (Country
sheet). EU members show collective-NDC context.

### KPI cards (verified in `renderKPIs()`, `profiles/js/country.js`)
Four fixed cards, plus up to two conditional ones:

| # | Card label | Value | Source |
|---|---|---|---|
| 1 | **Transport measures** ("in active documents") | Count of `measures[]` where `status == "Active"` | Mitigation sheet |
| 2 | **Transport targets** ("in active documents") | Count of `targets[]` where `status == "Active"` | Targets sheet |
| 3 | **Transport share of emissions** ("of national total · EDGAR {year}") | `emissions.transport_share_pct` % | ghg.csv |
| 4 | **Transport sector emissions** ("Mt CO₂e · EDGAR {year}") | `emissions.transport_mt` | ghg.csv |
| 5 (if data) | **Transport emissions per person** ("t CO₂e per capita") | `emissions.transport_per_capita` | ghg.csv |
| 6 (if data) | **"Transport is the Nth"** ("Biggest source of emissions among national sectors") | `emissions.transport_sector_rank` rendered as 1st/2nd/3rd/Nth | ghg.csv `Rank1/2/3_Sector` columns |

### Emissions context section
| Element | Variables | Source |
|---|---|---|
| Snapshot figures | `emissions.total_mt`, `transport_mt`, `transport_share_pct`, `transport_global_share_pct`, `transport_per_capita`, `transport_sector_rank`, data `year` | ghg.csv |
| Trend chart (1970–2024) | `trends.years`, `trends.total`, `trends.transport` | ghg.csv time series |
| Footer attribution | "EDGAR, 2024" → mobilize-net-zero project page | static |

### Policy Journey
Timeline of the country's documents in order: type, name, version/generation,
date, Active/Archived status, link to the official document (`URL`), plus the
per-document transport flags (has transport content, mitigation/adaptation
targets and measures, benefits, just transition). **Source: Document sheet.**

### "Where targets point"
`target_years[]` — each `{year, scope}` pair (e.g. 2030 economy-wide, 2035
transport) extracted from the Targets sheet target-year and scope columns,
plus target detail (GHG type, conditionality, quote, page).

### Transport Measures
Full measure list with filter buttons (counts in brackets are consistent
across all filters): **by category, purpose, instrument, A-S-I, mode,
geography, and by document**. Per measure: verbatim quote + page + document +
classification. `asi_summary` and `category_summary` are the aggregated
counts. **Source: Mitigation sheet** (adaptation equivalents from the
Adaptation sheet).

### Publications
`publications[]` — country-matched entries plus all `GLOBAL` entries.
**Source: publications.xlsx** (title, url, date, type; `active=yes` only).

### Similar countries (three neutral lenses — deliberately not a ranking)
| Lens | Logic |
|---|---|
| Same region | Alphabetical, same `region`, max 6 |
| Similar transport share | Closest \|Δ transport_share_pct\|, from ghg.csv |
| "Betting on the same priorities" | Cosine similarity of the measure-category mix (min. 3 measures). EU members are compared with non-EU peers only, since member-to-member similarity is an artifact of sharing one document |

### External links
`links.changing_transport_search` (site search for the country) and
`links.tdc_search` (Transport Data Commons portal, by ISO-2). Generated by the
pipeline.

### BTR placeholder
`btr: {available: false, documents: [], measures: []}` — reserved structure
for the Biennial Transparency Report integration (planned).

### Metadata
`meta.generated` (run date) and `meta.database` (source Excel filename) —
stamped on every profile so any page can be traced to its pipeline run.

---

## 6. Country Explorer (`profiles/index.html` — data from `index.json`)

Per country row/card: name, flag (`iso2`), region, income, `ndc_version`,
`has_lts`, `has_transport_content` (any Active document with transport
content), `n_documents`, `n_measures`, `transport_share_pct`. All from the
same pipeline run as the profiles.

---

## 7. Reference counts (as of July 2026 database)

169 countries in the database + 27 EU member states added by the pipeline =
**196 countries** on the main/comparison dashboards; **199 country profiles**
(incl. EEU and XKX); 477 NDC documents; 184 documents with a transport target
(86 with a GHG transport target); 12 countries withdrew transport targets in
their latest NDC (`had_transport_previously`); ghg.csv covers 225
countries/territories; 1709 publication entries.

---

*Maintained alongside the pipeline — when a new indicator is added to any
product, add its row here in the same commit.*
