#!/usr/bin/env python3
"""Compute per-day nightlight observability summary for target regions.

Observability here means: how many sampled grid points exist in each day file
inside the region (relative to the max day count in the selected period).
"""

from __future__ import annotations

import csv
import json
from pathlib import Path


REGIONS = {
    "ShanghaiCore": (30.6, 31.9, 120.8, 122.2),
    "YangtzeDeltaWide": (30.0, 32.8, 118.0, 122.8),
}


def in_bbox(lat: float, lon: float, bbox: tuple[float, float, float, float]) -> bool:
    lat_min, lat_max, lon_min, lon_max = bbox
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max


def load_day_file(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    root = Path(__file__).resolve().parents[2] / "public" / "leaflet-index"
    files = sorted(root.glob("nightlights_*.json"))
    files = [f for f in files if "timeseries" not in f.name and "metadata" not in f.name]
    if not files:
        print("[WARN] No daily nightlight files found.")
        return 0

    summary = []

    for region_name, bbox in REGIONS.items():
        day_counts = []
        day_stats = {}

        for f in files:
            day = f.stem.replace("nightlights_", "")
            records = load_day_file(f)

            vals = []
            for rec in records:
                lat = float(rec.get("lat", "nan"))
                lon = float(rec.get("lon", "nan"))
                if in_bbox(lat, lon, bbox):
                    vals.append(float(rec.get("intensity", 0.0)))

            n = len(vals)
            day_counts.append(n)
            day_stats[day] = {
                "region": region_name,
                "day": day,
                "pixel_count": n,
                "visible_ge8_count": sum(1 for v in vals if v >= 8),
                "median": sorted(vals)[n // 2] if n else None,
                "mean": (sum(vals) / n) if n else None,
            }

        max_count = max(day_counts) if day_counts else 0
        for day in sorted(day_stats.keys()):
            row = day_stats[day]
            row["observability_ratio"] = (row["pixel_count"] / max_count) if max_count else 0.0
            row["readable_flag"] = row["observability_ratio"] >= 0.4
            summary.append(row)

    out_json = root / "nightlights_observability_summary.json"
    out_csv = root / "nightlights_observability_summary.csv"

    out_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    with open(out_csv, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "region",
                "day",
                "pixel_count",
                "visible_ge8_count",
                "median",
                "mean",
                "observability_ratio",
                "readable_flag",
            ],
        )
        writer.writeheader()
        writer.writerows(summary)

    print(f"[DONE] Wrote {out_json.name} and {out_csv.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
