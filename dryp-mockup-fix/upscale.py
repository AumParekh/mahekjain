"""Upscale + sharpen the fixed mockup with Real-ESRGAN (x4plus), on CPU.

Usage:
    python3 upscale.py [--weights RealESRGAN_x4plus.pth] [--in output/dryp_mockup_fixed.png]

Weights (64 MB, not committed):
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth

Writes output/dryp_mockup_fixed_4x.png (4480x6000) and
output/dryp_mockup_fixed_2x.png (downsampled from the 4x result).

The AI upscaler invents letters in small text, so after upscaling every small
text line on both bags is re-placed at 4x straight from the flat artwork
(same alignment as fix_mockup.py), keeping spelling exact and edges crisp.
"""
import argparse
import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

import fix_mockup

HERE = os.path.dirname(os.path.abspath(__file__))


# --- RRDBNet, the Real-ESRGAN x4plus generator (same layout as basicsr) ---
class ResidualDenseBlock(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(nf, gc)
        self.rdb2 = ResidualDenseBlock(nf, gc)
        self.rdb3 = ResidualDenseBlock(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def upscale_x4(model, img_bgr, tile=256, pad=16):
    """Run the model tile by tile (overlapping pads are cropped away)."""
    img = torch.from_numpy(img_bgr[:, :, ::-1].astype(np.float32) / 255).permute(2, 0, 1)[None]
    _, _, h, w = img.shape
    out = torch.zeros(1, 3, h * 4, w * 4)
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            y0, x0 = max(y - pad, 0), max(x - pad, 0)
            y1, x1 = min(y + tile + pad, h), min(x + tile + pad, w)
            with torch.no_grad():
                o = model(img[:, :, y0:y1, x0:x1])
            ty, tx = (y - y0) * 4, (x - x0) * 4
            th, tw = min(tile, h - y) * 4, min(tile, w - x) * 4
            out[:, :, y * 4:y * 4 + th, x * 4:x * 4 + tw] = o[:, :, ty:ty + th, tx:tx + tw]
            print(f"  tile y={y} x={x}", flush=True)
    res = out[0].clamp(0, 1).permute(1, 2, 0).numpy()[:, :, ::-1]
    return (res * 255).round().astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default=os.path.join(HERE, "RealESRGAN_x4plus.pth"))
    ap.add_argument("--in", dest="inp", default=os.path.join(HERE, "output", "dryp_mockup_fixed.png"))
    ap.add_argument("--texture", type=float, default=0.25,
                    help="share of plain Lanczos detail mixed back in so fabric keeps its weave")
    ap.add_argument("--base", help="already-upscaled 4x image to start from instead of running the model")
    ap.add_argument("--save-base", help="also save the raw upscaled image (before text) here")
    args = ap.parse_args()

    src = cv2.imread(args.inp)
    if args.base:  # reuse an earlier upscale (skips the slow model pass)
        out = cv2.imread(args.base)
    else:
        torch.set_num_threads(os.cpu_count() or 4)
        model = RRDBNet()
        state = torch.load(args.weights, map_location="cpu")
        model.load_state_dict(state.get("params_ema", state))
        model.eval()
        sr = upscale_x4(model, src).astype(np.float32)

        # GAN upscalers can smooth fine fabric texture; blend a little Lanczos back in.
        lz = cv2.resize(src, (sr.shape[1], sr.shape[0]), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
        out = sr * (1 - args.texture) + lz * args.texture
        # Gentle unsharp mask for crisp print edges.
        out = out + 0.35 * (out - cv2.GaussianBlur(out, (0, 0), 2.0))
        out = np.clip(out, 0, 255).astype(np.uint8)
        if args.save_base:
            cv2.imwrite(args.save_base, out)

    # Re-place all small text from the artwork at 4x (alignment is found on the
    # original, uncorrected mockup, whose print it snaps to).
    placed = fix_mockup.align_all(cv2.imread(os.path.join(fix_mockup.IN, "mockup.jpg")))
    out = fix_mockup.render(out, placed, scale=4)

    d = os.path.dirname(args.inp)
    cv2.imwrite(os.path.join(d, "dryp_mockup_fixed_4x.png"), out)
    cv2.imwrite(os.path.join(d, "dryp_mockup_fixed_4x.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    half = cv2.resize(out, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(d, "dryp_mockup_fixed_2x.png"), half)
    print("wrote", out.shape[1], "x", out.shape[0])


if __name__ == "__main__":
    main()
