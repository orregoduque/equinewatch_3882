"""Run with: python3 -m unittest discover -s tests -v."""

import unittest
from pathlib import Path
import subprocess
import sys
import tempfile

import cv2
import numpy as np

from image_processing.night_photo import brighten_gamma, enhance_night_photo


class NightPhotoTests(unittest.TestCase):
    def setUp(self):
        self.source = np.random.default_rng(42).integers(
            0, 90, size=(48, 64, 3), dtype=np.uint8
        )

    def test_output_grayscale_dimensions_dtype_and_source_unchanged(self):
        original = self.source.copy()
        for scale in (2, 4):
            with self.subTest(scale=scale):
                result = enhance_night_photo(self.source, scale=scale)
                self.assertEqual(result.shape, (48 * scale, 64 * scale))
                self.assertEqual(result.dtype, np.uint8)
                self.assertFalse(np.shares_memory(result, self.source))
                np.testing.assert_array_equal(self.source, original)

    def test_grayscale_input_is_supported_and_deterministic(self):
        gray = cv2.cvtColor(self.source, cv2.COLOR_BGR2GRAY)
        first = enhance_night_photo(gray)
        np.testing.assert_array_equal(first, enhance_night_photo(gray))
        np.testing.assert_array_equal(first, enhance_night_photo(self.source))

    def test_pipeline_exact_order_and_parameters(self):
        gray = cv2.cvtColor(self.source, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(
            gray, None, h=5.0, templateWindowSize=7, searchWindowSize=21
        )
        contrasted = cv2.createCLAHE(
            clipLimit=2.0, tileGridSize=(8, 8)
        ).apply(denoised)
        lut = np.rint(
            255 * (np.arange(256, dtype=np.float64) / 255) ** (1 / 1.8)
        ).astype(np.uint8)
        brightened = cv2.LUT(contrasted, lut)
        blurred = cv2.GaussianBlur(
            brightened, (0, 0), sigmaX=1.0, borderType=cv2.BORDER_REFLECT_101
        )
        sharpened = cv2.addWeighted(brightened, 1.25, blurred, -0.25, 0)
        expected = cv2.resize(
            sharpened, (128, 96), interpolation=cv2.INTER_LANCZOS4
        )
        np.testing.assert_array_equal(enhance_night_photo(self.source), expected)

    def test_gamma_brightens_shadows_and_preserves_endpoints(self):
        ramp = np.arange(256, dtype=np.uint8).reshape(16, 16)
        for gamma in (1.6, 1.8, 2.0):
            with self.subTest(gamma=gamma):
                result = brighten_gamma(ramp, gamma).ravel()
                self.assertEqual(int(result[0]), 0)
                self.assertEqual(int(result[-1]), 255)
                self.assertTrue(np.all(np.diff(result.astype(int)) >= 0))
                self.assertGreater(int(result[32]), 32)
                self.assertGreater(int(result[128]), 128)

    def test_invalid_images_are_rejected(self):
        images = [
            None, np.array([], dtype=np.uint8),
            np.zeros((8, 8), dtype=np.float32),
            np.zeros((8, 8), dtype=np.uint16),
            np.zeros((8, 8, 4), dtype=np.uint8),
            np.zeros((8, 8, 1), dtype=np.uint8),
        ]
        for image in images:
            with self.subTest(image=str(type(image))):
                with self.assertRaises(ValueError):
                    enhance_night_photo(image)

    def test_invalid_parameters_are_rejected(self):
        options = [
            {"gamma": 1.5}, {"gamma": 2.1}, {"gamma": float("nan")},
            {"scale": 1}, {"scale": 3}, {"scale": 2.0},
            {"denoise_h": -1}, {"denoise_h": 11},
            {"unsharp_amount": -0.1}, {"unsharp_amount": 0.6},
        ]
        for params in options:
            with self.subTest(params=params):
                with self.assertRaises(ValueError):
                    enhance_night_photo(self.source, **params)

    def test_cli_writes_lossless_output_and_refuses_overwriting(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "original.png"
            output = Path(folder) / "enhanced.png"
            self.assertTrue(cv2.imwrite(str(source), self.source))
            original_bytes = source.read_bytes()
            command = [
                sys.executable, "-m", "image_processing.night_photo",
                str(source), str(output),
            ]
            completed = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            result = cv2.imread(str(output), cv2.IMREAD_UNCHANGED)
            np.testing.assert_array_equal(result, enhance_night_photo(self.source))
            self.assertEqual(source.read_bytes(), original_bytes)
            saved_bytes = output.read_bytes()
            refused = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(refused.returncode, 0)
            self.assertIn("never overwritten", refused.stderr)
            self.assertEqual(output.read_bytes(), saved_bytes)


if __name__ == "__main__":
    unittest.main()