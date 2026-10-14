#!/usr/bin/env python3
"""Draws the app icon (three tilted C-A-T letter tiles on a purple sky) and
writes the PNG sizes used for the iOS home screen and browser tab.
Run: python3 scripts/make-icons.py   (needs Pillow; macOS font path below)"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 1024  # draw big, shrink for crisp edges
FONT = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
OUT = os.path.join(os.path.dirname(__file__), "..", "icons")

def gradient():
    img = Image.new("RGB", (S, S))
    px = img.load()
    top, bot = (124, 58, 237), (236, 72, 153)  # violet -> pink
    for y in range(S):
        for x in range(S):
            t = min(1, max(0, (y * 0.8 + x * 0.2) / S))
            px[x, y] = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    return img

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)

def tile(letter, color, shade, angle, cx, cy, size=340):
    pad = 60
    layer = Image.new("RGBA", (size + pad * 2, size + pad * 2 + 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = 70
    # chunky bottom edge, then the face
    d.rounded_rectangle([pad, pad + 26, pad + size, pad + size + 26], r, fill=shade)
    d.rounded_rectangle([pad, pad, pad + size, pad + size], r, fill=color)
    d.rounded_rectangle([pad + 22, pad + 20, pad + size - 22, pad + 70], 26, fill=(255, 255, 255, 70))
    f = ImageFont.truetype(FONT, 250)
    bb = d.textbbox((0, 0), letter, font=f)
    tx = pad + size / 2 - (bb[0] + bb[2]) / 2
    ty = pad + size / 2 - (bb[1] + bb[3]) / 2 + 6
    d.text((tx + 5, ty + 7), letter, font=f, fill=(0, 0, 0, 50))
    d.text((tx, ty), letter, font=f, fill=(255, 255, 255, 255))
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    shadow.putalpha(layer.getchannel("A").point(lambda v: int(v * 0.35)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    return layer, shadow, (int(cx - layer.width / 2), int(cy - layer.height / 2))

def build():
    img = gradient().convert("RGBA")
    d = ImageDraw.Draw(img)
    star(d, 840, 170, 90, (255, 235, 120, 255))
    star(d, 170, 230, 46, (255, 255, 255, 230))
    star(d, 880, 800, 40, (255, 255, 255, 200))
    tiles = [
        ("C", (56, 189, 248), (14, 116, 168), -12, 270, 560),
        ("A", (255, 183, 3), (200, 120, 0), 4, 512, 520),
        ("T", (74, 222, 128), (22, 140, 70), 13, 755, 565),
    ]
    for t in tiles:
        layer, shadow, pos = tile(*t)
        img.alpha_composite(shadow, (pos[0] + 6, pos[1] + 18))
        img.alpha_composite(layer, pos)
    return img.convert("RGB")

def main():
    os.makedirs(OUT, exist_ok=True)
    big = build()
    for name, px in [("apple-touch-icon.png", 180), ("icon-192.png", 192),
                     ("icon-512.png", 512), ("favicon-32.png", 32)]:
        big.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
    big.resize((48, 48), Image.LANCZOS).save(os.path.join(OUT, "..", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote icons/")

main()
