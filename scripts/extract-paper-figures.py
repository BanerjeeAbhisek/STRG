"""Render the seven published figures without recreating their underlying data.

Usage: python scripts/extract-paper-figures.py --pdf /path/to/2510.18318v4.pdf
Requires pdfplumber and the Poppler pdftoppm executable. Figure boxes come from
the supplied PDF's embedded image bounds. No PDF or source artwork is modified.
"""
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import pdfplumber

parser = argparse.ArgumentParser()
parser.add_argument("--pdf", required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / "assets" / "paper"
output.mkdir(parents=True, exist_ok=True)
renderer = shutil.which("pdftoppm")
if not renderer:
    raise SystemExit("Install Poppler or add its pdftoppm executable to PATH.")
manifest = []
with pdfplumber.open(args.pdf) as pdf:
    for number, page_number in enumerate([3, 5, 6, 8, 14, 19, 23], start=1):
        page = pdf.pages[page_number - 1]
        if len(page.images) != 1:
            raise ValueError(f"Expected one published figure on page {page_number}.")
        image = page.images[0]
        # Figure 4's embedded image bounds extend across the page header and
        # caption. This verified sub-rectangle contains only the complete diagram.
        if number == 4:
            image = {**image, "top": 84.0, "bottom": 240.0}
        # Figure 3's image box reaches into the first pixels of its caption.
        if number == 3:
            image = {**image, "bottom": 328.0}
        # Integer pixel bounds round outward to preserve the full figure.
        scale = 300 / 72
        left, top = math.floor(image["x0"] * scale), math.floor(image["top"] * scale)
        right, bottom = math.ceil(image["x1"] * scale), math.ceil(image["bottom"] * scale)
        prefix = output / f"figure-{number:02d}"
        subprocess.run([renderer, "-f", str(page_number), "-l", str(page_number),
                        "-r", "300", "-x", str(left), "-y", str(top),
                        "-W", str(right-left), "-H", str(bottom-top),
                        "-singlefile", "-png", str(args.pdf), str(prefix)], check=True)
        manifest.append({"figure": number, "pdf_page": page_number,
                         "path": str(prefix.relative_to(root)) + ".png",
                         "operation": "300 dpi crop of the original published figure"})
print(json.dumps(manifest, indent=2))
