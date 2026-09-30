#!/usr/bin/env python3
"""One-time fetch: Overpass OSM → data/streets.json (run locally, not at runtime)."""

import json
import math
import urllib.request
from collections import defaultdict

BBOX = {"south": 34.408, "west": -119.715, "north": 34.430, "east": -119.678}

PLAYABLE = {
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "residential",
    "unclassified",
    "living_street",
    "pedestrian",
}

DROP = {"motorway", "motorway_link", "trunk", "trunk_link"}

CLOSED_TYPES = {"service", "construction", "track", "path", "steps", "corridor"}


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def is_playable(tags):
    hw = tags.get("highway", "")
    if hw in DROP:
        return False
    access = tags.get("access", "")
    if access in ("private", "no"):
        return False
    if hw in CLOSED_TYPES:
        return False
    if tags.get("service") in ("alley", "driveway", "parking_aisle"):
        return False
    return hw in PLAYABLE


def fetch_overpass():
    q = f"""
[out:json][timeout:120];
(
  way["highway"]({BBOX['south']},{BBOX['west']},{BBOX['north']},{BBOX['east']});
);
out body;
>;
out skel qt;
"""
    req = urllib.request.Request(
        "https://overpass.kumi.systems/api/interpreter",
        data=f"data={urllib.request.quote(q)}".encode(),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "BarbaraChase/1.0 (student prototype)",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def largest_component(adj):
    if not adj:
        return set()
    seen = set()
    best = set()
    for start in adj:
        if start in seen:
            continue
        stack = [start]
        comp = set()
        while stack:
            n = stack.pop()
            if n in comp:
                continue
            comp.add(n)
            for nb in adj.get(n, []):
                if nb not in comp:
                    stack.append(nb)
        seen |= comp
        if len(comp) > len(best):
            best = comp
    return best


def main():
    data = fetch_overpass()
    nodes_raw = {}
    ways = []
    for el in data["elements"]:
        if el["type"] == "node":
            nodes_raw[el["id"]] = {"lat": el["lat"], "lon": el["lon"]}
        elif el["type"] == "way":
            ways.append(el)

    edges = []
    edge_id = 0
    playable_adj = defaultdict(set)

    for way in ways:
        tags = way.get("tags", {})
        playable = is_playable(tags)
        name = tags.get("name", tags.get("ref", ""))
        highway = tags.get("highway", "")
        refs = way.get("nodes", [])
        for i in range(len(refs) - 1):
            a, b = refs[i], refs[i + 1]
            if a not in nodes_raw or b not in nodes_raw:
                continue
            na, nb = nodes_raw[a], nodes_raw[b]
            length = haversine_m(na["lat"], na["lon"], nb["lat"], nb["lon"])
            if length < 1:
                continue
            eid = f"e{edge_id}"
            edge_id += 1
            edges.append(
                {
                    "id": eid,
                    "from": str(a),
                    "to": str(b),
                    "streetName": name,
                    "highway": highway,
                    "playable": playable,
                    "lengthM": round(length, 2),
                }
            )
            if playable:
                playable_adj[str(a)].add(str(b))
                playable_adj[str(b)].add(str(a))

    keep_nodes = largest_component(playable_adj)
    if not keep_nodes:
        raise SystemExit("No playable connected graph found")

    nodes = [
        {"id": str(nid), "lat": nodes_raw[int(nid)]["lat"], "lon": nodes_raw[int(nid)]["lon"]}
        for nid in keep_nodes
        if int(nid) in nodes_raw
    ]

    filtered_edges = []
    for e in edges:
        if e["from"] in keep_nodes and e["to"] in keep_nodes:
            filtered_edges.append(e)

    out = {
        "bbox": BBOX,
        "nodes": nodes,
        "edges": filtered_edges,
    }

    with open("data/streets.json", "w") as f:
        json.dump(out, f, indent=2)

    playable_count = sum(1 for e in filtered_edges if e["playable"])
    print(f"Wrote data/streets.json: {len(nodes)} nodes, {len(filtered_edges)} edges ({playable_count} playable)")


if __name__ == "__main__":
    main()
