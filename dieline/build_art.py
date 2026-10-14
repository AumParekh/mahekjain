"""Reference mockup -> flat, evenly coloured 600 dpi panel artwork (7 x 15 cm).
1. crop each panel inside the mockup's 3D bevel/shadow
2. add the extra height by mirroring blank background rows (no stretching)
3. level the lighting gradient so the pink (and cream) background is one even colour
4. upscale to 600 dpi
"""
from PIL import Image, ImageFilter
import numpy as np, os
from scipy.ndimage import gaussian_filter
here = os.path.dirname(os.path.abspath(__file__))
P = lambda *n: os.path.join(here, *n)
ref = Image.open(P('source', 'milda_reference.jpg')).convert('RGB')
F = np.asarray(ref.crop((58, 101, 598, 1164)))
B = np.asarray(ref.crop((668, 100, 1211, 1165)))

def grow(a, ops):
    """ops: ('top', n) mirror-prepend n rows from the top edge;
            ('mid', y0, y1, k) insert 2k rows inside blank band y0..y1 by reflecting rows
            (continuous at both seams, pattern is mirrored not stretched)."""
    pieces, prev = [], 0
    for op in sorted(ops, key=lambda o: 0 if o[0] == 'top' else o[1]):
        if op[0] == 'top':
            n = op[1]; pieces.append(a[1:n + 1][::-1]); prev = 0
        else:
            _, y0, y1, k = op
            m = y1 + 1                            # reflect about the band's lower edge
            assert k <= y1 - y0 + 1
            pieces.append(a[prev:m])
            down = a[m - k:m][::-1]               # rows m-1 .. m-k  (mirror going up the band)
            pieces.append(down); pieces.append(down[::-1])   # and back again
            prev = m
    pieces.append(a[prev:])
    return np.concatenate(pieces, 0)

F2 = grow(F, [('top', 46), ('mid', 217, 252, 24)])
B2 = grow(B, [('mid', 179, 194, 14), ('mid', 285, 305, 18), ('mid', 871, 879, 9), ('mid', 941, 949, 8)])
print(F2.shape, B2.shape)

def level(a, cls, target, sigma):
    """Shift pixels of one colour class so its local average equals `target`."""
    a = a.astype(float)
    m = cls(a).astype(float)
    m = gaussian_filter(m, 0.8)                   # soft mask, avoids halos at edges
    w = (m > 0.99).astype(float)
    num = np.stack([gaussian_filter(a[..., i] * w, sigma) for i in range(3)], -1)
    den = gaussian_filter(w, sigma)[..., None]
    local = num / np.maximum(den, 1e-4)
    ok = (den > 0.002)
    corr = np.where(ok, target - local, 0) * m[..., None]
    return np.clip(a + corr, 0, 255)

pink = lambda a: (a[..., 0] > 205) & (a[..., 1] > 110) & (a[..., 1] < 195) & (a[..., 2] > 150) & (a[..., 2] < 225) & (a[..., 0] - a[..., 1] > 50)
pink_loose = lambda a: (a[..., 0] > 205) & (a[..., 1] > 110) & (a[..., 1] < 215) & (a[..., 2] > 150) & (a[..., 2] < 235) & (a[..., 0] - a[..., 1] > 35) & (a.min(-1) < 215)
cream = lambda a: (a.min(-1) > 222) & (a[..., 0] - a[..., 2] < 40) & (a[..., 0] - a[..., 2] > 8)
TP = np.array([252.0, 167.0, 206.0])              # target pink (front's median, = flap colour)
fa = F2.astype(float); fp = fa[pink(fa)]
TC = np.median(B2.astype(float)[cream(B2.astype(float))], 0); print('target cream', TC)

F3 = level(F2, pink, TP, 45)
B3 = level(level(B2, pink, TP, 22), pink, TP, 6)   # 2nd tight pass for the narrow border strips
B3 = level(B3, pink_loose, TP, 1.5)            # flatten the lighting gradient inside the thin border strips
B3 = level(B3, cream, TC, 60)
for name, arr in (('front', F3), ('back', B3)):
    im = Image.fromarray(arr.round().astype(np.uint8))
    im.save(P(f'milda_{name}_art.png'))
    w, h = im.size
    up = im.resize((1654, 3543), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    up.save(P(f'milda_{name}_art_600dpi.png'), dpi=(600, 600))
    print(name, im.size, 'aspect', round(h / w, 4), 'target', round(15 / 7, 4))
