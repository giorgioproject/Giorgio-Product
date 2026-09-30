#!/usr/bin/env python3
"""Refresh landmark photos from Wikimedia / Flickr (CC). Run from repo root."""

from __future__ import annotations

import os
import time
import urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "landmarks")
UA = "BarbaraChase/1.0 (education; landmark photo refresh)"

# Verified to match the place name in data/landmarks-*.json (thumb or direct URLs).
LANDMARK_URLS: dict[str, str] = {
    # Downtown Santa Barbara
    "stearns-wharf": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Stearns_Wharf_-_Santa_Barbara%2C_California.jpg/1280px-Stearns_Wharf_-_Santa_Barbara%2C_California.jpg",
    "courthouse": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Santa_Barbara_County_Courthouse.jpg/1280px-Santa_Barbara_County_Courthouse.jpg",
    "granada-theatre": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Santa_Barbara_Granada_Theater.jpg/1280px-Santa_Barbara_Granada_Theater.jpg",
    "arlington-theatre": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Arlington_Theater_Santa_Barbara.jpg/1280px-Arlington_Theater_Santa_Barbara.jpg",
    "funk-zone": "https://live.staticflickr.com/65535/49742490472_2168d37abb_b.jpg",
    "el-presidio": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/El_Presidio_Real_de_Santa_B%C3%A1rbara.jpg/1280px-El_Presidio_Real_de_Santa_B%C3%A1rbara.jpg",
    "moxi": "https://live.staticflickr.com/1866/43359186245_fec3d66961_b.jpg",
    "paseo-nuevo": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Paseo_Nuevo%2C_State_Street%2C_Santa_Barbara%2C_CA_%2853926818421%29.jpg/1280px-Paseo_Nuevo%2C_State_Street%2C_Santa_Barbara%2C_CA_%2853926818421%29.jpg",
    # Solvang
    "solvang-windmill": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Solvang_California_Windmill.jpg/1280px-Solvang_California_Windmill.jpg",
    "mission-santa-ines": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Mission_Santa_In%C3%A9s_Church.jpg/1280px-Mission_Santa_In%C3%A9s_Church.jpg",
    "olsens-bakery": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Danish_bakery%2C_Solvang%2C_CA%2C_USA_%289503103424%29.jpg/1280px-Danish_bakery%2C_Solvang%2C_CA%2C_USA_%289503103424%29.jpg",
    "elverhoj-museum": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Elverh%C3%B8j_Museum_of_History_and_Art.jpg/1280px-Elverh%C3%B8j_Museum_of_History_and_Art.jpg",
    "solvang-festival-theater": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Solvang_Festival_Theater_front_1.jpg/1280px-Solvang_Festival_Theater_front_1.jpg",
    # Copenhagen Drive shop row (no CC photo of Ingeborg's storefront on Commons).
    "ingeborg-chocolates": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Solvang%2C_CA%2C_USA_%289500330569%29_%282%29.jpg/1280px-Solvang%2C_CA%2C_USA_%289500330569%29_%282%29.jpg",
    # Isla Vista
    "iv-freebirds": "https://live.staticflickr.com/36/111473532_a256e43370_b.jpg",
    "iv-deli-mart": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Isla_Vista_CA_%282014%29_03.JPG/1280px-Isla_Vista_CA_%282014%29_03.JPG",
    "iv-pardall-tunnel": "https://live.staticflickr.com/8616/16516899000_e42754fc3f_b.jpg",
    "iv-embarcadero": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Kevin_Moran_plaque.jpg",
    "iv-perfect-park": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Isla_Vista_CA_%282014%29_02.JPG/1280px-Isla_Vista_CA_%282014%29_02.JPG",
    # Pardall / loop — Super Cuca's is on Madrid just off this strip (no CC storefront found).
    "iv-super-cucas": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Isla_Vista_CA_%282014%29_02.JPG/1280px-Isla_Vista_CA_%282014%29_02.JPG",
    "iv-ucsb": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/UCSB_University_Center_and_Storke_Tower.jpg/1280px-UCSB_University_Center_and_Storke_Tower.jpg",
}


def download(dest: str, url: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    if len(data) < 15_000:
        raise RuntimeError(f"download too small ({len(data)} bytes)")
    with open(dest, "wb") as f:
        f.write(data)


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    for lid, url in LANDMARK_URLS.items():
        time.sleep(2)
        dest = os.path.join(ROOT, f"{lid}.jpg")
        try:
            download(dest, url)
            print("ok", lid, os.path.getsize(dest))
        except Exception as exc:
            print("fail", lid, exc)


if __name__ == "__main__":
    main()
