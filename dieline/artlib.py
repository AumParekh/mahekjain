"""Shared helpers for the MiLda dieline art scripts."""
import numpy as np
from scipy.ndimage import gaussian_filter

def pattern_detail(front):
    """Zero-mean fine pattern of the pink background, from the blank top margin of the front panel."""
    patch = front[8:78, 8:532].astype(float)
    low = np.stack([gaussian_filter(patch[..., i], 10, mode='reflect') for i in range(3)], -1)
    d = patch - low
    return d - d.mean((0, 1))

def tile(detail, h, w):
    """Mirror-tile the pattern so it stays continuous (no seams) over any size."""
    H, W, _ = detail.shape
    return np.pad(detail, ((0, max(0, h - H)), (0, max(0, w - W)), (0, 0)), mode='symmetric')[:h, :w]
