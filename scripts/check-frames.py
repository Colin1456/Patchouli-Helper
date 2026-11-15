"""宣传片静帧体检：用「只有背景」的参照帧做差分，量出前景内容的真实包围盒。

用法：
  python scripts/check-frames.py promo/out/bed.png promo/out/f60.png ...

这个模型看不到图，所以用数值代替肉眼：
- 前景 bbox 贴到画布边缘 24px 内 → 有被裁掉的风险
- 每格墨水分布（8 行 × 12 列）→ 看出内容是否偏在一边、有大片空白 / 有没有溢出
- 差分像素占比太低 → 画面可能没渲染出东西
"""
import sys
from PIL import Image

SAFE = 26
DIFF = 34


def load(path):
    img = Image.open(path).convert('RGB')
    return img, img.size


def analyze(path, bed):
    img, (w, h) = load(path)
    px = img.load()
    bpx = bed.load()
    assert bed.size == img.size, f'参照帧尺寸不一致: {bed.size} vs {img.size}'

    minx, miny, maxx, maxy = w, h, -1, -1
    grid = [[0] * 12 for _ in range(8)]
    edge = {'left': 0, 'right': 0, 'top': 0, 'bottom': 0}
    ink = 0
    step = 3
    samples = 0
    for y in range(0, h, step):
        row = min(7, y * 8 // h)
        for x in range(0, w, step):
            samples += 1
            a, b = px[x, y], bpx[x, y]
            if abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) <= DIFF:
                continue
            ink += 1
            grid[row][min(11, x * 12 // w)] += 1
            minx, maxx = min(minx, x), max(maxx, x)
            miny, maxy = min(miny, y), max(maxy, y)
            if x < SAFE:
                edge['left'] += 1
            if x > w - SAFE:
                edge['right'] += 1
            if y < SAFE:
                edge['top'] += 1
            if y > h - SAFE:
                edge['bottom'] += 1

    print(f'== {path.split("/")[-1]}  {w}x{h}  content={ink / samples:.1%}')
    if maxx < 0:
        print('   [!] 与纯背景几乎无差异：这一帧可能没渲染出内容')
        return
    print(f'   bbox=({minx},{miny})-({maxx},{maxy})  margins L={minx} R={w - maxx} T={miny} B={h - maxy}')
    hot = {k: v for k, v in edge.items() if v}
    if hot:
        print(f'   [!] 26px 贴边像素: {hot}')
    print('   ink grid (8x12):')
    for r in grid:
        print('     ' + ' '.join(f'{v:4d}' for v in r))


bed, _ = load(sys.argv[1])
for p in sys.argv[2:]:
    try:
        analyze(p, bed)
    except Exception as exc:  # noqa: BLE001
        print(f'!! {p}: {exc}')
