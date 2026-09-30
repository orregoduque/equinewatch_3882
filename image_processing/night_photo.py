"""Enhance night photos without cropping, warping, or generative processing."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import cv2
import numpy as np


def brighten_gamma(image: np.ndarray, gamma: float = 1.8) -> np.ndarray:
    """Apply the convention output = 255 * (input / 255) ** (1 / gamma).

    Gamma above 1 brightens shadows. Endpoints remain 0 and 255.
    """
    if not math.isfinite(gamma) or not 1.6 <= gamma <= 2.0:
        raise ValueError("gamma must be between 1.6 and 2.0")
    if not isinstance(image, np.ndarray) or image.dtype != np.uint8:
        raise ValueError("image must be a uint8 NumPy array")
    if image.ndim != 2 or image.size == 0:
        raise ValueError("gamma correction requires a nonempty grayscale image")

    levels = np.arange(256, dtype=np.float64) / 255.0
    lookup = np.rint(255.0 * np.power(levels, 1.0 / gamma)).astype(np.uint8)
    return cv2.LUT(image, lookup)


def enhance_night_photo(
    image: np.ndarray,
    *,
    gamma: float = 1.8,
    scale: int = 2,
    denoise_h: float = 5.0,
    unsharp_amount: float = 0.25,
) -> np.ndarray:
    """Return a new uint8 grayscale image, uniformly enlarged 2x (or 4x).

    Input: nonempty uint8 grayscale (H, W) or OpenCV BGR (H, W, 3).
    Pipeline: grayscale -> fastNlMeansDenoising -> CLAHE (2.0, 8x8)
    -> inverse-gamma LUT -> mild unsharp mask -> INTER_LANCZOS4 resize.

    No inpainting, object recognition, synthesis, rotation, perspective
    transform, or crop is performed. The source array is never modified.
    These filters change pixel values and may suppress weak details; they
    cannot restore information lost through compression.
    """
    if not isinstance(image, np.ndarray):
        raise ValueError("image must be a NumPy array")
    if image.dtype != np.uint8 or image.size == 0:
        raise ValueError("image must be nonempty and have dtype uint8")
    if not (image.ndim == 2 or (image.ndim == 3 and image.shape[2] == 3)):
        raise ValueError("image must be grayscale or three-channel BGR")
    if not math.isfinite(gamma) or not 1.6 <= gamma <= 2.0:
        raise ValueError("gamma must be between 1.6 and 2.0")
    if not isinstance(scale, int) or scale not in (2, 4):
        raise ValueError("scale must be 2 or 4")
    if not math.isfinite(denoise_h) or not 0.0 <= denoise_h <= 10.0:
        raise ValueError("denoise_h must be between 0 and 10")
    if not math.isfinite(unsharp_amount) or not 0.0 <= unsharp_amount <= 0.5:
        raise ValueError("unsharp_amount must be between 0 and 0.5")

    gray = (
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if image.ndim == 3
        else image.copy()
    )
    denoised = cv2.fastNlMeansDenoising(
        gray, None, h=denoise_h, templateWindowSize=7, searchWindowSize=21
    )
    local_contrast = cv2.createCLAHE(
        clipLimit=2.0, tileGridSize=(8, 8)
    ).apply(denoised)
    brightened = brighten_gamma(local_contrast, gamma)
    blurred = cv2.GaussianBlur(
        brightened, (0, 0), sigmaX=1.0, borderType=cv2.BORDER_REFLECT_101
    )
    sharpened = cv2.addWeighted(
        brightened, 1.0 + unsharp_amount, blurred, -unsharp_amount, 0.0
    )
    height, width = gray.shape
    return cv2.resize(
        sharpened, (width * scale, height * scale),
        interpolation=cv2.INTER_LANCZOS4,
    )


def main() -> None:
    """Process one local file into a separate, lossless PNG."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path, help="New PNG file; never overwrites")
    parser.add_argument("--gamma", type=float, default=1.8)
    parser.add_argument("--scale", type=int, choices=(2, 4), default=2)
    args = parser.parse_args()

    try:
        if args.output.suffix.lower() != ".png":
            raise ValueError("output must be PNG to avoid additional lossy compression")
        if args.input.resolve() == args.output.resolve() or args.output.exists():
            raise ValueError("use a new output path; existing files are never overwritten")
        if not args.input.is_file():
            raise ValueError(f"input file does not exist: {args.input}")
        source = cv2.imread(str(args.input), cv2.IMREAD_UNCHANGED)
        if source is None:
            raise ValueError(f"could not decode image: {args.input}")
        result = enhance_night_photo(source, gamma=args.gamma, scale=args.scale)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(args.output), result):
            raise ValueError(f"could not save output: {args.output}")
    except (ValueError, cv2.error) as error:
        parser.error(str(error))

    print(f"Saved {args.output}: {result.shape[1]}x{result.shape[0]}, grayscale")


if __name__ == "__main__":
    main()