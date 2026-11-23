#!/usr/bin/env python3
"""Generate responsive, content-hashed image variants for the archive.

Reads src/data.json, writes AVIF/WebP/JPEG variants to dist/assets/img/,
and records dimensions and paths in src/images.manifest.json for the
Node build step.

Usage: python3 scripts/images.py
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_avif  # noqa: F401  (registers the AVIF plugin)
except ImportError:  # pragma: no cover - AVIF is optional at build time
    pillow_avif = None


ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "src" / "data.json"
OUT_DIR = ROOT / "dist" / "assets" / "img"
MANIFEST_PATH = ROOT / "src" / "images.manifest.json"

# Target widths. The source width is always added as the largest variant,
# and no variant is ever upscaled.
WIDTHS = (360, 540, 800, 1100, 1400)

JPEG_QUALITY = 82
WEBP_QUALITY = 78
AVIF_QUALITY = 50


def digest(payload: bytes) -> str:
    return hashlib.sha1(payload).hexdigest()[:8]


def encode(image: Image.Image, fmt: str, path: Path) -> str:
    if fmt == "jpeg":
        image.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    elif fmt == "webp":
        image.save(path, "WEBP", quality=WEBP_QUALITY, method=6)
    elif fmt == "avif":
        image.save(path, "AVIF", quality=AVIF_QUALITY, speed=6)
    else:  # pragma: no cover
        raise ValueError(fmt)

    return digest(path.read_bytes())


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict] = {}
    total_bytes = 0
    generated = 0

    for photo in data["photos"]:
        source = photo.get("src")
        if not source:
            continue

        source_path = ROOT / source
        if not source_path.exists():
            raise SystemExit(f"Missing source image: {source_path}")

        with Image.open(source_path) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")

        width, height = image.size
        widths = sorted({w for w in WIDTHS if w < width} | {width})

        variants = []
        for target in widths:
            if target == width:
                resized = image
            else:
                ratio = target / width
                resized = image.resize(
                    (target, max(1, round(height * ratio))),
                    Image.Resampling.LANCZOS,
                )

            stem = f"{photo['id']}-{target}"
            entry = {
                "w": resized.width,
                "h": resized.height,
                "jpg": None,
                "webp": None,
                "avif": None,
            }

            jpg_path = OUT_DIR / f"{stem}.jpg"
            jpg_hash = encode(resized, "jpeg", jpg_path)
            final_jpg = OUT_DIR / f"{stem}.{jpg_hash}.jpg"
            jpg_path.replace(final_jpg)
            entry["jpg"] = f"/assets/img/{final_jpg.name}"

            webp_path = OUT_DIR / f"{stem}.webp"
            webp_hash = encode(resized, "webp", webp_path)
            final_webp = OUT_DIR / f"{stem}.{webp_hash}.webp"
            webp_path.replace(final_webp)
            entry["webp"] = f"/assets/img/{final_webp.name}"

            if pillow_avif is not None:
                avif_path = OUT_DIR / f"{stem}.avif"
                avif_hash = encode(resized, "avif", avif_path)
                final_avif = OUT_DIR / f"{stem}.{avif_hash}.avif"
                avif_path.replace(final_avif)
                entry["avif"] = f"/assets/img/{final_avif.name}"

            variants.append(entry)
            generated += 1

        largest = variants[-1]
        thumb = image.copy()
        thumb.thumbnail((24, 24), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        thumb.save(buffer, "JPEG", quality=38, optimize=True)
        lqip = base64.b64encode(buffer.getvalue()).decode("ascii")

        manifest[photo["id"]] = {
            "width": width,
            "height": height,
            "lqip": lqip,
            "variants": variants,
            "largest": {
                "jpg": largest["jpg"],
                "webp": largest["webp"],
                "avif": largest["avif"],
                "w": largest["w"],
                "h": largest["h"],
            },
        }

    for path in OUT_DIR.iterdir():
        if path.is_file() and path.suffix in {".jpg", ".webp", ".avif"}:
            total_bytes += path.stat().st_size

    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(
        f"images: {len(manifest)} photos, {generated} width variants, "
        f"{total_bytes / 1024 / 1024:.1f} MB total"
    )


if __name__ == "__main__":
    main()
