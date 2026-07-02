#!/usr/bin/env python3
"""
GIZ-SLOCAT Transport Tracker — output smoke test
NEW FILE — save as: scripts/smoke_test.py

Runs after pipeline/update_data.py in CI (and can be run locally any time):

    python scripts/smoke_test.py

Checks that the generated outputs are structurally sane BEFORE they get
committed and deployed. Exits non-zero on any failure, which stops the
workflow and prevents a corrupt run from replacing good live data.

What it checks (deliberately loose thresholds — this catches catastrophic
breakage, not small data changes):
  1. data.json, comparison-data.json, publications.json, index.json all
     parse as valid JSON
  2. Country counts are in a plausible range (a botched Excel parse that
     silently drops most countries fails here)
  3. A minimum share of countries carry GHG emissions data (catches a
     broken ghg.csv read that nulls everything)
  4. Per-country profile JSONs exist and match the index
  5. country-urls.json coverage: warns (does not fail) if countries in the
     data have no URL entry — visible in the Actions log
"""

import json
import sys
from pathlib import Path

FAILS = []
WARNS = []

MIN_COUNTRIES = 190          # expect ~199; below 190 means a broken parse
MIN_GHG_COVERAGE = 0.60      # at least 60% of countries should have ghg_transport


def fail(msg):
    FAILS.append(msg)
    print(f"  ❌ {msg}")


def warn(msg):
    WARNS.append(msg)
    print(f"  ⚠  {msg}")


def ok(msg):
    print(f"  ✅ {msg}")


def load_json(path):
    p = Path(path)
    if not p.exists():
        fail(f"{path} does not exist")
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(f"{path} is not valid JSON: {e}")
        return None


def main():
    print("🔍 Smoke test — validating pipeline outputs\n")

    # 1. Main dashboard data ------------------------------------------------
    print("data/processed/data.json")
    data = load_json("data/processed/data.json")
    if data:
        countries = (data.get("tab1") or {}).get("countries") or {}
        n = len(countries)
        if n < MIN_COUNTRIES:
            fail(f"only {n} countries in tab1 (expected ≥ {MIN_COUNTRIES})")
        else:
            ok(f"{n} countries in tab1")
        with_ghg = sum(1 for c in countries.values() if c.get("ghg_transport"))
        if n and with_ghg / n < MIN_GHG_COVERAGE:
            fail(f"only {with_ghg}/{n} countries have ghg_transport "
                 f"(expected ≥ {int(MIN_GHG_COVERAGE*100)}%) — check data/ghg.csv")
        elif n:
            ok(f"{with_ghg}/{n} countries have GHG data")

    # 2. Comparison data ----------------------------------------------------
    print("\ndata/processed/comparison-data.json")
    comp = load_json("data/processed/comparison-data.json")
    if comp:
        n = len(comp.get("countries") or {})
        if n < MIN_COUNTRIES:
            fail(f"only {n} countries (expected ≥ {MIN_COUNTRIES})")
        else:
            ok(f"{n} countries")

    # 3. Publications ---------------------------------------------------------
    print("\ndata/publications.json")
    pubs = load_json("data/publications.json")
    if pubs is not None:
        by_country = pubs.get("by_country") or {}
        if not by_country:
            warn("publications.json has no by_country entries — "
                 "empty publications.xlsx or build step problem?")
        else:
            ok(f"publications for {len(by_country)} country keys "
               f"(incl. GLOBAL: {'GLOBAL' in by_country})")

    # 4. Country profiles -----------------------------------------------------
    print("\nprofiles/data/countries/")
    index = load_json("profiles/data/countries/index.json")
    if index:
        listed = index.get("countries") or []
        if len(listed) < MIN_COUNTRIES:
            fail(f"index.json lists only {len(listed)} countries")
        else:
            ok(f"index.json lists {len(listed)} countries")
        missing = [c["code"] for c in listed
                   if not Path(f"profiles/data/countries/{c['code']}.json").exists()]
        if missing:
            fail(f"{len(missing)} profile JSONs missing: {', '.join(missing[:10])}")
        else:
            ok("every indexed country has a profile JSON")

    # 5. country-urls.json coverage (warn only — file is hand-maintained) ----
    print("\ndata/processed/country-urls.json")
    urls = load_json("data/processed/country-urls.json")
    if urls and data:
        countries = (data.get("tab1") or {}).get("countries") or {}
        no_url = sorted(set(countries) - set(urls))
        if no_url:
            warn(f"{len(no_url)} countries have no URL entry (links will "
                 f"show as plain text): {', '.join(no_url[:15])}"
                 + (" …" if len(no_url) > 15 else ""))
        else:
            ok("all countries have a URL entry")

    # Verdict -----------------------------------------------------------------
    print("\n" + "=" * 60)
    if FAILS:
        print(f"❌ SMOKE TEST FAILED — {len(FAILS)} problem(s). "
              "Outputs NOT safe to deploy.")
        return 1
    print(f"✅ Smoke test passed ({len(WARNS)} warning(s)). Outputs look sane.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
