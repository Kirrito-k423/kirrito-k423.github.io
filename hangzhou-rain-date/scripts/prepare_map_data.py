"""Build a small, attributed map context and real pedestrian route snapshot.

Usage: python3 prepare_map_data.py path/to/overpass-geometry.json
Only the named, fixed public destinations are routed. The FOSSGIS service is
queried sequentially, at less than one request per second, with a local cache.
"""
import itertools
import json
import os
from pathlib import Path
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UA = "HubinRainDatePlanner/2.0 (+https://kirrito-k423.github.io/hangzhou-rain-date/)"
ANCHORS = {
    "station": {"name": "龙翔桥C口", "lat": 30.2564367, "lng": 120.1590868, "osm": "node/5027727108", "kind": "entrance"},
    "in77b": {"name": "in77 B区", "lat": 30.2571325, "lng": 120.1587659, "osm": "way/513389578", "kind": "building"},
    "in77c": {"name": "in77 C2区", "lat": 30.2545563, "lng": 120.1600676, "osm": "way/260711006", "kind": "building"},
    "gonglian": {"name": "工联CC", "lat": 30.2570658, "lng": 120.1599794, "osm": "way/29993237", "kind": "building"},
    "hubin88": {"name": "湖滨88", "lat": 30.2570853, "lng": 120.157655, "osm": "way/389863636", "kind": "building"},
    "book": {"name": "悦览树", "lat": 30.2523237, "lng": 120.1635693, "osm": "node/3522188774", "kind": "poi"},
}


def ring_join(segments):
    remaining = [list(s) for s in segments if len(s) > 1]
    rings = []
    while remaining:
        ring = remaining.pop(0)
        while ring[0] != ring[-1]:
            found = False
            for i, part in enumerate(remaining):
                if part[0] == ring[-1]:
                    ring += part[1:]
                elif part[-1] == ring[-1]:
                    ring += list(reversed(part))[1:]
                else:
                    continue
                remaining.pop(i)
                found = True
                break
            if not found:
                break
        if len(ring) >= 4 and ring[0] == ring[-1]:
            rings.append(ring)
    return rings


def main():
    DATA.mkdir(exist_ok=True)
    raw = json.loads(Path(sys.argv[1]).read_text())
    features = []
    for obj in raw["elements"]:
        tags = obj.get("tags", {})
        props = {k: tags[k] for k in ("name", "highway", "building", "covered", "tunnel", "indoor", "layer", "natural", "leisure") if k in tags}
        props["osm_id"] = f'{obj["type"]}/{obj["id"]}'
        if obj["type"] == "way" and obj.get("geometry"):
            coords = [[round(p["lon"], 7), round(p["lat"], 7)] for p in obj["geometry"] if "lon" in p]
            if len(coords) < 2:
                continue
            polygon = len(coords) >= 4 and coords[0] == coords[-1] and ("building" in tags or tags.get("natural") == "water" or tags.get("leisure") == "park" or tags.get("area") == "yes")
            geometry = {"type": "Polygon", "coordinates": [coords]} if polygon else {"type": "LineString", "coordinates": coords}
            features.append({"type": "Feature", "properties": props, "geometry": geometry})
        elif obj["type"] == "relation" and tags.get("natural") == "water":
            parts = [[[p["lon"], p["lat"]] for p in m.get("geometry", []) if "lon" in p] for m in obj.get("members", []) if m.get("role") == "outer"]
            rings = ring_join(parts)
            if rings:
                features.append({"type": "Feature", "properties": props, "geometry": {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}})
    context = {"type": "FeatureCollection", "source": "OpenStreetMap contributors / Overpass API", "osm_base": raw.get("osm3s", {}).get("timestamp_osm_base"), "snapshot_date": "2026-11-09", "features": features}
    (DATA / "context.geojson").write_text(json.dumps(context, ensure_ascii=False, separators=(",", ":")))
    (DATA / "anchors.json").write_text(json.dumps(ANCHORS, ensure_ascii=False, indent=2))

    cache_file = DATA / "walking-routes.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {"profile": "foot", "source": "FOSSGIS OSRM pedestrian routing / OpenStreetMap", "service": "https://routing.openstreetmap.de/routed-foot/route/v1/foot/", "snapshot_date": "2026-11-09", "routes": {}}
    proxy = os.environ.get("HUBIN_DATA_PROXY")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({"http": proxy, "https": proxy}) if proxy else urllib.request.ProxyHandler())
    last_request = 0
    for a, b in itertools.permutations(ANCHORS, 2):
        key = f"{a}>{b}"
        if key in cache["routes"]:
            continue
        first, last = ANCHORS[a], ANCHORS[b]
        coordinates = f'{first["lng"]},{first["lat"]};{last["lng"]},{last["lat"]}'
        endpoint = cache["service"] + coordinates + "?overview=full&geometries=geojson&steps=true&alternatives=false"
        time.sleep(max(0, 1.1 - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        request = urllib.request.Request(endpoint, headers={"User-Agent": UA})
        with opener.open(request, timeout=35) as response:
            result = json.load(response)
        if result.get("code") != "Ok":
            raise RuntimeError(f"{key}: {result.get('code')}")
        route = result["routes"][0]
        steps = []
        for step in route["legs"][0]["steps"]:
            steps.append({"name": step.get("name", ""), "distance": step["distance"], "duration": step["duration"], "maneuver": step.get("maneuver", {})})
        record = {"from": a, "to": b, "distance": route["distance"], "duration": route["duration"], "geometry": route["geometry"], "steps": steps, "waypoints": [{"location": w["location"], "distance": w["distance"], "name": w.get("name", "")} for w in result["waypoints"]]}
        assert len(record["geometry"]["coordinates"]) >= 2
        assert all(w["distance"] < 150 for w in record["waypoints"]), f"{key}: excessive road snap"
        cache["routes"][key] = record
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":")))
        print(f'{key}: {route["distance"]:.0f} m, {len(record["geometry"]["coordinates"])} road vertices', flush=True)
    print(f"Prepared {len(features)} map features and {len(cache['routes'])} directed pedestrian routes", flush=True)


if __name__ == "__main__":
    main()
