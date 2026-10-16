"""Fix misspelled packaging text in the DRYP photo mockup.

Correct text is cut from the flat artwork, warped onto each bag with a
per-region homography (global SIFT match, refined locally with ECC), and
composited over the cleaned-up bag surface using the photo's own shading.

Usage: python3 fix_mockup.py
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, "input")
OUT = os.path.join(HERE, "output")

# Regions in flat-artwork pixel coords (x0, y0, x1, y1). `kind` is the ink
# polarity on the artwork: "dark" ink on a light ground, or "light" ink.
BAGS = {
    "hazelnut": {
        "art": "art_hazelnut_drift.jpg",
        "roi": (0, 500, 680, 1400),  # where to look for this bag in the photo
        "regions": [
            # Mostly hidden past the bag's folded edge, so too little old text
            # is visible to snap to; the bag-wide fit places it correctly.
            ("small_batch", (95, 112, 312, 156), "dark", False),
            ("roasted_in_india", (935, 112, 1235, 156), "dark"),
            ("badge", (982, 668, 1192, 878), "dark"),
            ("subline", (370, 1712, 960, 1756), "dark"),
            ("notes", (362, 1764, 972, 1820), "dark"),
            ("roast_label", (560, 1882, 655, 1924), "dark"),
            ("arabica", (960, 1880, 1175, 1924), "dark"),
            ("net_wt", (95, 1880, 330, 1924), "dark"),
        ],
    },
    "slow_pour": {
        "art": "art_slow_pour.jpg",
        "roi": (590, 320, 1040, 960),
        "regions": [
            ("roasted_in_india", (935, 112, 1235, 156), "light"),
            ("badge", (982, 668, 1192, 878), "dark"),
            ("notes", (418, 1764, 915, 1820), "light"),
        ],
    },
}
BADGE_CENTER, BADGE_R = (1087, 773), 101  # same on both artworks


def global_homography(art_gray, photo_gray, roi):
    sift = cv2.SIFT_create(20000)
    k1, d1 = sift.detectAndCompute(art_gray, None)
    k2, d2 = sift.detectAndCompute(photo_gray, None)
    x0, y0, x1, y1 = roi
    idx = [i for i, k in enumerate(k2) if x0 <= k.pt[0] <= x1 and y0 <= k.pt[1] <= y1]
    matches = cv2.BFMatcher().knnMatch(d1, d2[idx], k=2)
    good = [m for m, n in matches if m.distance < 0.8 * n.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k2[idx[m.trainIdx]].pt for m in good])
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4)
    inl = inl.ravel().astype(bool)
    return H, (src[inl], dst[inl])


def translate(tx, ty):
    return np.array([[1, 0, tx], [0, 1, ty], [0, 0, 1]], np.float64)


def local_homography(matches, box, H, radius=260):
    """Fit H from SIFT inliers near this region; fall back to the global H."""
    src, dst = matches
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    near = np.hypot(src[:, 0] - cx, src[:, 1] - cy) < radius
    if near.sum() >= 12:
        Hn, _ = cv2.findHomography(src[near], dst[near], cv2.RANSAC, 2.5)
        if Hn is not None:
            return Hn
    return H


def refine(art_gray, photo_gray, H, box, pad=14, margin=36, max_shift=12):
    """Return (H_local, photo bbox): artwork crop coords -> photo bbox coords.

    ECC aligns a window around the text (margin adds nearby rules/edges) so the
    warp locks onto the bag even though the photo's letters are wrong.
    """
    x0, y0, x1, y1 = box
    def bbox(bx, p):
        pts = cv2.perspectiveTransform(np.float32([[[bx[0], bx[1]]], [[bx[2], bx[1]]], [[bx[2], bx[3]]], [[bx[0], bx[3]]]]), H)
        lo = np.floor(pts.min(axis=(0, 1))).astype(int) - p
        hi = np.ceil(pts.max(axis=(0, 1))).astype(int) + p
        return pts, lo, hi
    _, (bx0, by0), (bx1, by1) = bbox(box, pad)
    bx0, by0 = max(bx0, 0), max(by0, 0)
    win = (x0 - margin, y0 - margin, x1 + margin, y1 + margin)
    wpts, (wx0, wy0), (wx1, wy1) = bbox(win, 4)
    wx0, wy0 = max(wx0, 0), max(wy0, 0)
    tpl = cv2.GaussianBlur(photo_gray[wy0:wy1, wx0:wx1].astype(np.float32), (0, 0), 1.0)
    art_b = cv2.GaussianBlur(art_gray.astype(np.float32), (0, 0), 1.4)
    Hw = translate(-wx0, -wy0) @ H
    inp = cv2.warpPerspective(art_b, Hw, (tpl.shape[1], tpl.shape[0]))
    mask = np.zeros(tpl.shape, np.uint8)
    cv2.fillConvexPoly(mask, (wpts.reshape(-1, 2) - [wx0, wy0]).astype(np.int32), 255)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-6)
    c = np.float32([[[0, 0]], [[tpl.shape[1], 0]], [[0, tpl.shape[0]]], [[tpl.shape[1], tpl.shape[0]]]])
    W, cc = np.eye(3, dtype=np.float32), None
    # Coarse shift (heavier blur widens the basin), then affine for the residual
    # tilt/scale. A full homography over-fits these thin text windows.
    for motion, blur, levels in ((cv2.MOTION_TRANSLATION, 2.0, 5), (cv2.MOTION_AFFINE, 0.0, 3)):
        Wn = W[:2].copy()
        t = cv2.GaussianBlur(tpl, (0, 0), blur) if blur else tpl
        i = cv2.GaussianBlur(inp, (0, 0), blur) if blur else inp
        try:
            ccn, Wn = cv2.findTransformECC(t, i, Wn, motion, crit, mask, levels)
        except cv2.error:
            break
        Wn = np.vstack([Wn, [0, 0, 1]]).astype(np.float32)
        if np.abs(cv2.perspectiveTransform(c, Wn) - c).max() > max_shift:  # runaway
            break
        W, cc = Wn, ccn
    Hfull = translate(wx0, wy0) @ np.linalg.inv(W.astype(np.float64)) @ Hw
    return Hfull, (bx0, by0, bx1, by1), cc


def snap_to_old_text(art_gray, photo_gray, H, box, kind, along=45, across=8):
    """Slide the warped line along/across its baseline until it best overlays the
    old (misspelled) print, which shares the layout. Most letters match, so the
    correlation peak is the true position even where the bag is distorted."""
    pg = photo_gray.astype(np.float32)
    ker = np.ones((7, 7), np.uint8)
    strength = (cv2.morphologyEx(pg, cv2.MORPH_CLOSE, ker) - pg if kind == "dark"
                else pg - cv2.morphologyEx(pg, cv2.MORPH_OPEN, ker))
    x0, y0, x1, y1 = box
    alpha = art_alpha(cv2.GaussianBlur(art_gray[y0:y1, x0:x1], (0, 0), 1.1), kind)
    ym = (y0 + y1) / 2
    p = cv2.perspectiveTransform(np.float32([[[x0, ym]], [[x1, ym]]]), H).reshape(2, 2)
    d = (p[1] - p[0]) / np.linalg.norm(p[1] - p[0])
    n = np.array([-d[1], d[0]])
    Hc = H @ translate(x0, y0)
    pts = cv2.perspectiveTransform(np.float32([[[0, 0]], [[x1 - x0, 0]], [[0, y1 - y0]], [[x1 - x0, y1 - y0]]]), Hc)
    lo = np.floor(pts.min(axis=(0, 1))).astype(int) - along - across
    hi = np.ceil(pts.max(axis=(0, 1))).astype(int) + along + across
    lo = np.maximum(lo, 0)
    sub = strength[lo[1]:hi[1], lo[0]:hi[0]]
    best = (-2, 0, 0)
    for s in range(-along, along + 1):
        for t in range(-across, across + 1, 2):
            T = translate(*(s * d + t * n - lo)) @ Hc
            a = cv2.warpPerspective(alpha, T, sub.shape[::-1])
            sel = cv2.warpPerspective(np.ones_like(alpha), T, sub.shape[::-1]) > 0.5
            if sel.sum() < 50 or a[sel].std() == 0 or sub[sel].std() == 0:
                continue
            r = np.corrcoef(a[sel], sub[sel])[0, 1]
            if r > best[0]:
                best = (r, s, t)
    _, s, t = best
    return translate(*(s * d + t * n)) @ H


def best_fit(art_gray, photo_gray, inits, box, max_shift=12):
    """Try each starting warp; keep the one ECC scores highest."""
    best = None
    for H in inits:
        Hfull, bb, cc = refine(art_gray, photo_gray, H, box, max_shift=max_shift)
        if best is None or (cc or -1) > (best[2] or -1):
            best = (Hfull, bb, cc)
    return best


def strip_ink(patch, kind, k):
    """Remove thin text strokes, keeping the bag's broad shading/wrinkles."""
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    op = cv2.MORPH_CLOSE if kind == "dark" else cv2.MORPH_OPEN
    bg = cv2.morphologyEx(patch, op, ker)
    return cv2.GaussianBlur(bg, (0, 0), 1.2)


