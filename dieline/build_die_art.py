"""Whole-die artwork with 3 mm bleed: milda_die_art_bleed_600dpi.jpg
 - pink pattern background under the entire die (flaps, side panels, glue flaps) + 3 mm bleed all round
 - the front artwork continues 3 mm past its outer cut edge (mirrored), so a print shift can't leave a white sliver
"""
import numpy as np, os
from PIL import Image, ImageFilter
from artlib import pattern_detail
Image.MAX_IMAGE_PIXELS = None
here = os.path.dirname(os.path.abspath(__file__)); P = lambda n: os.path.join(here, n)

PX = 600 / 2.54                       # px per cm at 600 dpi
BLEED = 0.3                           # cm
XMIN, XMAX, YMIN, YMAX = -BLEED, 17 + BLEED, -1.5 - BLEED, 15 + 1.5 + BLEED
W, H = round((XMAX - XMIN) * PX), round((YMAX - YMIN) * PX)
cx = lambda x: int(round((x - XMIN) * PX))            # cm -> canvas x
cy = lambda y: int(round((YMAX - y) * PX))            # cm -> canvas y (y up in the die, down in the image)
TP = np.array([252.0, 167.0, 206.0])

front = np.asarray(Image.open(P('milda_front_art_600dpi.png')).convert('RGB'))
back = np.asarray(Image.open(P('milda_back_art_600dpi.png')).convert('RGB'))
ph, pw = front.shape[:2]

# ---- 1. pattern background (mirror-tiled so it never shows a seam) ------------------
detail = pattern_detail(np.asarray(Image.open(P('milda_front_art.png')).convert('RGB')))
k = pw / 540
d600 = np.stack([np.asarray(Image.fromarray(detail[..., i].astype(np.float32), 'F')
                            .resize((round(detail.shape[1] * k), round(detail.shape[0] * k)), Image.LANCZOS)) for i in range(3)], -1)
def refl(n, size):
    i = np.arange(n) % (2 * size); return np.where(i < size, i, 2 * size - 1 - i)
cols = refl(W, d600.shape[1]); canvas = np.empty((H, W, 3), np.uint8)
for y0 in range(0, H, 400):
    rows = refl(H, d600.shape[0])[y0:y0 + 400]
    canvas[y0:y0 + 400] = np.clip(TP + d600[rows][:, cols], 0, 255).round().astype(np.uint8)

# ---- 2. panels; artwork continues 3 mm past the one true outer cut edge it touches ------
# Only the front panel's left edge is a cut edge. Every other panel edge is a crease with printed pattern on the far
# side (flap / side panel), so nothing can show white there; mirroring across a crease would cut waffles off mid-piece.
ext = round(BLEED * PX)
def place(img, x_cm, ext_left=0):
    e = np.pad(img, ((0, 0), (ext_left, 0), (0, 0)), mode='symmetric') if ext_left else img
    x0, y0 = cx(x_cm) - ext_left, cy(15)
    canvas[y0:y0 + e.shape[0], x0:x0 + e.shape[1]] = e
place(front, 0, ext_left=ext); place(back, 8)

Image.fromarray(canvas).save(P('milda_die_art_bleed_600dpi.jpg'), quality=95, subsampling=0, dpi=(600, 600))
print('die art', canvas.shape)
