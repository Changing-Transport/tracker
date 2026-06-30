"""
build_ghg_csv.py

Applies the confirmed unit-suffix convention to the EDGAR transport summary
and writes data/ghg.csv for tracker_BV_branch.

Convention (confirmed, handover.md):
- Source: EDGAR, last year 2024. No version number in headers, no per-row
  source tag, no data quality flags.
- Units go in column headers only, e.g. Global_Emissions_1970 [MtCO2e]
- Rank1/2/3_Sector columns stay as-is (categorical, no unit)
- Population is in millions -> [million]
- Share_* columns are fractions -> [fraction]
- PerCapita_* columns -> [tCO2e/capita]

Run:
    python build_ghg_csv.py <input_csv> <output_csv>

Default paths assume this script lives at data-scripts/ alongside data/.
"""

import csv
import sys
import re
from pathlib import Path

UNIT_MAP = {
    "Global_Emissions": "MtCO2e",
    "Transport_Emissions": "MtCO2e",
    "Share_Transport_National": "fraction",
    "Share_Transport_Global": "fraction",
    "Population": "million",
    "PerCapita_Total": "tCO2e/capita",
    "PerCapita_Transport": "tCO2e/capita",
}
NO_UNIT_PREFIXES = ("Rank1_Sector", "Rank2_Sector", "Rank3_Sector")
ID_COLUMNS = {"EDGAR Country Code", "Country", "Region"}

YEAR_SUFFIX_RE = re.compile(r"^(.*)_(\d{4})$")


def add_unit(col_name: str) -> str:
    if col_name in ID_COLUMNS:
        return col_name
    if col_name.startswith(NO_UNIT_PREFIXES):
        return col_name  # categorical, no unit

    m = YEAR_SUFFIX_RE.match(col_name)
    if not m:
        return col_name  # unrecognized column, leave untouched
    base, year = m.group(1), m.group(2)

    unit = UNIT_MAP.get(base)
    if unit is None:
        return col_name  # unrecognized base, leave untouched
    return f"{base}_{year} [{unit}]"


def main():
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../data/ghg.xlsx_replacement.csv")
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("../data/ghg.csv")

    with open(in_path, encoding="utf-8-sig", newline="") as f_in:
        reader = csv.reader(f_in)
        header = next(reader)
        new_header = [add_unit(c) for c in header]

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8", newline="") as f_out:
            writer = csv.writer(f_out)
            writer.writerow(new_header)
            row_count = 0
            for row in reader:
                writer.writerow(row)
                row_count += 1

    print(f"Wrote {out_path} ({row_count} country rows, {len(new_header)} columns)")

    # sanity check: print a few renamed headers
    sample = [h for h in new_header if h not in ID_COLUMNS][:10]
    print("Sample renamed headers:")
    for h in sample:
        print(" ", h)


if __name__ == "__main__":
    main()
