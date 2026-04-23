#!/usr/bin/env python3
"""
Stitch per-tile PNGs into per-year composite frames for fast web animation.

Run from the project root:
    pip install Pillow
    python scripts/render_frames.py

Output:
    public/frames/{band}/{year}.png   — one RGBA frame per year per band
    public/frames/meta.json           — geographic bounds of each frame
"""

import json
import math
from pathlib import Path

from PIL import Image

# ── Config ────────────────────────────────────────────────────────────────────

TILE_DIR  = Path("public/tiles")
FRAME_DIR = Path("public/frames")
ZOOM      = 11        # mid-range; gives 1024×1024 output for this area
TILE_SIZE = 256

# ── Tile math ─────────────────────────────────────────────────────────────────

def lon_to_tile(lon: float, z: int) -> int:
    return int((lon + 180) / 360 * 2**z)

def lat_to_tile(lat: float, z: int) -> int:
    lat_r = math.radians(lat)
    return int((1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * 2**z)

def tile_to_lon(x: int, z: int) -> float:
    return x / 2**z * 360 - 180

def tile_to_lat(y: int, z: int) -> float:
    n = math.pi - 2 * math.pi * y / 2**z
    return math.degrees(math.atan(math.sinh(n)))

# ── Load manifest ─────────────────────────────────────────────────────────────

manifest = json.loads((TILE_DIR / "manifest.json").read_text())
years    = manifest["years"]
w, s, e, n = manifest["bounds"]   # [west, south, east, north]

# Tile index range covering the bounding box at ZOOM
tx_min = lon_to_tile(w, ZOOM)
tx_max = lon_to_tile(e, ZOOM)
ty_min = lat_to_tile(n, ZOOM)     # north → smaller tile y
ty_max = lat_to_tile(s, ZOOM)     # south → larger tile y

# Exact geo bounds of the outermost tile edges (used for BitmapLayer positioning)
frame_west  = tile_to_lon(tx_min,     ZOOM)
frame_east  = tile_to_lon(tx_max + 1, ZOOM)
frame_north = tile_to_lat(ty_min,     ZOOM)
frame_south = tile_to_lat(ty_max + 1, ZOOM)

img_w = (tx_max - tx_min + 1) * TILE_SIZE
img_h = (ty_max - ty_min + 1) * TILE_SIZE

print(f"Zoom {ZOOM}  |  x {tx_min}–{tx_max}  |  y {ty_min}–{ty_max}  |  {img_w}×{img_h} px")
print(f"Frame bounds: W={frame_west:.4f} S={frame_south:.4f} E={frame_east:.4f} N={frame_north:.4f}")

# Write meta.json so the React component knows where to place each frame
FRAME_DIR.mkdir(exist_ok=True)
(FRAME_DIR / "meta.json").write_text(json.dumps({
    "bounds": [frame_west, frame_south, frame_east, frame_north],
    "zoom":   ZOOM,
    "width":  img_w,
    "height": img_h,
}, indent=2))

# ── Stitch tiles ──────────────────────────────────────────────────────────────

bands = ("ndvi", "nbr")

for band in bands:
    out_dir = FRAME_DIR / band
    out_dir.mkdir(parents=True, exist_ok=True)

    for year in years:
        canvas = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
        placed = 0

        for tx in range(tx_min, tx_max + 1):
            for ty in range(ty_min, ty_max + 1):
                src = TILE_DIR / band / str(year) / str(ZOOM) / str(tx) / f"{ty}.png"
                if not src.exists():
                    continue
                tile = Image.open(src).convert("RGBA")
                x_off = (tx - tx_min) * TILE_SIZE
                y_off = (ty - ty_min) * TILE_SIZE
                canvas.paste(tile, (x_off, y_off), tile)
                placed += 1

        out = out_dir / f"{year}.png"
        canvas.save(out, optimize=True)
        print(f"  {band}/{year}  ({placed} tiles)  →  {out}")

print("\nDone. Run your dev server and open the hobet page.")
