"""Whole-die artwork with 3 mm bleed: milda_die_art_bleed_600dpi.jpg
 - pink pattern background under the entire die (flaps, side panels, glue flaps) + 3 mm bleed all round
 - the front artwork continues 3 mm past its outer cut edge (mirrored), so a print shift can't leave a white sliver
 - a small waffle piece and sparkle (lifted from the front artwork) decorate the front top flap
"""
import numpy as np, os
from PIL import Image, ImageFilter
from scipy.ndimage import label, find_objects, binary_closing, binary_fill_holes, binary_dilation, gaussian_filter
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

# ---- 3. flap decoration: waffle piece + sparkle lifted from the front artwork ------
def cutout(mask, margin=8):
    mask = binary_fill_holes(binary_closing(mask, iterations=3))
    ys, xs = np.where(mask); y0, y1, x0, x1 = ys.min() - margin, ys.max() + margin, xs.min() - margin, xs.max() + margin
    a = gaussian_filter(binary_dilation(mask, iterations=1).astype(float), 1.4)[y0:y1, x0:x1]
    return front[y0:y1, x0:x1], a
r, g, b = (front[..., i].astype(int) for i in range(3))
org = (r > 200) & (g > 110) & (g < 215) & (b < 150) & (r - b > 80)
lab, _ = label(binary_closing(org, iterations=3)); waffle_mask = lab == lab[2300, 1500] if lab[2300, 1500] else None
cream = (g > 215) & (b > 190) & (r > 240) & (r - b < 60)
lab2, _ = label(binary_closing(cream, iterations=2)); star_mask = lab2 == lab2[1550, 160]
assert waffle_mask is not None and lab2[1550, 160] > 0
def paste(rgb, a, cxcm, cycm, size_cm, by='w', rot=0):
    im = Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), 'RGBA')
    s = size_cm * PX / (im.width if by == 'w' else im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    arr = np.asarray(im).astype(float); al = arr[..., 3:] / 255
    x0, y0 = cx(cxcm) - im.width // 2, cy(cycm) - im.height // 2
    reg = canvas[y0:y0 + im.height, x0:x0 + im.width].astype(float)
    canvas[y0:y0 + im.height, x0:x0 + im.width] = (reg * (1 - al) + arr[..., :3] * al).round().astype(np.uint8)
w_rgb, w_a = cutout(waffle_mask); s_rgb, s_a = cutout(star_mask)
# both sit inside the straight part of the front top flap (x 1.5-5.5 cm, y 15-16.5 cm), >= 3 mm from every edge
paste(w_rgb, w_a, 2.5, 15.75, 1.0, by='w', rot=18)
paste(s_rgb, s_a, 4.3, 15.75, 0.95, by='h')

Image.fromarray(canvas).save(P('milda_die_art_bleed_600dpi.jpg'), quality=95, subsampling=0, dpi=(600, 600))
print('die art', canvas.shape)
