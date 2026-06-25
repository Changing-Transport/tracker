#!/usr/bin/env python3
"""
scripts/build_data_files.py

Converts:
  data/publications.xlsx  →  data/publications.json
  data/ghg.xlsx           →  data/ghg.json

Run locally after editing either Excel, then commit the JSONs and push.
CI will regenerate all 199 country profiles automatically.

Usage:
    python scripts/build_data_files.py
"""

import json
import sys
from datetime import date, datetime
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
PUBS_XLSX = ROOT / "data" / "publications.xlsx"
GHG_XLSX  = ROOT / "data" / "ghg.xlsx"
PUBS_JSON = ROOT / "data" / "publications.json"
GHG_JSON  = ROOT / "data" / "ghg.json"


# ══════════════════════════════════════════════════════════════════════
#  PUBLICATIONS
# ══════════════════════════════════════════════════════════════════════
def build_publications():
    """
    publications.xlsx layout (Publications sheet):
      Row 0  = registry description (skip)
      Row 1  = column headers: title, url, date, type, countries, notes, active
      Row 2  = column descriptions (skip)
      Row 3+ = data

    Country tagging (col E):
      Single:   COL
      Multiple: COL, KEN, MAR
      All:      GLOBAL
      Empty:    skipped
    """
    try:
        import openpyxl
    except ImportError:
        print("❌  openpyxl not installed. Run: pip install openpyxl")
        return False

    if not PUBS_XLSX.exists():
        print(f"⚠   {PUBS_XLSX} not found — skipping publications")
        return False

    wb = openpyxl.load_workbook(PUBS_XLSX, read_only=True, data_only=True)
    ws = wb["Publications"]
    rows = list(ws.iter_rows(values_only=True))

    # Row 0 = header text, Row 1 = col names, Row 2 = col descriptions, Row 3+ = data
    data_rows = rows[3:]

    by_country = {}
    total_entries = skipped = 0

    for row in data_rows:
        if not row or not row[0]:
            continue

        title         = str(row[0] or "").strip()
        url           = str(row[1] or "").strip()
        raw_date      = row[2]
        pub_type      = str(row[3] or "").strip()
        countries_raw = str(row[4] or "").strip()
        active        = str(row[6] or "yes").strip().lower()

        if not title or not url or active == "no":
            skipped += 1
            continue

        if isinstance(raw_date, (date, datetime)):
            pub_date = raw_date.strftime("%Y-%m-%d")
        elif raw_date:
            pub_date = str(raw_date).strip()[:10]
        else:
            pub_date = ""

        if not countries_raw:
            skipped += 1
            continue

        codes = [c.strip().upper() for c in countries_raw.replace(",", " ").split() if c.strip()]
        codes = ["GLOBAL" if c in ("GLOBAL", "GLOBAL.") else c for c in codes]

        entry = {"title": title, "url": url, "date": pub_date, "type": pub_type}
        for code in codes:
            by_country.setdefault(code, []).append(entry)
            total_entries += 1

    output = {"generated": str(date.today()), "by_country": by_country}
    PUBS_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    n_countries = len([k for k in by_country if k != "GLOBAL"])
    n_global    = len(by_country.get("GLOBAL", []))
    print(f"✅  publications.json → {total_entries} entries | {n_countries} countries | {n_global} GLOBAL")
    return True


# ══════════════════════════════════════════════════════════════════════
#  GHG DATA
# ══════════════════════════════════════════════════════════════════════

# Maps any column header variant → internal field name
HEADER_MAP = {
    # iso3 variants
    "iso3":              "iso3",
    "iso-3 code":        "iso3",
    "iso3 code":         "iso3",
    "country code":      "iso3",
    "code":              "iso3",
    # name
    "name":              "name",
    "country name":      "name",
    "country":           "name",
    # region / income
    "region":            "region",
    "income":            "income",
    "income group":      "income",
    # numeric fields
    "total_mt":                       "total_mt",
    "total ghg (mt co₂e)":            "total_mt",
    "total ghg (mt co2e)":            "total_mt",
    "total ghg":                      "total_mt",
    "transport_mt":                   "transport_mt",
    "transport ghg (mt co₂e)":        "transport_mt",
    "transport ghg (mt co2e)":        "transport_mt",
    "transport ghg":                  "transport_mt",
    "transport_share_pct":            "transport_share_pct",
    "transport % national":           "transport_share_pct",
    "transport % of national":        "transport_share_pct",
    "transport_global_share_pct":     "transport_global_share_pct",
    "transport % global total":       "transport_global_share_pct",
    "transport % of global":          "transport_global_share_pct",
    "transport_per_capita":           "transport_per_capita",
    "per capita (t co₂e/person)":     "transport_per_capita",
    "per capita (t co2e/person)":     "transport_per_capita",
    "per capita":                     "transport_per_capita",
    "transport_sector_rank":          "transport_sector_rank",
    "sector rank (1=largest)":        "transport_sector_rank",
    "sector rank":                    "transport_sector_rank",
    "year":              "year",
    "source":            "source",
    "notes":             "notes",
    "notes (internal)":  "notes",
}

