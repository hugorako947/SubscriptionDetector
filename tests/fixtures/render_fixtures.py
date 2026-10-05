"""Renders fictional banking-app screenshots for OCR tests (invented data only).

Usage: pip install playwright && python -m playwright install chromium
       python tests/fixtures/render_fixtures.py
"""
import os
import pathlib
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).parent
ROWS = [
    ('Mardi 2 septembre', None, None, None),
    (None, 'PRLV SEPA CINÉFLUX', 'Prélèvement', '−11,99 €'),
    (None, 'CB BOULANGERIE DU PORT', 'Carte', '−4,20 €'),
    ('Jeudi 4 septembre', None, None, None),
    (None, 'PRLV SEPA ONDÉA MUSIQUE', 'Prélèvement', '−10,99 €'),
    (None, 'CB SUPERMARCHÉ CENTRE', 'Carte', '−38,74 €'),
    ('Lundi 8 septembre', None, None, None),
    (None, 'NUAGERIE 200 GO', 'Carte', '−2,99 €'),
    (None, 'PRLV CLUB FORME+', 'Prélèvement', '−24,99 €'),
    (None, 'REMBOURSEMENT', 'Virement reçu', '+15,00 €'),
]

def html(dark: bool) -> str:
    bg, fg, muted, line = ('#111418', '#f2f4f7', '#9aa3ad', '#262b31') if dark else ('#ffffff', '#1b1f24', '#6b7480', '#e6e9ed')
    items = []
    for day, label, kind, amount in ROWS:
        if day:
            items.append(f'<div class="day">{day}</div>')
        else:
            items.append(f'<div class="row"><div><div class="label">{label}</div><div class="kind">{kind}</div></div><div class="amount">{amount}</div></div>')
    return f'''<html><head><style>
      body {{ margin:0; background:{bg}; color:{fg}; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }}
      .top {{ padding: 56px 20px 12px; font-size: 28px; font-weight: 700; }}
      .balance {{ padding: 0 20px 18px; color:{muted}; font-size: 15px; }}
      .day {{ padding: 18px 20px 6px; color:{muted}; font-size: 13px; font-weight: 600; }}
      .row {{ display:flex; justify-content:space-between; align-items:center; padding: 12px 20px; border-bottom: 1px solid {line}; }}
      .label {{ font-size: 15px; font-weight: 500; }}
      .kind {{ font-size: 12px; color:{muted}; margin-top: 2px; }}
      .amount {{ font-size: 15px; font-weight: 600; }}
    </style></head><body>
      <div class="top">Opérations</div><div class="balance">Compte courant · Solde 1 234,56 €</div>
      {''.join(items)}
    </body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None)
    for dark in (False, True):
        page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
        page.set_content(html(dark))
        name = 'banque-fictive-sombre.png' if dark else 'banque-fictive-clair.png'
        page.screenshot(path=str(HERE / 'images' / name))
        page.close()
    browser.close()
