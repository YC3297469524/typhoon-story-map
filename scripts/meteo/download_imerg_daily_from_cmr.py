#!/usr/bin/env python3
"""Download IMERG daily files from NASA CMR.

Requirements:
- EARTHDATA_TOKEN in environment (for file download)
- Optional: copy scripts/meteo/meteo_config.example.json to scripts/meteo/meteo_config.json
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

CMR_GRANULES = "https://cmr.earthdata.nasa.gov/search/granules.json"


def load_config() -> dict:
    script_dir = Path(__file__).resolve().parent
    cfg = script_dir / "meteo_config.json"
    if not cfg.exists():
        cfg = script_dir / "meteo_config.example.json"
    return json.loads(cfg.read_text(encoding="utf-8"))


def daterange(start: str, end: str):
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    while s <= e:
        yield s
        s += timedelta(days=1)


def build_temporal(start: str, end: str) -> str:
    return f"{start}T00:00:00Z,{end}T23:59:59Z"


def cmr_query(short_name: str, version: str, temporal: str, page_size: int, bbox: tuple[float, float, float, float]):
    west, south, east, north = bbox
    params = {
        "short_name": short_name,
        "version": version,
        "temporal": temporal,
        "bounding_box": f"{west},{south},{east},{north}",
        "page_size": str(page_size),
        "sort_key[]": "start_date",
    }
    url = CMR_GRANULES + "?" + urllib.parse.urlencode(params, doseq=True)
    with urllib.request.urlopen(url, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return payload.get("feed", {}).get("entry", [])


def select_data_url(entry: dict) -> str | None:
    for link in entry.get("links", []):
        href = link.get("href")
        if not href:
            continue
        # Prefer direct science file links.
        if href.endswith((".HDF5", ".nc4", ".nc", ".tif", ".he5")):
            return href
    return None


def download_file(url: str, output_file: Path, token: str):
    output_file.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=300) as resp, open(output_file, "wb") as fh:
        fh.write(resp.read())


def main() -> int:
    cfg = load_config()
    token = os.getenv("EARTHDATA_TOKEN", "").strip()
    if not token:
        print("[ERROR] EARTHDATA_TOKEN not set.")
        print("Set it first, e.g. in PowerShell:")
        print("$env:EARTHDATA_TOKEN='your_token_here'")
        return 2

    start = cfg["time_range"]["start"]
    end = cfg["time_range"]["end"]
    region = cfg["region"]
    bbox = (region["west"], region["south"], region["east"], region["north"])

    short_name = cfg["imerg"]["short_name"]
    version = cfg["imerg"]["version"]
    page_size = int(cfg["imerg"].get("page_size", 200))

    root_dir = Path(cfg["output"]["root_dir"]).resolve()
    out_dir = root_dir / "imerg"
    temporal = build_temporal(start, end)

    print(f"[INFO] Query CMR: {short_name} v{version}, {start} -> {end}")
    entries = cmr_query(short_name, version, temporal, page_size, bbox)
    if not entries:
        print("[WARN] No CMR entries found for this range/region.")
        return 0

    downloaded = 0
    skipped = 0
    for entry in entries:
        url = select_data_url(entry)
        if not url:
            skipped += 1
            continue

        filename = Path(urllib.parse.urlparse(url).path).name
        if not filename:
            skipped += 1
            continue

        output_file = out_dir / filename
        if output_file.exists() and output_file.stat().st_size > 0:
            skipped += 1
            continue

        try:
            print(f"[DOWN] {filename}")
            download_file(url, output_file, token)
            downloaded += 1
        except Exception as ex:
            print(f"[FAIL] {filename}: {ex}")

    print(f"[DONE] downloaded={downloaded}, skipped={skipped}, total_entries={len(entries)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
