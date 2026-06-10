#!/usr/bin/env python3
"""Render daily radiance JSON into transparent PNG overlays for fast map switching."""

import json
import os
from pathlib import Path
from typing import Dict, Tuple

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = Path(os.getenv("RADIANCE_INPUT_DIR", PROJECT_ROOT / "public" / "leaflet-index")).expanduser().resolve()
OUTPUT_DIR = Path(os.getenv("RADIANCE_IMAGE_OUTPUT_DIR", INPUT_DIR / "radiance_images")).expanduser().resolve()
IMAGE_WIDTH = max(512, int(os.getenv("RADIANCE_IMAGE_WIDTH", "4096")))
POINT_RADIUS = max(0, int(os.getenv("RADIANCE_POINT_RADIUS", "1")))
ALPHA = max(1, min(255, int(os.getenv("RADIANCE_ALPHA", "220"))))
TARGET_BOUNDS = [[10.0, 110.0], [40.0, 130.0]]


def get_target_size() -> Tuple[int, int]:
    sw_lat, sw_lon = TARGET_BOUNDS[0]
    ne_lat, ne_lon = TARGET_BOUNDS[1]
    lat_span = ne_lat - sw_lat
    lon_span = ne_lon - sw_lon
    height = max(512, int(round(IMAGE_WIDTH * (lat_span / lon_span))))
    return IMAGE_WIDTH, height


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


def is_date_file(path: Path) -> bool:
    name = path.name
    return name.startswith("radiance_data_") and name.endswith(".json") and "timeseries" not in name and "metadata" not in name


def date_from_name(path: Path) -> str:
    date_part = path.stem.replace("radiance_data_", "")
    return f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"


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


def render_one_file(path: Path) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        points = json.load(f)

    sw_lat, sw_lon = TARGET_BOUNDS[0]
    ne_lat, ne_lon = TARGET_BOUNDS[1]
    lat_span = ne_lat - sw_lat
    lon_span = ne_lon - sw_lon
    image_width, image_height = get_target_size()

    image = Image.new("RGBA", (image_width, image_height), (0, 0, 0, 0))
    pixels = image.load()
    kept = 0

    for p in points:
        intensity = p.get("intensity")
        status = str(p.get("pixelStatus") or "").upper()
        lat = p.get("lat")
        lon = p.get("lon")

        if status and status != "LIGHT":
            continue
        if not isinstance(intensity, (int, float)) or float(intensity) < 8:
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue

        x = int((float(lon) - sw_lon) / lon_span * (image_width - 1))
        y = int((ne_lat - float(lat)) / lat_span * (image_height - 1))
        color = get_night_color(float(intensity))
        draw_point(pixels, image_width, image_height, x, y, color, POINT_RADIUS)
        kept += 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    date_key = path.stem.replace("radiance_data_", "")
    out_name = f"radiance_image_{date_key}.png"
    out_path = OUTPUT_DIR / out_name
    image.save(out_path, optimize=True)

    return {
        "date": date_from_name(path),
        "image": f"leaflet-index/radiance_images/{out_name}",
        "bounds": TARGET_BOUNDS,
        "count": kept,
        "size": [image_width, image_height],
    }


def main():
    files = sorted([p for p in INPUT_DIR.glob("radiance_data_*.json") if is_date_file(p)])
    print(f"Found {len(files)} date files")

    entries = []
    for p in files:
        print(f"Rendering: {p.name}")
        entry = render_one_file(p)
        print(f"  -> {entry['count']} points, image={entry['size'][0]}x{entry['size'][1]}")
        entries.append(entry)

    metadata = {
        "type": "radiance-image-overlay",
        "entries": entries,
    }

    metadata_path = INPUT_DIR / "radiance_images_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"Saved metadata: {metadata_path.name}")


if __name__ == "__main__":
    main()
