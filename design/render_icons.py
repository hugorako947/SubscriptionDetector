"""Rasterise the SVG icons with Chromium (dev tool only, not shipped).

Usage: pip install playwright && python -m playwright install chromium
       python design/render_icons.py
"""
import os
import pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).parent
out = here.parent / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
jobs = [('icon.svg', 'icon-192.png', 192, True), ('icon.svg', 'icon-512.png', 512, True),
        ('maskable.svg', 'maskable-512.png', 512, False), ('maskable.svg', 'apple-touch-icon.png', 180, False)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None)
    for src, dst, size, transparent in jobs:
        page = b.new_page(viewport={'width': size, 'height': size})
        svg = (here / src).read_text()
        page.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</body></html>')
        page.screenshot(path=str(out / dst), omit_background=transparent)
        page.close()
    b.close()
