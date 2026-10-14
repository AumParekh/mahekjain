"""Reference mockup -> flat, evenly coloured 600 dpi panel artwork (7 x 15 cm).
1. crop each panel inside the mockup's 3D bevel/shadow
2. add the extra height by mirroring blank background rows (no stretching)
3. level the lighting gradient so the pink (and cream) background is one even colour
4. upscale to 600 dpi
"""
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import numpy as np, os
from scipy.ndimage import gaussian_filter
here = os.path.dirname(os.path.abspath(__file__))
P = lambda *n: os.path.join(here, *n)
ref = Image.open(P('source', 'milda_reference.jpg')).convert('RGB')
F = np.asarray(ref.crop((58, 101, 598, 1164)))
B = np.asarray(ref.crop((668, 100, 1211, 1165)))


FONT = P('source', 'fonts', 'Figtree.ttf')          # closest match to the pack's sans (OFL, Google Fonts)
def font(px, wght):
    f = ImageFont.truetype(FONT, px); f.set_variation_by_axes([wght]); return f

def text_layer(txt, px, wght, color, track=0.0, ss=4):
    """Anti-aliased text -> (RGBA array, baseline row, left bearing). Drawn 4x then reduced."""
    f = font(px * ss, wght)
    wid = sum(f.getlength(ch) + track * ss for ch in txt) + 8 * ss
    hgt = int(px * 2 * ss)
    im = Image.new('L', (int(wid), hgt), 0); d = ImageDraw.Draw(im)
    x = 4 * ss; base = int(px * 1.4 * ss)
    for ch in txt:
        d.text((x, base), ch, font=f, fill=255, anchor='ls'); x += f.getlength(ch) + track * ss
    im = im.resize((im.width // ss, im.height // ss), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.45))
    a = np.asarray(im).astype(float) / 255
    return a, base // ss, 4

def put_text(arr, txt, x, baseline, px, wght, color, track=0.0, center=False):
    a, base, lb = text_layer(txt, px, wght, color, track)
    w = a.shape[1]
    x0 = int(round(x - (w - 8) / 2 - lb)) if center else int(round(x - lb))
    y0 = baseline - base
    reg = arr[y0:y0 + a.shape[0], x0:x0 + w].astype(float)
    arr[y0:y0 + a.shape[0], x0:x0 + w] = (reg * (1 - a[..., None]) + np.array(color) * a[..., None]).round().astype(np.uint8)

def fill_bg(arr, x0, x1, y0, y1, ref_y0, ref_y1):
    """Replace a box with the per-column median of blank reference rows (plain cream/pink)."""
    med = np.median(arr[ref_y0:ref_y1, x0:x1].astype(float), axis=0)
    arr[y0:y1, x0:x1] = np.tile(med, (y1 - y0, 1, 1)).round().astype(np.uint8)

def dark_colour(arr, y0, y1, x0, x1, thr):
    reg = arr[y0:y1, x0:x1].reshape(-1, 3).astype(float); lum = reg.mean(1)
    return tuple(int(v) for v in np.median(reg[lum < thr], 0))

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


# ---- copy corrections on the back (raw crop coordinates) ----------------------
B = B.copy()
BROWN_B = (30, 20, 16)                                  # regular footer text colour (darkest printed pixels ~27)
# (1) "Nova Nowa" -> "Nova Nova": reuse the printed word "Nova" (x 178-212) over "Nowa" (x 216-258)
bold = (975, 990)
word = B[bold[0]:bold[1], 178:213].copy()
fill_bg(B, 214, 262, bold[0], bold[1], 1004, 1012)
B[bold[0]:bold[1], 216:216 + word.shape[1]] = word
# (2) "MiLda" -> "Milda": rebuild the word, turning the L into a lowercase l
L0, L1 = 190, 216
line = B[L0:L1].copy()
l_glyph = line[:, 102:106].copy()                         # crisp stem of the old L (x 103-104) ...
l_glyph[:, 3] = line[:, 100]                              # ... without its foot
l_glyph[194 - L0] = l_glyph[195 - L0]                     # lowercase l rises one row above the cap height
delta = 6                                               # "L" (wider) -> "l": the rest of the line closes up by this
Mi = line[:, 80:102].copy(); da = line[:, 113:136].copy(); tail = line[:, 138:497].copy()
fill_bg(B, 70, 505, L0, L1, 179, 190)
sh = delta // 2                                         # keep the line optically centred
B[L0:L1, 80 + sh:80 + sh + Mi.shape[1]] = Mi
B[L0:L1, 102 + sh:102 + sh + 4] = l_glyph
B[L0:L1, 113 - delta + sh:113 - delta + sh + da.shape[1]] = da
tx = 138 - delta + sh; B[L0:L1, tx:tx + tail.shape[1]] = tail
# (3) Net weight "-" -> "40 g"
fill_bg(B, 66, 106, 991, 1003, 1006, 1014)
put_text(B, '40 g', 86, 1002, 15, 560, BROWN_B, track=0.3, center=True)
# (4) Best before value -> placeholder date
fill_bg(B, 396, 520, 976, 996, 1005, 1013)
put_text(B, 'DD/MM/YYYY', 399, 989, 15, 560, BROWN_B, track=0.3)

# front: 30 + 2*12 + 2*20 = 94 extra rows (top margin, space under the tagline, space under WAFFLEBAR)
F2 = grow(F, [('top', 30), ('mid', 217, 252, 12), ('mid', 1023, 1042, 20)])
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
F3 = F3.round().astype(np.uint8)
# ---- front additions ------------------------------------------------------------
INK_TAG = dark_colour(F3, 226, 247, 28, 512, 110)      # tagline brown
INK_BAR = dark_colour(F3, 1040, 1074, 85, 470, 90)     # WAFFLEBAR brown
put_text(F3, 'SINGLE-ORIGIN KARAVALI COCOA', 270, 276, 19, 700, INK_TAG, track=1.8, center=True)
put_text(F3, '40 g', 275, 1124, 24, 700, INK_BAR, track=0.5, center=True)
for name, arr in (('front', F3), ('back', B3)):
    im = Image.fromarray(arr if arr.dtype == np.uint8 else arr.round().astype(np.uint8))
    im.save(P(f'milda_{name}_art.png'))
    w, h = im.size
    up = im.resize((1654, 3543), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    up.save(P(f'milda_{name}_art_600dpi.png'), dpi=(600, 600))
    print(name, im.size, 'aspect', round(h / w, 4), 'target', round(15 / 7, 4))
