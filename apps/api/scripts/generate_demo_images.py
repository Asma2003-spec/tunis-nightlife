"""
Génère les images de démonstration des établissements fictifs.

Les images sont des visuels originaux (dégradés, halos lumineux, faisceaux),
créés de façon procédurale : aucune photo d'un lieu réel, aucun droit d'auteur tiers.

Usage :  python apps/api/scripts/generate_demo_images.py
Sortie : apps/api/media/demo/venues/<slug>/<0|1|2>.jpg  (1200 x 800)
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 1200, 800
OUT = Path(__file__).resolve().parent.parent / "media" / "demo" / "venues"

# Palette (fond haut, fond bas, couleurs de lumière) par type d'établissement
PALETTES = {
    "NIGHTCLUB": ((12, 6, 30), (40, 10, 70), [(139, 92, 246), (236, 72, 153), (56, 189, 248)]),
    "LOUNGE": ((14, 8, 20), (60, 24, 40), [(251, 191, 36), (167, 139, 250), (244, 114, 182)]),
    "BAR": ((10, 10, 18), (45, 20, 35), [(251, 146, 60), (167, 139, 250), (250, 204, 21)]),
    "ROOFTOP": ((8, 12, 35), (70, 40, 90), [(251, 191, 36), (167, 139, 250), (96, 165, 250)]),
    "BEACH_CLUB": ((10, 20, 45), (120, 60, 90), [(253, 186, 116), (45, 212, 191), (192, 132, 252)]),
}

VENUES = [
    ("nebuleuse-club", "NIGHTCLUB"),
    ("orbite-rooftop", "ROOFTOP"),
    ("lune-violette-lounge", "LOUNGE"),
    ("circuit-underground", "NIGHTCLUB"),
    ("sable-noir-beach", "BEACH_CLUB"),
    ("atelier-48", "BAR"),
    ("prisme-club", "NIGHTCLUB"),
    ("horizon-gammarth", "LOUNGE"),
]


def gradient(top, bottom):
    col = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1)
        col.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return col.resize((W, H))


def glow_layer(draw_fn, blur):
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def add(base, layer, strength=1.0):
    """Mélange additif (lumière)."""
    if strength != 1.0:
        layer = layer.point(lambda v: min(255, int(v * strength)))
    return ImageChops.add(base, layer)


def render(slug, kind, variant):
    rnd = random.Random(f"{slug}-{variant}")
    top, bottom, lights = PALETTES[kind]
    img = gradient(top, bottom)

    # Faisceaux lumineux depuis le haut (scène / projecteurs)
    def beams(d):
        for _ in range(rnd.randint(3, 6)):
            color = rnd.choice(lights)
            x0 = rnd.randint(100, W - 100)
            spread = rnd.randint(120, 320)
            x1 = x0 + rnd.randint(-400, 400)
            dim = tuple(int(c * 0.35) for c in color)
            d.polygon([(x0 - 8, 0), (x0 + 8, 0), (x1 + spread, H), (x1 - spread, H)], fill=dim)

    img = add(img, glow_layer(beams, 40), 0.8)

    # Grand halo central
    def halo(d):
        color = rnd.choice(lights)
        cx, cy = rnd.randint(300, 900), rnd.randint(250, 450)
        for r, k in ((420, 0.25), (260, 0.45), (140, 0.7)):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tuple(int(c * k) for c in color))

    img = add(img, glow_layer(halo, 90), 0.9)

    # Bokeh (lumières floues)
    def bokeh(d):
        for _ in range(rnd.randint(35, 60)):
            color = rnd.choice(lights)
            r = rnd.randint(8, 46)
            x, y = rnd.randint(0, W), rnd.randint(0, int(H * 0.8))
            k = rnd.uniform(0.35, 0.9)
            d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(c * k) for c in color))

    img = add(img, glow_layer(bokeh, 6), 0.8)

    # Petites lumières nettes (guirlandes / étoiles)
    def sparks(d):
        for _ in range(rnd.randint(60, 110)):
            color = rnd.choice(lights)
            x, y = rnd.randint(0, W), rnd.randint(0, int(H * 0.7))
            r = rnd.choice((1, 2, 2, 3))
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)

    img = add(img, glow_layer(sparks, 1), 1.0)

    # Ligne d'horizon / silhouettes au premier plan
    sil = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(sil)
    if kind in ("ROOFTOP", "BEACH_CLUB"):
        # Horizon de mer ou de ville
        base_y = int(H * 0.78)
        points = [(0, H)]
        x = 0
        while x <= W:
            h = rnd.randint(0, 60) if kind == "ROOFTOP" else int(8 * math.sin(x / 60))
            points.append((x, base_y - h))
            x += rnd.randint(30, 80)
        points.append((W, H))
        sd.polygon(points, fill=230)
    # Foule (têtes et épaules stylisées)
    for _ in range(rnd.randint(14, 22)):
        x = rnd.randint(-40, W + 40)
        hy = rnd.randint(int(H * 0.8), int(H * 0.9))
        r = rnd.randint(22, 34)
        sd.ellipse([x - r, hy - r, x + r, hy + r], fill=255)
        sd.rounded_rectangle([x - r * 2.2, hy + r * 0.6, x + r * 2.2, H + 40], radius=40, fill=255)
        if rnd.random() < 0.25:  # bras levé
            sd.line([(x + r, hy + r), (x + r * 2.2, hy - r * 2.5)], fill=255, width=14)
    sil = sil.filter(ImageFilter.GaussianBlur(1.5))
    img = Image.composite(Image.new("RGB", (W, H), (6, 5, 10)), img, sil)

    # Vignettage
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-200, -150, W + 200, H + 150], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(160))
    img = Image.composite(img, Image.new("RGB", (W, H), (0, 0, 0)), vig)

    path = OUT / slug / f"{variant}.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    return path


if __name__ == "__main__":
    for slug, kind in VENUES:
        for v in range(3):
            print("✓", render(slug, kind, v).relative_to(OUT.parent.parent.parent))
