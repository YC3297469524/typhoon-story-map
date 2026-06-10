#!/usr/bin/env python3
"""Render VNP46A2 H5 files directly into fixed-frame PNG overlays."""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import h5py
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import process_vnp46a2 as vnp  # noqa: E402

INPUT_DIR = Path(os.getenv('VNP46A2_INPUT_DIR', PROJECT_ROOT / 'data' / 'vnp46a2_raw')).expanduser().resolve()
OUTPUT_DIR = Path(os.getenv('RADIANCE_IMAGE_OUTPUT_DIR', PROJECT_ROOT / 'public' / 'leaflet-index')).expanduser().resolve()
IMAGE_DIR = OUTPUT_DIR / 'radiance_images'
IMAGE_WIDTH = max(512, int(os.getenv('RADIANCE_IMAGE_WIDTH', '4096')))
POINT_RADIUS = max(0, int(os.getenv('RADIANCE_POINT_RADIUS', '1')))
ALPHA = max(1, min(255, int(os.getenv('RADIANCE_ALPHA', '220'))))
LIGHT_THRESHOLD = float(os.getenv('NIGHTLIGHTS_LIGHT_THRESHOLD', '8'))
ROW_BLOCK_SIZE = max(1, int(os.getenv('RADIANCE_ROW_BLOCK_SIZE', '128')))
TARGET_BOUNDS = [[10.0, 110.0], [40.0, 130.0]]
MERCATOR_LAT_LIMIT = 85.05112878


def lat_to_mercator_y(lat: float) -> float:
    clamped_lat = max(-MERCATOR_LAT_LIMIT, min(MERCATOR_LAT_LIMIT, float(lat)))
    rad = np.deg2rad(clamped_lat)
    return float(np.log(np.tan(np.pi / 4 + rad / 2)))


def lon_to_mercator_x(lon: float) -> float:
    return float(np.deg2rad(float(lon)))


def get_target_size() -> Tuple[int, int]:
    sw_lat, sw_lon = TARGET_BOUNDS[0]
    ne_lat, ne_lon = TARGET_BOUNDS[1]
    mercator_y_span = lat_to_mercator_y(ne_lat) - lat_to_mercator_y(sw_lat)
    mercator_x_span = lon_to_mercator_x(ne_lon) - lon_to_mercator_x(sw_lon)
    height = max(512, int(round(IMAGE_WIDTH * (mercator_y_span / mercator_x_span))))
    return IMAGE_WIDTH, height


def parse_target_bounds() -> List[List[float]]:
    raw = os.getenv('RADIANCE_TARGET_BOUNDS', '').strip()
    if not raw:
        return TARGET_BOUNDS

    parts = [part.strip() for part in raw.split(',')]
    if len(parts) != 4:
        return TARGET_BOUNDS

    try:
        sw_lat, sw_lon, ne_lat, ne_lon = [float(part) for part in parts]
    except ValueError:
        return TARGET_BOUNDS

    if sw_lat >= ne_lat or sw_lon >= ne_lon:
        return TARGET_BOUNDS

    return [[sw_lat, sw_lon], [ne_lat, ne_lon]]


def get_night_color(val: float):
    if val < 25:
        return (122, 67, 29, ALPHA)
    if val < 60:
        return (210, 105, 30, ALPHA)
    if val < 120:
        return (255, 140, 0, ALPHA)
    if val < 200:
        return (255, 215, 0, ALPHA)
    if val < 280:
        return (255, 250, 205, ALPHA)
    return (255, 255, 255, ALPHA)


def draw_point(pixels, width, height, x, y, color, radius):
    if radius <= 0:
        if 0 <= x < width and 0 <= y < height:
            pixels[x, y] = color
        return

    for dy in range(-radius, radius + 1):
        yy = y + dy
        if yy < 0 or yy >= height:
            continue
        for dx in range(-radius, radius + 1):
            xx = x + dx
            if xx < 0 or xx >= width:
                continue
            pixels[xx, yy] = color


def _find_dataset(group, candidates):
    for name in candidates:
        if name in group:
            return group[name]

    normalized = {k.replace('_', '').lower(): k for k in group.keys()}
    for name in candidates:
        key = normalized.get(name.replace('_', '').lower())
        if key:
            return group[key]
    return None


def collect_h5_files() -> Dict[str, List[Path]]:
    files_by_day: Dict[str, List[Path]] = defaultdict(list)
    for h5file in sorted(INPUT_DIR.rglob('*.h5')):
        date = vnp.parse_date_from_filename(h5file.name)
        if not date:
            print(f'SKIP: {h5file.name} (无法解析日期)')
            continue
        day_key = date.strftime('%Y-%m-%d')
        files_by_day[day_key].append(h5file)
    return files_by_day


def point_to_canvas(point, bounds, canvas_size):
    sw_lat, sw_lon = bounds[0]
    ne_lat, ne_lon = bounds[1]
    lat = point.get('lat')
    lon = point.get('lon')
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return None

    lat = float(lat)
    lon = float(lon)
    if lat < sw_lat or lat > ne_lat or lon < sw_lon or lon > ne_lon:
        return None

    width, height = canvas_size
    lon_span = ne_lon - sw_lon
    sw_mercator_y = lat_to_mercator_y(sw_lat)
    ne_mercator_y = lat_to_mercator_y(ne_lat)
    mercator_span = ne_mercator_y - sw_mercator_y
    if lon_span <= 0 or mercator_span <= 0:
        return None

    x = int((lon - sw_lon) / lon_span * (width - 1))
    mercator_y = lat_to_mercator_y(lat)
    y = int((ne_mercator_y - mercator_y) / mercator_span * (height - 1))
    if x < 0 or x >= width or y < 0 or y >= height:
        return None
    return x, y


