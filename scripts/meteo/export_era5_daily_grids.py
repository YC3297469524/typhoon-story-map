#!/usr/bin/env python3
"""Export daily ERA5 cloud/rain gridded values for frontend rendering."""

from __future__ import annotations

import json
import tempfile
import zipfile
from collections import defaultdict
from pathlib import Path

from netCDF4 import Dataset, num2date


def build_edges(values):
    vals = [float(v) for v in values]
    if len(vals) < 2:
        d = 0.125
        return [vals[0] - d, vals[0] + d]

    edges = []
    first_delta = vals[1] - vals[0]
    edges.append(vals[0] - first_delta / 2)

    for i in range(len(vals) - 1):
        edges.append((vals[i] + vals[i + 1]) / 2)

    last_delta = vals[-1] - vals[-2]
    edges.append(vals[-1] + last_delta / 2)
    return edges


def day_key(dt):
    return dt.strftime("%Y%m%d")


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    public_root = root / "public" / "leaflet-index"
    era5_zip = public_root / "meteo" / "era5" / "era5_2025-07-04_2025-07-12_TyphoonTrackMatch.nc"
    out_path = public_root / "meteo" / "era5" / "era5_daily_grids.json"

    if not era5_zip.exists():
        print(f"[ERROR] ERA5 zip-like file not found: {era5_zip}")
        return 2

    with tempfile.TemporaryDirectory(prefix="era5_grid_") as td:
        td_path = Path(td)
        with zipfile.ZipFile(era5_zip) as zf:
            zf.extractall(td_path)

        instant = td_path / "data_stream-oper_stepType-instant.nc"
        accum = td_path / "data_stream-oper_stepType-accum.nc"
        if not instant.exists() or not accum.exists():
            print("[ERROR] Missing inner ERA5 netcdf files.")
            return 2

        with Dataset(str(instant)) as ds_inst, Dataset(str(accum)) as ds_acc:
            lat = ds_inst.variables["latitude"][:]
            lon = ds_inst.variables["longitude"][:]
            t_inst = ds_inst.variables["valid_time"]
            t_acc = ds_acc.variables["valid_time"]

            dt_inst = num2date(t_inst[:], units=t_inst.units, calendar=getattr(t_inst, "calendar", "standard"))
            dt_acc = num2date(t_acc[:], units=t_acc.units, calendar=getattr(t_acc, "calendar", "standard"))

            tcc = ds_inst.variables["tcc"]
            tp = ds_acc.variables["tp"]

            cloud_sum = defaultdict(lambda: None)
            cloud_cnt = defaultdict(int)
            rain_sum_mm = defaultdict(lambda: None)

            for ti, dt in enumerate(dt_inst):
                day = day_key(dt)
                frame = tcc[ti, :, :]
                if cloud_sum[day] is None:
                    cloud_sum[day] = frame.astype("f8")
                else:
                    cloud_sum[day] += frame
                cloud_cnt[day] += 1

            for ti, dt in enumerate(dt_acc):
                day = day_key(dt)
                frame_mm = tp[ti, :, :] * 1000.0
                if rain_sum_mm[day] is None:
                    rain_sum_mm[day] = frame_mm.astype("f8")
                else:
                    rain_sum_mm[day] += frame_mm

            lat_edges = build_edges(lat)
            lon_edges = build_edges(lon)

            days = sorted(set(cloud_sum.keys()) | set(rain_sum_mm.keys()))
            payload = {
                "meta": {
                    "latCount": len(lat),
                    "lonCount": len(lon),
                    "days": days,
                    "cloudUnit": "0-1",
                    "rainUnit": "mm/day"
                },
                "days": {}
            }

            for day in days:
                cells = []
                cloud_grid = None
                if cloud_sum[day] is not None and cloud_cnt[day] > 0:
                    cloud_grid = cloud_sum[day] / cloud_cnt[day]
                rain_grid = rain_sum_mm[day]

                for i in range(len(lat)):
                    lat_min = min(lat_edges[i], lat_edges[i + 1])
                    lat_max = max(lat_edges[i], lat_edges[i + 1])
                    for j in range(len(lon)):
                        lon_min = min(lon_edges[j], lon_edges[j + 1])
                        lon_max = max(lon_edges[j], lon_edges[j + 1])
                        cloud_val = float(cloud_grid[i, j]) if cloud_grid is not None else None
                        rain_val = float(rain_grid[i, j]) if rain_grid is not None else None
                        cells.append(
                            {
                                "latMin": lat_min,
                                "latMax": lat_max,
                                "lonMin": lon_min,
                                "lonMax": lon_max,
                                "cloud": cloud_val,
                                "rain": rain_val,
                            }
                        )

                payload["days"][day] = cells

    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"[DONE] Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
