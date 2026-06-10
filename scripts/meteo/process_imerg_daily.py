#!/usr/bin/env python3
"""Process IMERG daily nc4 files and extract rain metrics for target regions."""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

try:
    from netCDF4 import Dataset
except ImportError:
    print("[ERROR] netCDF4 not installed. Install: pip install netCDF4")
    raise SystemExit(2)


REGIONS = {
    "ShanghaiCore": (30.6, 31.9, 120.8, 122.2),
    "YangtzeDeltaWide": (30.0, 32.8, 118.0, 122.8),
    "TyphoonTrackMatch": (18.5, 33.0, 116.5, 123.0),
}


def extract_day_from_filename(filename: str) -> str:
    """Extract YYYYMMDD from IMERG filename."""
    match = re.search(r"(20\d{6})", str(filename))
    return match.group(1) if match else ""


def in_bbox(lat: float, lon: float, bbox):
    lat_min, lat_max, lon_min, lon_max = bbox
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max


def process_imerg_file(filepath: Path, regions_dict: dict) -> dict:
    """Extract precip for each region from single IMERG file."""
    day = extract_day_from_filename(filepath.name)
    if not day:
        return {}

    result = {day: {}}

    try:
        ds = Dataset(str(filepath))
        
        # IMERG structure: (lon, lat, time)
        lat = ds.variables.get("lat")
        lon = ds.variables.get("lon")
        precip = ds.variables.get("precipitation") or ds.variables.get("precipitationCal")
        
        if lat is None or lon is None or precip is None:
            print(f"[WARN] Missing vars in {filepath.name}, vars: {list(ds.variables.keys())}")
            ds.close()
            return {}
        
        lat_vals = lat[:]
        lon_vals = lon[:]

        precip_data = np.asarray(precip[:])
        dims = tuple(precip.dimensions)

        # Normalize to 2D [lon, lat] for indexing consistency.
        if precip_data.ndim == 3 and "time" in dims:
            time_axis = dims.index("time")
            precip_data = np.take(precip_data, indices=0, axis=time_axis)
            dims_2d = tuple(d for d in dims if d != "time")
        elif precip_data.ndim == 2:
            dims_2d = dims
        else:
            print(f"[WARN] Unsupported precip dims in {filepath.name}: dims={dims}, shape={precip_data.shape}")
            ds.close()
            return {}

        if dims_2d == ("lon", "lat"):
            precip_vals = precip_data
        elif dims_2d == ("lat", "lon"):
            precip_vals = precip_data.T
        else:
            print(f"[WARN] Unknown 2D precip dims in {filepath.name}: dims_2d={dims_2d}")
            ds.close()
            return {}
        
        for region_name, bbox in regions_dict.items():
            cells = []

            lat_min, lat_max, lon_min, lon_max = bbox
            lon_idx = np.where((lon_vals >= lon_min) & (lon_vals <= lon_max))[0]
            lat_idx = np.where((lat_vals >= lat_min) & (lat_vals <= lat_max))[0]

            if lon_idx.size == 0 or lat_idx.size == 0:
                result[day][region_name] = {
                    "points": [],
                    "count": 0,
                    "mean": None,
                    "max": None,
                    "sum": 0.0,
                }
                continue

            sub_vals = precip_vals[np.ix_(lon_idx, lat_idx)]

            for lon_pos, j in enumerate(lon_idx):
                lon_f = float(lon_vals[j])
                for lat_pos, i in enumerate(lat_idx):
                    lat_f = float(lat_vals[i])
                    val = float(sub_vals[lon_pos, lat_pos])

                    # IMERG typically in mm, NaN represents no data
                    if np.isfinite(val):
                        cells.append({
                            "lat": lat_f,
                            "lon": lon_f,
                            "rain_mm": val
                        })
            
            result[day][region_name] = {
                "points": cells,
                "count": len(cells),
                "mean": np.mean([c["rain_mm"] for c in cells]) if cells else None,
                "max": max((c["rain_mm"] for c in cells), default=None),
                "sum": sum(c["rain_mm"] for c in cells)
            }
        
        ds.close()
        
    except Exception as e:
        print(f"[ERROR] Failed to process {filepath.name}: {e}")
        import traceback
        traceback.print_exc()
        return {}
    
    return result


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    public_root = root / "public" / "leaflet-index"
    imerg_dir = public_root / "meteo" / "imerg"
    
    if not imerg_dir.exists():
        print(f"[ERROR] IMERG directory not found: {imerg_dir}")
        return 2
    
    imerg_files = sorted(imerg_dir.glob("*.nc4"))
    if not imerg_files:
        print("[WARN] No .nc4 files found in IMERG directory")
        return 0
    
    all_days = {}
    
    for filepath in imerg_files:
        print(f"[PROC] {filepath.name}")
        result = process_imerg_file(filepath, REGIONS)
        all_days.update(result)

    if not all_days:
        print("[ERROR] No valid day extracted from IMERG files. Check filename parsing.")
        return 3
    
    # Flatten into day-region summary and point-level details
    output = {
        "meta": {
            "source": "IMERG Daily (0.1° grid)",
            "regions": list(REGIONS.keys()),
            "unit": "mm/day",
            "days": sorted(all_days.keys())
        },
        "days": {}
    }
    
    for day in sorted(all_days.keys()):
        day_data = {}
        for region_name in REGIONS.keys():
            region_data = all_days[day].get(region_name, {})
            day_data[region_name] = {
                "count": region_data.get("count", 0),
                "mean": region_data.get("mean"),
                "max": region_data.get("max"),
                "sum": region_data.get("sum"),
                "points": region_data.get("points", [])
            }
        output["days"][day] = day_data
    
    out_file = public_root / "meteo" / "imerg" / "imerg_daily_summary.json"
    out_file.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[DONE] Wrote {out_file}")
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
