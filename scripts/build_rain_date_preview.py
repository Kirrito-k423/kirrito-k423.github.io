"""Draw an attributed SVG preview from the planner's real map data, not a screenshot."""
import json
import math
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'hangzhou-rain-date' / 'data'
context = json.loads((DATA / 'context.geojson').read_text())
anchors = json.loads((DATA / 'anchors.json').read_text())
routes = json.loads((DATA / 'walking-routes.json').read_text())['routes']

def mercator(lat):
    return math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))

west, east = 120.1546, 120.1633
north, south = mercator(30.2591), mercator(30.2541)

def point(coordinate):
    lng, lat = coordinate
    return ((lng - west) / (east - west) * 1440,
            (north - mercator(lat)) / (north - south) * 960)

def path(coordinates, close=False):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in map(point, coordinates)) + (' Z' if close else '')

def geometry(geom):
    if geom['type'] == 'LineString':
        return path(geom['coordinates'])
    if geom['type'] == 'Polygon':
        return ' '.join(path(ring, True) for ring in geom['coordinates'])
    if geom['type'] == 'MultiPolygon':
        return ' '.join(path(ring, True) for polygon in geom['coordinates'] for ring in polygon)
    return ''

parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960" viewBox="0 0 1440 960" role="img" aria-labelledby="title desc">
<title id="title">湖滨雨天约会地图 · 路网示意预览</title>
<desc id="desc">以实际OpenStreetMap道路和FOSSGIS步行路线绘制，标出龙翔桥、in77与工联CC。此图为示意预览，不是网页截图。</desc>
<defs><clipPath id="viewport"><rect width="1440" height="960" rx="0"/></clipPath><filter id="shadow" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="12" flood-color="#203633" flood-opacity=".12"/></filter></defs>
<rect width="1440" height="960" fill="#f1f1e9"/>
<g clip-path="url(#viewport)" stroke-linecap="round" stroke-linejoin="round">''']
for feature in context['features']:
    props, geom = feature['properties'], feature['geometry']
    d = geometry(geom)
    if not d or geom['type'] == 'LineString':
        continue
    fill = '#d7e8e8' if props.get('natural') == 'water' else '#e0e0d7' if props.get('building') else '#e3e9da'
    parts.append(f'<path d="{d}" fill="{fill}" fill-rule="evenodd" stroke="#d0d5cc" stroke-width="1"/>')
for feature in context['features']:
    props, geom = feature['properties'], feature['geometry']
    if geom['type'] != 'LineString' or not props.get('highway') or props.get('tunnel') == 'yes':
        continue
    d = geometry(geom)
    width = 13 if props['highway'] in ('primary', 'secondary', 'tertiary', 'residential') else 7
    parts.append(f'<path d="{d}" fill="none" stroke="#d9ddd5" stroke-width="{width+3}"/><path d="{d}" fill="none" stroke="#fffefa" stroke-width="{width}"/>')
for start, end in [('station','in77b'), ('in77b','gonglian'), ('gonglian','in77c')]:
    d = geometry(routes[f'{start}>{end}']['geometry'])
    parts.append(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="15"/><path d="{d}" fill="none" stroke="#506d60" stroke-width="8"/>')
parts.append('</g><g font-family="system-ui, -apple-system, PingFang SC, sans-serif">')
for key, dx, dy, text in [
    ('station',-154,22,'龙翔桥 C口'), ('in77b',-150,-80,'in77 B区'),
    ('gonglian',28,-28,'工联CC · 桌游'), ('in77c',28,-20,'in77 C2区'),
    ('hubin88',-185,22,'湖滨88 · 手工')]:
    a = anchors[key]
    x, y = point([a['lng'],a['lat']])
    width = 208 if key in ('gonglian','hubin88') else 180
    parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="#506d60" stroke="#fff" stroke-width="6"/><g transform="translate({x+dx:.1f} {y+dy:.1f})" filter="url(#shadow)"><rect width="{width}" height="55" rx="18" fill="#fff"/><text x="18" y="36" font-size="24" font-weight="600" fill="#263d34">{escape(text)}</text></g>')
parts.append('''<g filter="url(#shadow)"><rect x="48" y="40" width="670" height="157" rx="28" fill="#fffefa"/>
<text x="80" y="88" fill="#6f8177" font-size="19" letter-spacing="3">HANGZHOU / RAINY DAY PLANNER</text>
<text x="80" y="143" fill="#263d34" font-size="43" font-weight="700">湖滨雨天约会地图</text>
<rect x="48" y="755" width="606" height="135" rx="25" fill="#fffefa"/>
<text x="80" y="806" font-size="29" font-weight="600" fill="#263d34">选地点 → 连路线 → 看预算</text>
<text x="80" y="853" font-size="23" fill="#6f8177">地图选点 · 路段详情 · 沿真实道路播放</text></g>
<rect x="1030" y="49" width="350" height="50" rx="25" fill="#263d34"/>
<text x="1205" y="82" text-anchor="middle" font-size="21" fill="#fffefa">实际路网 · 示意预览</text>
<rect x="0" y="919" width="1440" height="41" fill="#fffefa" fill-opacity=".94"/>
<text x="24" y="947" font-size="16" fill="#65766c">© OpenStreetMap contributors · 路线：FOSSGIS OSRM foot · 数据：2026-11-09 · 建筑代表点，楼内换层未绘制</text>
</g></svg>''')
target = ROOT / 'assets/previews/rain-date.svg'
target.write_text('\n'.join(parts) + '\n')
print(f'Wrote {target.relative_to(ROOT)} ({target.stat().st_size:,} bytes)')