def render_h5_file(h5file, bounds, canvas_size, pixels):
    kept = 0

    with h5py.File(h5file, 'r') as handle:
        data_fields = handle.get('HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields')
        if data_fields is None:
            print('  SKIP: missing Data Fields')
            return 0

        dnb_data = _find_dataset(data_fields, [
            'DNB_BRDF-Corrected_NTL',
            'Gap_Filled_DNB_BRDF-Corrected_NTL'
        ])
        lat_data = _find_dataset(data_fields, ['lat'])
        lon_data = _find_dataset(data_fields, ['lon'])
        if dnb_data is None or lat_data is None or lon_data is None:
            print('  SKIP: missing DNB/lat/lon dataset')
            return 0

        lat_count = int(dnb_data.shape[0])
        lon_count = int(dnb_data.shape[1])
        lats = lat_data[:]
        lons = lon_data[:]
        if lats.shape[0] != lat_count or lons.shape[0] != lon_count:
            print('  SKIP: unexpected coordinate shape')
            return 0

        for row_start in range(0, lat_count, ROW_BLOCK_SIZE):
            row_end = min(lat_count, row_start + ROW_BLOCK_SIZE)
            dnb_block = dnb_data[row_start:row_end, :]

            for local_row, row_values in enumerate(dnb_block):
                lat_value = float(lats[row_start + local_row])
                if lat_value < bounds[0][0] or lat_value > bounds[1][0]:
                    continue

                valid_mask = np.isfinite(row_values) & (row_values >= 0)
                if not np.any(valid_mask):
                    continue

                valid_cols = np.where(valid_mask)[0]
                for col_index in valid_cols.tolist():
                    lon_value = float(lons[col_index])
                    if lon_value < bounds[0][1] or lon_value > bounds[1][1]:
                        continue

                    intensity_value = float(row_values[col_index])
                    if intensity_value < LIGHT_THRESHOLD:
                        continue

                    canvas_xy = point_to_canvas({'lat': lat_value, 'lon': lon_value}, bounds, canvas_size)
                    if canvas_xy is None:
                        continue

                    x, y = canvas_xy
                    draw_point(pixels, canvas_size[0], canvas_size[1], x, y, get_night_color(intensity_value), POINT_RADIUS)
                    kept += 1

    return kept


def render_day(day_key, h5files, bounds, canvas_size):
    image = Image.new('RGBA', canvas_size, (0, 0, 0, 0))
    pixels = image.load()
    kept = 0

    for h5file in h5files:
        tile_id = vnp.extract_tile_id(h5file.name)
        print(f'  H5: {h5file.name}' + (f' [{tile_id}]' if tile_id else ''))
        kept += render_h5_file(h5file, bounds, canvas_size, pixels)

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    out_name = f'radiance_image_{day_key.replace("-", "")}.png'
    out_path = IMAGE_DIR / out_name
    image.save(out_path, optimize=True)

    return {
        'date': day_key,
        'image': f'leaflet-index/radiance_images/{out_name}',
        'bounds': bounds,
        'count': kept,
        'size': [canvas_size[0], canvas_size[1]]
    }


def main():
    bounds = parse_target_bounds()
    canvas_size = get_target_size()
    files_by_day = collect_h5_files()
    generated_at = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    print(f'Found {sum(len(items) for items in files_by_day.values())} H5 files across {len(files_by_day)} days')
    print(f'Target bounds: {bounds}')
    print(f'Canvas size: {canvas_size[0]}x{canvas_size[1]}')

    if not files_by_day:
        print('No H5 files found; nothing to render.')
        return

    entries = []
    total_points = 0
    times = []

    for day_key in sorted(files_by_day.keys()):
        print(f'Rendering day: {day_key}')
        entry = render_day(day_key, files_by_day[day_key], bounds, canvas_size)
        entries.append(entry)
        times.append(f'{day_key}T12:00')
        total_points += entry['count']
        print(f"  -> {entry['count']} points, saved {entry['image']}")

    image_metadata = {
        'type': 'radiance-image-overlay',
        'generatedAt': generated_at,
        'entries': entries,
    }

    data_metadata = {
        'region': 'FixedGlobalFrame',
        'generatedAt': generated_at,
        'bounds': bounds,
        'times': times,
        'totalPoints': total_points,
        'source': 'NOAA VNP46A2',
        'description': '夜光数据已直接由H5渲染为图片叠加层',
        'exportScope': 'direct-h5-overlay',
        'pixelStride': 1,
        'maxPointsPerFile': 0,
        'lightThreshold': LIGHT_THRESHOLD,
        'includeNoData': False,
        'noDataStride': 16,
    }

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_DIR / 'radiance_images_metadata.json', 'w', encoding='utf-8') as f:
        json.dump(image_metadata, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_DIR / 'radiance_data_metadata.json', 'w', encoding='utf-8') as f:
        json.dump(data_metadata, f, ensure_ascii=False, indent=2)

    print(f'Saved: radiance_images_metadata.json ({len(entries)} entries)')
    print(f'Saved: radiance_data_metadata.json ({len(times)} times, {total_points} points)')


if __name__ == '__main__':
    main()