NUMERIC_FIELDS = {
    "total_mt", "transport_mt", "transport_share_pct",
    "transport_global_share_pct", "transport_per_capita",
    "transport_sector_rank", "year"
}


def find_header_row(rows):
    """
    Finds the row that contains the ISO-3 identifier column.
    Works regardless of how many instruction/banner rows precede it.
    """
    for i, row in enumerate(rows):
        if not row:
            continue
        normalized = [str(c or "").strip().lower() for c in row]
        # Check if any cell maps to 'iso3'
        for cell_text in normalized:
            if HEADER_MAP.get(cell_text) == "iso3":
                return i
    return None


def build_ghg():
    """
    ghg.xlsx — reads the GHG emissions Excel.

    Flexible header detection: works even if you delete or add instruction
    rows at the top. The script finds the first row that contains an
    ISO-3 code column (any recognised variant) and uses that as headers.

    Required: one column that identifies the ISO-3 country code.
    All other columns are optional.
    """
    try:
        import openpyxl
    except ImportError:
        print("❌  openpyxl not installed.")
        return False

    if not GHG_XLSX.exists():
        print(f"⚠   {GHG_XLSX} not found — skipping GHG data")
        print("    Place data/ghg.xlsx in the repo (download from outputs).")
        return False

    wb   = openpyxl.load_workbook(GHG_XLSX, read_only=True, data_only=True)
    ws   = wb.active
    rows = list(ws.iter_rows(values_only=True))

    if not rows:
        print("❌  ghg.xlsx is empty")
        return False

    # Auto-detect header row
    header_row_idx = find_header_row(rows)
    if header_row_idx is None:
        print("❌  Could not find a header row in ghg.xlsx.")
        print("    Make sure one row contains a country code column")
        print("    (e.g. 'iso3', 'ISO-3 Code', 'Country Code', 'code')")
        return False

    raw_header = [str(c or "").strip().lower() for c in rows[header_row_idx]]
    header     = [HEADER_MAP.get(h, h) for h in raw_header]
    data_rows  = rows[header_row_idx + 1:]

    if "iso3" not in header:
        print("❌  Header row found but could not map any column to iso3.")
        print(f"    Header row contents: {rows[header_row_idx]}")
        return False

    iso3_idx = header.index("iso3")
    countries = {}
    skipped = 0

    for row in data_rows:
        if not row or not row[iso3_idx]:
            continue

        # Skip rows that look like instruction/note rows
        first_val = str(row[0] or "").strip()
        if len(first_val) != 3 or not first_val.isalpha():
            skipped += 1
            continue

        code = first_val.upper()
        entry = {}

        for i, field in enumerate(header):
            if field == "iso3" or field == "name" or field == "notes" or not field:
                continue
            if i >= len(row):
                continue
            val = row[i]
            if field in NUMERIC_FIELDS:
                if isinstance(val, (int, float)):
                    entry[field] = round(float(val), 4) if isinstance(val, float) else int(val)
                else:
                    entry[field] = None
            elif field in ("source",):
                entry[field] = str(val).strip() if val is not None else None

        # Auto-calculate share if missing
        if entry.get("transport_share_pct") is None:
            t   = entry.get("transport_mt")
            tot = entry.get("total_mt")
            if isinstance(t, (int, float)) and isinstance(tot, (int, float)) and tot > 0:
                entry["transport_share_pct"] = round(t / tot * 100, 2)

        countries[code] = entry

    if not countries:
        print("❌  No valid country rows found in ghg.xlsx.")
        print(f"    Header detected at row {header_row_idx + 1}, skipped {skipped} non-data rows.")
        return False

    years   = [v.get("year")   for v in countries.values() if v.get("year")]
    sources = [v.get("source") for v in countries.values() if v.get("source")]
    maj_year   = max(set(years),   key=years.count)   if years   else None
    maj_source = max(set(sources), key=sources.count) if sources else None

    output = {
        "generated": str(date.today()),
        "source":    maj_source,
        "year":      maj_year,
        "countries": countries,
    }
    GHG_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    populated = sum(1 for v in countries.values()
                    if any(v.get(k) is not None
                           for k in ("total_mt", "transport_mt", "transport_share_pct")))
    print(f"✅  ghg.json → {len(countries)} countries | {populated} with data "
          f"| year: {maj_year} | source: {maj_source}")
    print(f"    (skipped {skipped} non-data rows)")
    return True


# ── main ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Building data files from Excel sources...\n")
    ok_pubs = build_publications()
    ok_ghg  = build_ghg()
    print()
    if ok_pubs or ok_ghg:
        files = []
        if ok_pubs: files.append("data/publications.json")
        if ok_ghg:  files.append("data/ghg.json")
        print("Next steps:")
        print(f"  1. Commit:  git add {' '.join(files)}")
        print("              git commit -m 'Data: Update publications and/or GHG JSON'")
        print("  2. Push  →  CI regenerates all 199 country profiles automatically")
    else:
        print("⚠  No files generated. Check that Excel files exist in data/")
        sys.exit(1)