"""
Regenerates france_phone_codes.geojson from:
  - data/france_departments.geojson         (real department boundaries, don't edit)
  - data/france_phone_code_mapping.json     (department code -> AB phone code, EDIT THIS)

Run from anywhere:
    python3 scripts/build_france_phone_codes.py
"""
import json
from pathlib import Path
from shapely.geometry import shape

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / 'data'

with open(DATA_DIR / 'france_departments.geojson', encoding='utf-8') as f:
    source = json.load(f)

with open(DATA_DIR / 'france_phone_code_mapping.json', encoding='utf-8') as f:
    ab_codes = json.load(f)

for feature in source['features']:
    code = feature['properties']['code']
    geom = shape(feature['geometry'])
    polys = geom.geoms if geom.geom_type == 'MultiPolygon' else [geom]
    largest = max(polys, key=lambda p: p.area)
    rep = largest.representative_point()

    feature['properties']['ab_code'] = ab_codes.get(code)
    feature['properties']['label_lat'] = round(rep.y, 4)
    feature['properties']['label_lng'] = round(rep.x, 4)

with open(REPO_ROOT / 'france_phone_codes.geojson', 'w', encoding='utf-8') as f:
    json.dump(source, f, ensure_ascii=False)

filled = sum(1 for v in ab_codes.values() if v)
print(f"Wrote france_phone_codes.geojson - {filled}/{len(ab_codes)} codes filled in")
