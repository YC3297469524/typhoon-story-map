#!/usr/bin/env python3
"""Compute daily ERA5 cloud/rain summaries and align with nightlight observability.

Supports ERA5 zip-packaged output produced by CDS where a .nc file is actually
a zip containing two netcdf files:
- data_stream-oper_stepType-instant.nc (tcc)
- data_stream-oper_stepType-accum.nc (tp)
"""

from __future__ import annotations

import csv
import json
import tempfile
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from netCDF4 import Dataset, num2date


REGIONS = {
    "ShanghaiCore": (30.6, 31.9, 120.8, 122.2),
    "YangtzeDeltaWide": (30.0, 32.8, 118.0, 122.8),
    "TyphoonTrackMatch": (18.5, 33.0, 116.5, 123.0),
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def day_key_from_dt(dt: datetime) -> str:
    return dt.strftime("%Y%m%d")


def build_region_masks(lat_vals, lon_vals):
    masks = {}
    for name, (lat_min, lat_max, lon_min, lon_max) in REGIONS.items():
        pairs = []
        for i, lat in enumerate(lat_vals):
            if lat < lat_min or lat > lat_max:
                continue
            for j, lon in enumerate(lon_vals):
                if lon_min <= lon <= lon_max:
                    pairs.append((i, j))
        masks[name] = pairs
    return masks


def collect_daily_mean_tcc(ds: Dataset, masks):
    time_var = ds.variables["valid_time"]
    lat = ds.variables["latitude"][:]
    lon = ds.variables["longitude"][:]
    tcc = ds.variables["tcc"]
    dt = num2date(time_var[:], units=time_var.units, calendar=getattr(time_var, "calendar", "standard"))

    sums = defaultdict(float)
    counts = defaultdict(int)
    valid_grid_count = {name: len(mask) for name, mask in masks.items()}

    for t_idx, t in enumerate(dt):
        day = day_key_from_dt(t)
        frame = tcc[t_idx, :, :]
        for name, mask in masks.items():
            if not mask:
                continue
            frame_sum = 0.0
            for i, j in mask:
                frame_sum += float(frame[i, j])
            sums[(day, name)] += frame_sum / len(mask)
            counts[(day, name)] += 1

    daily = {}
    for (day, name), total in sums.items():
        n = counts[(day, name)]
        daily[(day, name)] = {
            "day": day,
            "region": name,
            "era5_cloud_mean": total / n if n else None,
            "era5_cloud_hour_count": n,
            "era5_cloud_grid_count": valid_grid_count[name],
        }
    return daily


def collect_daily_sum_tp_mm(ds: Dataset, masks):
    time_var = ds.variables["valid_time"]
    tp = ds.variables["tp"]
    dt = num2date(time_var[:], units=time_var.units, calendar=getattr(time_var, "calendar", "standard"))

    sums = defaultdict(float)
    counts = defaultdict(int)
    valid_grid_count = {name: len(mask) for name, mask in masks.items()}

    for t_idx, t in enumerate(dt):
        day = day_key_from_dt(t)
        frame = tp[t_idx, :, :]
        for name, mask in masks.items():
            if not mask:
                continue
            frame_mean_m = 0.0
            for i, j in mask:
                frame_mean_m += float(frame[i, j])
            frame_mean_m /= len(mask)
            sums[(day, name)] += frame_mean_m * 1000.0
            counts[(day, name)] += 1

    daily = {}
    for (day, name), total in sums.items():
        n = counts[(day, name)]
        daily[(day, name)] = {
            "day": day,
            "region": name,
            "era5_precip_mm_daily": total,
            "era5_precip_hour_count": n,
            "era5_precip_grid_count": valid_grid_count[name],
        }
    return daily


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    public_root = root / "public" / "leaflet-index"

    era5_zip = public_root / "meteo" / "era5" / "era5_2025-07-04_2025-07-12_TyphoonTrackMatch.nc"
    obs_file = public_root / "nightlights_observability_summary.json"

    if not era5_zip.exists():
        print(f"[ERROR] ERA5 file not found: {era5_zip}")
        return 2
    if not obs_file.exists():
        print(f"[ERROR] Nightlight summary not found: {obs_file}")
        return 2

    obs_rows = load_json(obs_file)
    obs_by_key = {(row["day"], row["region"]): row for row in obs_rows}

    with tempfile.TemporaryDirectory(prefix="era5_unpack_") as td:
        td_path = Path(td)
        with zipfile.ZipFile(era5_zip) as zf:
            zf.extractall(td_path)

        instant = td_path / "data_stream-oper_stepType-instant.nc"
        accum = td_path / "data_stream-oper_stepType-accum.nc"
        if not instant.exists() or not accum.exists():
            print("[ERROR] Expected inner ERA5 nc files not found after unzip.")
            return 2

        with Dataset(str(instant)) as ds_inst:
            lat = ds_inst.variables["latitude"][:]
            lon = ds_inst.variables["longitude"][:]
            masks = build_region_masks(lat, lon)
            cloud_daily = collect_daily_mean_tcc(ds_inst, masks)

        with Dataset(str(accum)) as ds_acc:
            precip_daily = collect_daily_sum_tp_mm(ds_acc, masks)

    keys = sorted(set(cloud_daily.keys()) | set(precip_daily.keys()))
    merged = []
    for key in keys:
        day, region = key
        row = {
            "day": day,
            "region": region,
            "era5_cloud_mean": None,
            "era5_cloud_hour_count": 0,
            "era5_cloud_grid_count": 0,
            "era5_precip_mm_daily": None,
            "era5_precip_hour_count": 0,
            "era5_precip_grid_count": 0,
            "night_pixel_count": None,
            "night_observability_ratio": None,
            "night_readable_flag": None,
            "night_mean": None,
            "night_median": None,
        }

        if key in cloud_daily:
            row.update(cloud_daily[key])
        if key in precip_daily:
            row.update(precip_daily[key])

        obs = obs_by_key.get(key)
        if obs:
            row.update(
                {
                    "night_pixel_count": obs.get("pixel_count"),
                    "night_observability_ratio": obs.get("observability_ratio"),
                    "night_readable_flag": obs.get("readable_flag"),
                    "night_mean": obs.get("mean"),
                    "night_median": obs.get("median"),
                }
            )

        merged.append(row)

    out_json = public_root / "meteo" / "era5" / "era5_nightlight_alignment.json"
    out_csv = public_root / "meteo" / "era5" / "era5_nightlight_alignment.csv"

    out_json.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

    with open(out_csv, "w", newline="", encoding="utf-8") as fh:
        fieldnames = [
            "day",
            "region",
            "era5_cloud_mean",
            "era5_precip_mm_daily",
            "era5_cloud_hour_count",
            "era5_precip_hour_count",
            "era5_cloud_grid_count",
            "era5_precip_grid_count",
            "night_pixel_count",
            "night_observability_ratio",
            "night_readable_flag",
            "night_mean",
            "night_median",
        ]
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged)

    print(f"[DONE] Wrote {out_json}")
    print(f"[DONE] Wrote {out_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
