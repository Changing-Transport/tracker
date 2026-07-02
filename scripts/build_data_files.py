#!/usr/bin/env python3
"""
scripts/build_data_files.py

Converts:
  data/publications.xlsx  →  data/publications.json

This script now runs AUTOMATICALLY in GitHub Actions on every pipeline run,
so editing/uploading publications.xlsx and pushing is all that's needed —
no local step required. (It can still be run locally for testing.)

The former ghg.xlsx → ghg.json builder was removed: GHG data now lives in
data/ghg.csv (built by scripts/build_ghg_csv.py), read directly by
pipeline/update_data.py. ghg.xlsx / ghg.json no longer exist in the repo.

Usage:
    python scripts/build_data_files.py
"""

import json
import sys
from datetime import date, datetime
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
PUBS_XLSX = ROOT / "data" / "publications.xlsx"
PUBS_JSON = ROOT / "data" / "publications.json"


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


# ── main ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Building publications.json from data/publications.xlsx …\n")
    ok = build_publications()
    if not ok:
        print("❌  publications.json was NOT generated. Check data/publications.xlsx")
        sys.exit(1)
    print("✅  Done. In CI this feeds pipeline/update_data.py automatically;")
    print("    locally, commit data/publications.json if you want to push it.")