def art_alpha(crop_gray, kind):
    g = crop_gray.astype(np.float32)
    lo, hi = np.percentile(g, 3), np.percentile(g, 97)
    a = (hi - g) / (hi - lo) if kind == "dark" else (g - lo) / (hi - lo)
    return np.clip((a - 0.1) / 0.8, 0, 1)


def fix_region(photo, photo_gray, art_gray, Hfull, bb, box, kind, is_badge):
    bx0, by0, bx1, by1 = bb
    x0, y0, x1, y1 = box
    Hl = translate(-bx0, -by0) @ Hfull @ translate(x0, y0)
    w, h = bx1 - bx0, by1 - by0
    patch = photo[by0:by1, bx0:bx1].astype(np.float32)

    # New ink alpha from the artwork, pre-blurred against aliasing at ~1/3 scale.
    crop = cv2.GaussianBlur(art_gray[y0:y1, x0:x1], (0, 0), 1.1)
    alpha_art = art_alpha(crop, kind)
    region = np.ones_like(alpha_art)
    if is_badge:
        yy, xx = np.mgrid[y0:y1, x0:x1]
        r = np.hypot(xx - BADGE_CENTER[0], yy - BADGE_CENTER[1])
        alpha_art *= (r < BADGE_R - 4)
        region = (r < BADGE_R - 2).astype(np.float32)
    alpha = cv2.warpPerspective(alpha_art, Hl, (w, h), flags=cv2.INTER_AREA)
    region = cv2.warpPerspective(region, Hl, (w, h), flags=cv2.INTER_LINEAR)
    if not is_badge:  # let the cleanup reach old letters that overhang the new line
        region = cv2.dilate(region, np.ones((9, 9), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.45)

    # Clean ground (old text removed); ink colour sampled from the old letters'
    # strongest pixels, then shaded with the ground so it follows the lighting.
    k = 9 if is_badge else 7
    bg = strip_ink(patch, kind, k)
    diff = np.abs(patch - bg).sum(axis=2)
    inside = region > 0.5
    old_ink = (diff > np.percentile(diff[inside], 85)) & inside
    core = (diff > np.percentile(diff[inside], 97)) & inside
    lum = bg.mean(axis=2)
    shade = (lum - np.median(lum[inside]))[..., None]
    ink = np.median(patch[core] - shade[core], axis=0) + shade

    # Only touch bag pixels: skip fingers/shirt where the photo is far from the ground colour.
    ground = np.median(bg[region > 0.5], axis=0)
    on_bag = (np.linalg.norm(bg - ground, axis=2) < 45).astype(np.float32)
    on_bag = cv2.erode(on_bag, np.ones((3, 3), np.uint8))
    on_bag = cv2.GaussianBlur(on_bag, (0, 0), 1.0)

    # Feathered replacement area around the text (dilated old+new ink).
    area = ((alpha > 0.05) | old_ink).astype(np.uint8)
    area = cv2.dilate(area, np.ones((5, 5), np.uint8)).astype(np.float32)
    area = cv2.GaussianBlur(area, (0, 0), 1.5) * region * on_bag

    a = alpha[..., None]
    new = bg * (1 - a) + ink * a
    noise = np.random.default_rng(7).normal(0, 2.0, new.shape).astype(np.float32)
    new += noise * area[..., None]
    out = patch * (1 - area[..., None]) + new * area[..., None]
    photo[by0:by1, bx0:bx1] = np.clip(out, 0, 255)


def main():
    os.makedirs(OUT, exist_ok=True)
    photo = cv2.imread(os.path.join(IN, "mockup.jpg"))
    orig = photo.copy()
    photo_gray = cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY)
    work = photo.astype(np.float32)
    boxes = []
    for bag, cfg in BAGS.items():
        art = cv2.imread(os.path.join(IN, cfg["art"]))
        art_gray = cv2.cvtColor(art, cv2.COLOR_BGR2GRAY)
        H, matches = global_homography(art_gray, photo_gray, cfg["roi"])
        done = []  # (box centre, refined H) of regions ECC locked onto
        for name, box, kind, *opt in cfg["regions"]:
            c = np.array([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])
            # Neighbouring locked-in warps are good starts too.
            near = [h for _, h in sorted(done, key=lambda d: np.linalg.norm(d[0] - c))[:2]]
            inits = [local_homography(matches, box, H), H] + near
            if name != "badge" and opt != [False]:
                inits = [snap_to_old_text(art_gray, photo_gray, h, box, kind) for h in inits]
            Hfull, bb, cc = best_fit(art_gray, photo_gray, inits, box, max_shift=6)
            if cc is not None and cc > 0.5:
                done.append((c, Hfull))
            fix_region(work, photo_gray, art_gray, Hfull, bb, box, kind, name == "badge")
            boxes.append((f"{bag}/{name}", bb))
            print(f"{bag:10s} {name:18s} ecc={cc}")
    result = np.clip(work, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, "dryp_mockup_fixed.png"), result)

    # 2x Lanczos upscale with a gentle unsharp mask for a crisper deliverable.
    up = cv2.resize(result, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    up = up + 0.6 * (up - cv2.GaussianBlur(up, (0, 0), 1.6))
    cv2.imwrite(os.path.join(OUT, "dryp_mockup_fixed_2x.png"), np.clip(up, 0, 255).astype(np.uint8))

    # Before/after sheet: full images side by side, then zoomed crops per fix.
    sheet = [np.hstack([orig, result])]
    for label, (x0, y0, x1, y1) in boxes:
        pad = 6
        a = orig[max(y0 - pad, 0):y1 + pad, max(x0 - pad, 0):x1 + pad]
        b = result[max(y0 - pad, 0):y1 + pad, max(x0 - pad, 0):x1 + pad]
        s = min(1100 / a.shape[1], 3.0)
        a = cv2.resize(a, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
        b = cv2.resize(b, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
        row = np.full((a.shape[0] + 40, 2240, 3), 255, np.uint8)
        cv2.putText(row, label, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        row[40:, 10:10 + a.shape[1]] = a
        row[40:, 1130:1130 + b.shape[1]] = b
        sheet.append(row)
    cv2.imwrite(os.path.join(OUT, "before_after.jpg"), np.vstack(sheet), [cv2.IMWRITE_JPEG_QUALITY, 90])


if __name__ == "__main__":
    main()
