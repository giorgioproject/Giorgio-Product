#!/usr/bin/env python3
"""Process data/osm-raw.json → data/streets.json"""

import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "fetch_streets", Path(__file__).parent / "fetch-streets.py"
)
fetch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch)


def main():
    with open("data/osm-raw.json") as f:
        data = json.load(f)

    nodes_raw = {}
    ways = []
    for el in data["elements"]:
        if el["type"] == "node":
            nodes_raw[el["id"]] = {"lat": el["lat"], "lon": el["lon"]}
        elif el["type"] == "way":
            ways.append(el)

    from collections import defaultdict

    edges = []
    edge_id = 0
    playable_adj = defaultdict(set)

    for way in ways:
        tags = way.get("tags", {})
        playable = fetch.is_playable(tags)
        name = tags.get("name", tags.get("ref", ""))
        highway = tags.get("highway", "")
        refs = way.get("nodes", [])
        for i in range(len(refs) - 1):
            a, b = refs[i], refs[i + 1]
            if a not in nodes_raw or b not in nodes_raw:
                continue
            na, nb = nodes_raw[a], nodes_raw[b]
            length = fetch.haversine_m(na["lat"], na["lon"], nb["lat"], nb["lon"])
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

    keep_nodes = fetch.largest_component(playable_adj)
    nodes = [
        {"id": str(nid), "lat": nodes_raw[int(nid)]["lat"], "lon": nodes_raw[int(nid)]["lon"]}
        for nid in keep_nodes
        if int(nid) in nodes_raw
    ]
    filtered_edges = [e for e in edges if e["from"] in keep_nodes and e["to"] in keep_nodes]

    out = {"bbox": fetch.BBOX, "nodes": nodes, "edges": filtered_edges}
    with open("data/streets.json", "w") as f:
        json.dump(out, f, indent=2)

    playable_count = sum(1 for e in filtered_edges if e["playable"])
    print(f"nodes={len(nodes)} edges={len(filtered_edges)} playable={playable_count}")


if __name__ == "__main__":
    main()
