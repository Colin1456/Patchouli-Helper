"""Generates the app icons (PNG / ICO / ICNS) without any external assets."""

from PIL import Image, ImageDraw, ImageFilter
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src-tauri", "icons")
WEB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "assets")
os.makedirs(OUT, exist_ok=True)
os.makedirs(WEB, exist_ok=True)

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

# ---- background: purple gradient rounded square ----------------------------
grad = Image.new("RGBA", (S, S))
px = grad.load()
for y in range(S):
    for x in range(S):
        t = (x / S * 0.45 + y / S * 0.55)
        r = int(58 + (150 - 58) * t)
        g = int(32 + (110 - 32) * t)
        b = int(92 + (240 - 92) * t)
        px[x, y] = (r, g, b, 255)

mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)

# subtle top highlight
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([-S * 0.25, -S * 0.55, S * 0.9, S * 0.35], fill=(255, 255, 255, 60))
glow = glow.filter(ImageFilter.GaussianBlur(S * 0.05))
img.alpha_composite(Image.composite(glow, Image.new("RGBA", (S, S), (0, 0, 0, 0)), mask))

# ---- book -----------------------------------------------------------------
cw, ch = int(S * 0.52), int(S * 0.62)
cx, cy = (S - cw) // 2, int(S * 0.19)
cover = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
cd = ImageDraw.Draw(cover)
cd.rounded_rectangle([0, 0, cw - 1, ch - 1], radius=int(cw * 0.09), fill=(74, 41, 28, 255))
cd.rounded_rectangle([0, 0, cw - 1, ch - 1], radius=int(cw * 0.09), outline=(196, 150, 96, 255), width=int(S * 0.012))
# pages block
pad = int(cw * 0.11)
cd.rounded_rectangle([pad, pad, cw - pad, ch - pad], radius=int(cw * 0.04), fill=(247, 236, 210, 255))
cd.rounded_rectangle([pad, pad, cw - pad, ch - pad], radius=int(cw * 0.04), outline=(206, 178, 128, 255), width=int(S * 0.006))
# spine
cd.line([(cw // 2, pad), (cw // 2, ch - pad)], fill=(214, 186, 138, 255), width=int(S * 0.008))
# text lines
for i in range(6):
    y = pad + int((ch - 2 * pad) * (0.16 + i * 0.13))
    x0 = pad + int(cw * 0.09)
    x1 = cw - pad - int(cw * (0.09 if i % 2 else 0.2))
    cd.line([(x0, y), (x1, y)], fill=(150, 128, 92, 255), width=int(S * 0.007))

img.alpha_composite(cover, (cx, cy))

# ---- arrow (visualise "helper"/export) -------------------------------------
arrow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ad = ImageDraw.Draw(arrow)
ax, ay = int(S * 0.62), int(S * 0.63)
r = int(S * 0.075)
ad.rounded_rectangle([ax - r, ay - int(r * 0.42), ax + int(r * 1.1), ay + int(r * 0.42)], radius=int(r * 0.2), fill=(185, 140, 255, 255))
ad.polygon([(ax + int(r * 1.1), ay - int(r * 0.95)), (ax + int(r * 1.9), ay), (ax + int(r * 1.1), ay + int(r * 0.95))], fill=(185, 140, 255, 255))
img.alpha_composite(arrow)

def save(size, name):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))

save(32, "32x32.png")
save(128, "128x128.png")
save(256, "128x128@2x.png")
save(512, "icon.png")
img.resize((128, 128), Image.LANCZOS).save(os.path.join(WEB, "icon-128.png"))

img.save(os.path.join(OUT, "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
try:
    img.save(os.path.join(OUT, "icon.icns"), format="ICNS")
    print("icns ok")
except Exception as exc:  # pragma: no cover
    print("icns skipped:", exc)

print("icons written to", OUT)
