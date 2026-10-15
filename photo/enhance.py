"""Enhance photo.jpg: 2x upscale + clean-up, and re-render the pack front from the real artwork
(perspective-mapped, photo lighting, fingers kept on top)."""
import numpy as np, cv2
from PIL import Image
S = 2                                                         # output scale
orig = np.asarray(Image.open('original.jpg').convert('RGB'))
art = np.asarray(Image.open('../dieline/milda_front_art_600dpi.png').convert('RGB'))
h, w = orig.shape[:2]
CORNERS = np.array([[112, 692], [300, 643], [388, 1018], [184, 1051]], np.float32)   # front face TL TR BR BL (orig px)
TP = np.array([252., 167., 206.])                              # pink of the artwork

# ---- 1. clean + upscale the whole photo ---------------------------------------------------
den = cv2.fastNlMeansDenoisingColored(orig, None, 2, 2, 5, 15)
base = cv2.resize(den, (w * S, h * S), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
blur = cv2.GaussianBlur(base, (0, 0), 1.6)
base = np.clip(base + 0.6 * (base - blur), 0, 255)           # unsharp, moderate (faces stay natural)
rng = np.random.default_rng(3)
base = np.clip(base + rng.normal(0, 1.7, base.shape[:2])[..., None], 0, 255)   # fine grain, avoids a plastic look

# ---- 2. masks (original px): pack face, fingers on top of it ----------------------------------
quad = np.zeros((h, w), np.uint8); cv2.fillConvexPoly(quad, CORNERS.astype(np.int32), 1)
r, g, b = (orig[..., i].astype(int) for i in range(3)); lum = orig.mean(2)
skin = (r > g) & (g - b > 14) & (r - b > 35) & (lum < 235)
nail = (lum > 205) & (r - g < 30) & (b - g > -12)
zone = np.zeros((h, w), np.uint8); cv2.fillPoly(zone, [np.array([[100, 880], [262, 880], [335, 1000], [335, 1080], [100, 1080]])], 1)
occ = ((skin | nail) & (quad > 0) & (zone > 0)).astype(np.uint8)
occ = cv2.morphologyEx(occ, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(occ)
occ = np.isin(lab, [i for i in range(1, n) if st[i, 4] > 300]).astype(np.uint8)       # drop specks (cream star etc.)
occ = cv2.dilate(occ, np.ones((3, 3), np.uint8))                                       # include the finger's soft edge

# ---- 3. lighting of the pack in the photo: smooth per-channel field from its pink -------------
pink = ((orig[..., 2] - orig[..., 1]) > 3) & ((orig[..., 0] - orig[..., 1]) > 20) & (lum > 150) & (quad > 0) & (occ == 0)
pink = cv2.erode(pink.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
num = np.stack([cv2.GaussianBlur(orig[..., i].astype(np.float32) * pink, (0, 0), 22) for i in range(3)], -1)
field = num / np.maximum(cv2.GaussianBlur(pink, (0, 0), 22)[..., None], 1e-4)
print('photo pack pink (median):', np.median(orig[pink > 0], 0))

# ---- 4. warp the real artwork onto the pack (4x supersampled, then reduced) ----------------------
X0, Y0, BW, BH = 60, 600, 400, 480                              # working window in original px
SS = 4
quad4 = ((CORNERS - np.array([X0, Y0], np.float32)) * SS).astype(np.float32)
small = cv2.resize(art, (900, int(900 * art.shape[0] / art.shape[1])), interpolation=cv2.INTER_AREA)
M = cv2.getPerspectiveTransform(np.array([[0, 0], [900, 0], [900, small.shape[0]], [0, small.shape[0]]], np.float32), quad4)
warp = cv2.warpPerspective(small, M, (BW * SS, BH * SS), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
face = cv2.warpPerspective(np.full(small.shape[:2], 255, np.uint8), M, (BW * SS, BH * SS), flags=cv2.INTER_LINEAR).astype(np.float32) / 255
red = (BW * S, BH * S)
warp = cv2.resize(warp, red, interpolation=cv2.INTER_AREA); face = cv2.resize(face, red, interpolation=cv2.INTER_AREA)
face = cv2.erode(face, np.ones((2 * S + 1, 2 * S + 1), np.float32)); face = cv2.GaussianBlur(face, (0, 0), 1.0)   # keep the photo's own pack edge
fld = cv2.resize(field[Y0:Y0 + BH, X0:X0 + BW], red, interpolation=cv2.INTER_CUBIC)
shade = fld / TP                                                  # photo lighting + colour grade relative to the artwork
art_lit = np.clip(warp * shade, 0, 255)
art_lit = cv2.GaussianBlur(art_lit, (0, 0), 0.55)                 # match the photo's focus
occ2 = cv2.resize(occ[Y0:Y0 + BH, X0:X0 + BW].astype(np.float32), red, interpolation=cv2.INTER_CUBIC)
occ2 = np.clip(cv2.GaussianBlur(occ2, (0, 0), 1.2), 0, 1)
alpha = (face * (1 - occ2))[..., None]
win = base[Y0 * S:(Y0 + BH) * S, X0 * S:(X0 + BW) * S]
base[Y0 * S:(Y0 + BH) * S, X0 * S:(X0 + BW) * S] = win * (1 - alpha) + art_lit * alpha

out = Image.fromarray(np.clip(base, 0, 255).round().astype(np.uint8))
out.save('enhanced.jpg', quality=95, subsampling=0)
print(out.size)
