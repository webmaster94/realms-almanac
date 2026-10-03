"""Water geometry registration shared by atlas build steps."""
import numpy as np
import cv2

def water(a):
    a = a.astype(np.float32)
    return ((a[:, :, 2] - a[:, :, 0] > 12) & (a[:, :, 1] - a[:, :, 0] > 8) & (a[:, :, 2] > a[:, :, 1] - 3) & (a[:, :, 0] < 195)).astype(np.float32)

def registration(guide, art):
    size = (384, 384)
    a = cv2.resize(water(guide), size)
    b = cv2.resize(water(art), size)
    aa = cv2.GaussianBlur(a * 255, (0, 0), 3)
    bb = cv2.GaussianBlur(b * 255, (0, 0), 3)
    flow = cv2.calcOpticalFlowFarneback(aa, bb, None, 0.5, 4, 55, 5, 7, 1.5, 0)
    flow = cv2.GaussianBlur(flow, (0, 0), 10)
    flow = np.clip(flow, -8, 8)
    h, w = art.shape[:2]
    f = cv2.resize(flow, (w, h))
    f[:, :, 0] *= w / 384
    f[:, :, 1] *= h / 384
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    registered = cv2.remap(art, xx + f[:, :, 0], yy + f[:, :, 1], cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)

    def score(v):
        vv = cv2.resize(water(v), size) > 0.5
        ref = a > 0.5
        return float((vv & ref).sum() / max(1, (vv | ref).sum()))
    before, after = (score(art), score(registered))
    if after < before:
        registered = art
        after = before
    return (registered, {'waterIoUBefore': before, 'waterIoUAfter': after, 'maxDisplacementPixels': float(np.abs(f).max())})
