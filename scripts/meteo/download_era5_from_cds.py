#!/usr/bin/env python3
"""Download ERA5 hourly cloud and precipitation from CDS.

Requirements:
- pip install cdsapi
- ~/.cdsapirc configured (CDS API key)
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path


def load_config() -> dict:
    script_dir = Path(__file__).resolve().parent
    cfg = script_dir / "meteo_config.json"
    if not cfg.exists():
        cfg = script_dir / "meteo_config.example.json"
    return json.loads(cfg.read_text(encoding="utf-8"))


def list_days(start: str, end: str):
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    out = []
    while s <= e:
        out.append(s.strftime("%d"))
        s += timedelta(days=1)
    return sorted(set(out))


def list_months(start: str, end: str):
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    out = []
    while s <= e:
        out.append(s.strftime("%m"))
        s += timedelta(days=1)
    return sorted(set(out))


def list_years(start: str, end: str):
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    out = []
    while s <= e:
        out.append(s.strftime("%Y"))
        s += timedelta(days=1)
    return sorted(set(out))


def main() -> int:
    try:
        import cdsapi
    except Exception:
        print("[ERROR] cdsapi is not installed. Run: pip install cdsapi")
        return 2

    cfg = load_config()
    start = cfg["time_range"]["start"]
    end = cfg["time_range"]["end"]
    region = cfg["region"]

    variables = cfg["era5"]["variables"]
    data_format = cfg["era5"].get("data_format", "netcdf")
    product_type = cfg["era5"].get("product_type", "reanalysis")

    root_dir = Path(cfg["output"]["root_dir"]).resolve()
    out_dir = root_dir / "era5"
    out_dir.mkdir(parents=True, exist_ok=True)
    output_file = out_dir / f"era5_{start}_{end}_{region['name']}.nc"

    req = {
        "product_type": [product_type],
        "variable": variables,
        "year": list_years(start, end),
        "month": list_months(start, end),
        "day": list_days(start, end),
        "time": [f"{h:02d}:00" for h in range(24)],
        "data_format": data_format,
        # CDS expects north, west, south, east
        "area": [region["north"], region["west"], region["south"], region["east"]],
    }

    print("[INFO] Request ERA5 single-level hourly data...")
    print(f"[INFO] Variables: {variables}")
    print(f"[INFO] Output: {output_file}")

    client = cdsapi.Client()
    client.retrieve("reanalysis-era5-single-levels", req, str(output_file))
    print("[DONE] ERA5 download completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
