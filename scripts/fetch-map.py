#!/usr/bin/env python3
"""Fetch Overpass OSM → data/graph-<map-id>.json (one-time, run locally)."""

import json
import math
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

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

# Tight downtown cores — roughly 5×5–7×7 blocks each
MAPS = {
    # State Street corridor — similar footprint to Solvang
    "downtown-santa-barbara": {
        "south": 34.404,
        "west": -119.714,
        "north": 34.426,
        "east": -119.681,
    },
    # Solvang village grid + Mission/Alisal corridor (similar footprint to downtown SB)
    "solvang": {
        "south": 34.587,
        "west": -120.155,
        "north": 34.606,
        "east": -120.122,
    },
    # Isla Vista street grid (Del Playa through campus edge)
    "isla-vista": {
        "south": 34.403,
        "west": -119.872,
        "north": 34.418,
        "east": -119.848,
    },
}


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


def fetch_overpass(bbox):
    q = f"""
[out:json][timeout:120];
(
  way["highway"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
);
out body;
>;
out skel qt;
"""
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]
    last_err = None
    for url in endpoints:
        req = urllib.request.Request(
            url,
            data=f"data={urllib.request.quote(q)}".encode(),
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "BarbaraChase/1.0 (student prototype)",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read())
        except Exception as e:
            last_err = e
            print(f"  Overpass {url} failed: {e}", file=sys.stderr)
    raise last_err


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


def build_graph(bbox):
    data = fetch_overpass(bbox)
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
    filtered_edges = [e for e in edges if e["from"] in keep_nodes and e["to"] in keep_nodes]
    filtered_edges, nodes = merge_playable_chains(filtered_edges, nodes)

    return {"bbox": bbox, "nodes": nodes, "edges": filtered_edges}


def merge_playable_chains(edges, nodes):
    """Join short OSM fragments into longer street segments (cleaner chase grid)."""
    next_id = max(int(e["id"][1:]) for e in edges) + 1 if edges else 0
    changed = True
    while changed:
        changed = False
        by_node = defaultdict(list)
        for e in edges:
            if not e["playable"]:
                continue
            by_node[e["from"]].append(e)
            by_node[e["to"]].append(e)

        for nid, incident in list(by_node.items()):
            if len(incident) != 2:
                continue
            e1, e2 = incident
            if e1["id"] == e2["id"]:
                continue

            n1 = (e1.get("streetName") or "").strip()
            n2 = (e2.get("streetName") or "").strip()
            if n1 and n2 and n1 != n2:
                continue
            if e1["highway"] != e2["highway"]:
                continue

            def other_node(edge, at):
                return edge["to"] if edge["from"] == at else edge["from"]

            a = other_node(e1, nid)
            b = other_node(e2, nid)
            merged = {
                "id": f"e{next_id}",
                "from": a,
                "to": b,
                "streetName": n1 or n2,
                "highway": e1["highway"],
                "playable": True,
                "lengthM": round(e1["lengthM"] + e2["lengthM"], 2),
            }
            next_id += 1
            edges = [
                e
                for e in edges
                if e["id"] not in (e1["id"], e2["id"])
                and e["from"] != nid
                and e["to"] != nid
            ]
            edges.append(merged)
            nodes = [n for n in nodes if n["id"] != nid]
            changed = True
            break

    node_by_id = {n["id"]: n for n in nodes}
    edges = [
        e
        for e in edges
        if e["from"] in node_by_id and e["to"] in node_by_id
    ]
    used_ids = set()
    for e in edges:
        used_ids.add(e["from"])
        used_ids.add(e["to"])
    nodes = [node_by_id[i] for i in used_ids]
    return edges, nodes


def main():
    map_ids = sys.argv[1:] if len(sys.argv) > 1 else list(MAPS.keys())
    data_dir = ROOT / "data"
    data_dir.mkdir(exist_ok=True)

    for map_id in map_ids:
        if map_id not in MAPS:
            print(f"Unknown map: {map_id}", file=sys.stderr)
            sys.exit(1)
        bbox = MAPS[map_id]
        print(f"Fetching {map_id} …")
        graph = build_graph(bbox)
        out_path = data_dir / f"graph-{map_id}.json"
        with open(out_path, "w") as f:
            json.dump(graph, f, indent=2)
        playable = sum(1 for e in graph["edges"] if e["playable"])
        print(
            f"  → {out_path.name}: {len(graph['nodes'])} nodes, "
            f"{len(graph['edges'])} edges ({playable} playable)"
        )


if __name__ == "__main__":
    main()
