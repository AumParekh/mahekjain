# DRYP mockup spelling fix

Corrects the misspelled packaging text in `input/mockup.jpg` using the flat
artwork (`input/art_*.jpg`) as the source of truth.

```
pip install -r requirements.txt
python3 fix_mockup.py
```

Outputs (in `output/`):
- `dryp_mockup_fixed.png` – corrected mockup, original 1120×1500
- `dryp_mockup_fixed_2x.png` – 2× upscaled and lightly sharpened
- `before_after.jpg` – full side-by-side plus a zoomed crop of every fix

Fixes: Hazelnut Drift – SMALL BATCH, ROASTED IN INDIA, badge (TOASTED HAZELNUT ·
NO ADDED SUGAR), MEDIUM ROAST · HAZELNUT FLAVOURED, milk chocolate & brown sugar,
ROAST, NET WT., 100% ARABICA. Slow Pour – ROASTED IN INDIA, badge (FRESHLY
ROASTED · SMALL BATCH), cocoa nib, caramel & toasted almond.

How: each correct line is cut from the artwork, warped onto the bag (SIFT
homography → snap to the old print's position → ECC refinement), and composited
over the bag with the old letters removed, using the photo's own ink colour and
shading. Pixels off the bag (fingers, shirt) are left untouched.

## Upscale / sharpen

`upscale.py` runs Real-ESRGAN x4plus on CPU (download the 64 MB weights from
https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
next to the script), blends a little Lanczos detail back in for fabric texture,
and applies a gentle unsharp mask. Writes `output/dryp_mockup_fixed_4x.png`
(4480×6000) and a 2× version downsampled from it.
