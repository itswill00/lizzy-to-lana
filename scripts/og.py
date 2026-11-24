#!/usr/bin/env python3
"""Generate typographic Open Graph cards, favicons, and the web manifest icons.

The cards are deliberately not photographs: they are set in the archive's
self-hosted typefaces and carry only the page title, a short descriptor, and
the site name.

Usage: python3 scripts/og.py
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "src" / "data.json"
FONT_DIR = ROOT / "assets" / "fonts"
CACHE_DIR = ROOT / ".cache" / "fonts"
OG_DIR = ROOT / "dist" / "assets" / "og"
ICON_DIR = ROOT / "dist" / "assets" / "icons"

W, H = 1200, 630
MARGIN = 74

MIDNIGHT = (18, 23, 38)
MIDNIGHT_2 = (27, 34, 53)
BURGUNDY = (90, 31, 43)
CREAM = (246, 238, 226)
CREAM_DIM = (201, 187, 174)
GOLD = (224, 164, 88)
ROSE = (201, 143, 139)

DISPLAY = "cormorant-garamond-latin"
SANS = "inter-latin"


def ensure_ttf(name: str) -> str:
    """Convert a WOFF2 file to TTF for Pillow, caching the result."""

    cached = CACHE_DIR / f"{name}.ttf"
    if cached.exists():
        return str(cached)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from fontTools.ttLib import TTFont

        font = TTFont(str(FONT_DIR / f"{name}.woff2"))
        font.flavor = None
        font.save(str(cached))
        return str(cached)
    except Exception:
        fallbacks = {
            DISPLAY: "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            SANS: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        }
        return fallbacks[name]


DISPLAY_TTF = ensure_ttf(DISPLAY)
SANS_TTF = ensure_ttf(SANS)


def display(size: int, weight: int = 600) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(DISPLAY_TTF, size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def sans(size: int, weight: int = 500) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(SANS_TTF, size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def fit_title(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    max_lines: int,
    start: int = 104,
    minimum: int = 58,
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    size = start
    while size >= minimum:
        font = display(size, 600)
        lines = wrap(draw, text, font, max_width)
        widest = max((draw.textlength(line, font=font) for line in lines), default=0)
        if len(lines) <= max_lines and widest <= max_width:
            return font, lines
        size -= 2

    font = display(minimum, 600)
    return font, wrap(draw, text, font, max_width)


def tracked(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int = 3,
) -> None:
    x, y = position
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + tracking


def tracked_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, tracking: int = 3) -> float:
    return sum(draw.textlength(char, font=font) for char in text) + tracking * max(0, len(text) - 1)


def backdrop() -> Image.Image:
    image = Image.new("RGB", (W, H), MIDNIGHT)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # A soft burgundy glow, built from concentric translucent circles.
    for radius in range(460, 0, -8):
        alpha = int(34 * (1 - radius / 460) ** 1.6)
        if alpha <= 0:
            continue
        draw.ellipse(
            (W - 230 - radius, -160 - radius, W - 230 + radius, -160 + radius),
            fill=(*BURGUNDY, alpha),
        )

    for radius in range(300, 0, -8):
        alpha = int(22 * (1 - radius / 300) ** 1.8)
        if alpha <= 0:
            continue
        draw.ellipse(
            (120 - radius, H + 90 - radius, 120 + radius, H + 90 + radius),
            fill=(*GOLD, alpha),
        )

    image = Image.alpha_composite(image.convert("RGBA"), overlay)

    # Fine vertical rule, a quiet piece of structure.
    draw = ImageDraw.Draw(image, "RGBA")
    draw.line((W - 190, 0, W - 190, H - 122), fill=(*CREAM, 18), width=1)
    draw.line((0, H - 122, W, H - 122), fill=(*GOLD, 74), width=1)

    # A faint ring, not a photograph and not a logo.
    draw.ellipse((W - 330, 70, W - 30, 370), outline=(*ROSE, 26), width=1)
    draw.ellipse((W - 290, 110, W - 70, 330), outline=(*GOLD, 18), width=1)

    return image.convert("RGB")


def card(kicker: str, title: str, subtitle: str, accent: tuple[int, int, int] = GOLD) -> Image.Image:
    image = backdrop()
    draw = ImageDraw.Draw(image, "RGBA")

    # Wordmark
    draw.text((MARGIN, 56), "Lizzy to Lana", font=display(38, 600), fill=CREAM)
    label = "A FAN ARCHIVE"
    label_font = sans(13, 600)
    tracked(draw, (W - MARGIN - tracked_width(draw, label, label_font, 4), 68), label, label_font, GOLD, 4)

    # Accent rule
    draw.line((MARGIN, 132, MARGIN + 92, 132), fill=accent, width=3)

    # Kicker
    kicker_font = sans(15, 600)
    tracked(draw, (MARGIN, 164), kicker.upper(), kicker_font, accent, 4)

    # Title
    title_font, lines = fit_title(draw, title, W - MARGIN * 2 - 40, 3, start=104, minimum=56)
    line_height = int(title_font.size * 1.02)
    y = 208

    for line in lines:
        draw.text((MARGIN, y), line, font=title_font, fill=CREAM)
        y += line_height

    # Subtitle
    subtitle_font = sans(24, 400)
    subtitle_lines = wrap(draw, subtitle, subtitle_font, W - MARGIN * 2 - 120)[:2]
    y += 22

    for line in subtitle_lines:
        draw.text((MARGIN, y), line, font=subtitle_font, fill=CREAM_DIM)
        y += 36

    # Footer
    footer_font = sans(17, 500)
    draw.text((MARGIN, H - 78), "blog.wldnanatayya.com", font=footer_font, fill=CREAM_DIM)

    footer_note = "UNOFFICIAL · SOURCES · CREDITS"
    note_font = sans(12, 600)
    tracked(
        draw,
        (W - MARGIN - tracked_width(draw, footer_note, note_font, 3), H - 74),
        footer_note,
        note_font,
        GOLD,
        3,
    )

    return image


def icon(size: int) -> Image.Image:
    scale = 4
    big = size * scale
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (0, 0, big - 1, big - 1),
        radius=int(big * 0.22),
        fill=(*MIDNIGHT, 255),
    )
    draw.ellipse(
        (int(big * 0.14), int(big * 0.14), int(big * 0.86), int(big * 0.86)),
        fill=(*BURGUNDY, 255),
    )

    font = display(int(big * 0.52), 600)
    letter = "L"
    box = draw.textbbox((0, 0), letter, font=font)
    lw = box[2] - box[0]
    lh = box[3] - box[1]
    draw.text(
        ((big - lw) / 2 - box[0], (big - lh) / 2 - box[1] - big * 0.02),
        letter,
        font=font,
        fill=(*CREAM, 255),
    )

    draw.ellipse(
        (int(big * 0.68), int(big * 0.68), int(big * 0.74), int(big * 0.74)),
        fill=(*GOLD, 255),
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def tr(ui: dict, key: str, **vars) -> str:
    value = ui.get(key)
    if not isinstance(value, str) or not value.strip():
        raise KeyError(f"missing OG translation key: {key}")
    for name, replacement in vars.items():
        value = value.replace("{" + name + "}", str(replacement))
    return value


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    config = json.loads((ROOT / "src" / "i18n.json").read_text(encoding="utf-8"))
    OG_DIR.mkdir(parents=True, exist_ok=True)
    ICON_DIR.mkdir(parents=True, exist_ok=True)

    eras = data["eras"]
    albums = data["albums"]
    photos = [p for p in data["photos"] if not p.get("placeholder")]
    site = data["site"]

    for item in config["locales"]:
        if not item["enabled"]:
            continue
        code = item["code"]
        loc = json.loads((ROOT / "src" / "locales" / f"{code}.json").read_text(encoding="utf-8"))
        ui = loc["ui"]
        pages = loc["pages"]
        out_dir = OG_DIR / code
        out_dir.mkdir(parents=True, exist_ok=True)
        cards: dict[str, Image.Image] = {}

        cards["home"] = card(
            tr(ui, "ogHomeKicker"),
            site["name"],
            tr(ui, "ogHomeDesc", tagline=loc["site"]["tagline"]),
            GOLD,
        )
        cards["journey"] = card(
            tr(ui, "ogJourneyKicker"),
            pages["journey"]["title"],
            tr(ui, "ogJourneyDesc", count=len(eras), years=f"{eras[0]['years']}–{eras[-1]['years'][:4]}"),
            ROSE,
        )
        for index, era in enumerate(eras, start=1):
            count = len(era["albums"])
            cards[f"journey-{era['id']}"] = card(
                tr(ui, "ogEraKicker", index=f"{index:02d}", years=era["years"]),
                loc["eras"][era["id"]]["title"],
                f"{count} {tr(ui, 'releaseLabel' if count == 1 else 'releasesLabel')} · {loc['eras'][era['id']]['label']}",
                ROSE,
            )
        cards["gallery"] = card(
            tr(ui, "ogGalleryKicker"),
            pages["gallery"]["title"],
            tr(ui, "ogGalleryDesc", count=len(photos)),
            GOLD,
        )
        for era in eras:
            count = sum(1 for p in photos if p["era"] == era["id"])
            label = loc["eras"][era["id"]]["label"]
            cards[f"gallery-{era['id']}"] = card(
                tr(ui, "ogGalleryEraKicker", era=label.upper()),
                tr(ui, "ogGalleryEraTitle", era=label),
                tr(ui, "ogGalleryEraDesc", count=count, years=era["years"]),
                GOLD,
            )
        cards["discography"] = card(
            tr(ui, "ogDiscographyKicker"),
            pages["discography"]["title"],
            tr(ui, "ogDiscographyDesc"),
            GOLD,
        )
        for album in albums:
            status = tr(ui, "upcoming") if album.get("status") == "upcoming" else album.get("released", "")
            cards[f"discography-{album['id']}"] = card(
                tr(ui, "ogAlbumKicker", type=album["type"].upper()),
                album["title"],
                tr(ui, "ogAlbumDesc", year=album["year"], status=status, era=album["era"].replace("-", " ").title()),
                GOLD,
            )
        cards["fan-notes"] = card(
            tr(ui, "ogFanNotesKicker"),
            loc["fanNotes"]["title"],
            tr(ui, "ogFanNotesDesc"),
            ROSE,
        )
        cards["sources"] = card(
            tr(ui, "ogSourcesKicker"),
            pages["sources"]["title"],
            tr(ui, "ogSourcesDesc", refs=len(data["references"]), photos=len(photos)),
            GOLD,
        )
        cards["about"] = card(
            tr(ui, "ogAboutKicker"),
            loc["about"]["title"],
            tr(ui, "ogAboutDesc"),
            ROSE,
        )
        cards["search"] = card(
            tr(ui, "ogSearchKicker"),
            loc["search"]["title"],
            tr(ui, "ogSearchDesc"),
            GOLD,
        )
        cards["404"] = card(
            tr(ui, "og404Kicker"),
            loc["notFound"]["title"],
            tr(ui, "og404Desc"),
            ROSE,
        )
        for slug, image in cards.items():
            image.save(out_dir / f"{slug}.jpg", "JPEG", quality=90, optimize=True, subsampling=0)

    for size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
        icon(size).save(ICON_DIR / name, "PNG", optimize=True)

    print("og: multilingual cards and 3 icons")


if __name__ == "__main__":
    main()
