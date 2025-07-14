# build_levels_json.py
"""
Generate a 50‑level tube‑sort level pack (levels.json) with an explicit,
visually distinct colour palette and tiered difficulty progression.

Key fixes
---------
* **Removed stray duplicated code** that introduced the `SyntaxError`.
* `make_board()` now lives **once** in the file and relies on `distinct_palette` –
  no more undefined `rand_hex` or indentation issues.
* Colour palette: evenly‑spaced HSV → bright, distinguishable hues.

Run with:
```bash
python build_levels_json.py
```
You’ll see ✔ progress lines; the script writes `levels.json.partial` as it
goes, then renames it to `levels.json`.
"""
from __future__ import annotations

import importlib.util
import itertools
import json
import pathlib
import random
import sys
import time
import colorsys
from typing import Dict, List

# ──────────────────────────
# 1.  Load tube_sort_tools (robust to sandbox / missing __file__)
# ──────────────────────────
MODULE = "tube_sort_tools"
try:
    from tube_sort_tools import solve_level  # type: ignore
except ModuleNotFoundError:
    try:
        HERE = pathlib.Path(__file__).resolve().parent
    except NameError:  # __file__ missing in notebook / sandbox cell
        HERE = pathlib.Path.cwd()

    path = HERE / "tube_sort_tools.py"
    if not path.exists():
        sys.exit("❌ tube_sort_tools.py not found next to script.")
    spec = importlib.util.spec_from_file_location(MODULE, path)
    if spec is None or spec.loader is None:
        sys.exit("❌ cannot create spec for tube_sort_tools.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[MODULE] = mod
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    solve_level = mod.solve_level  # type: ignore[attr-defined]

# ──────────────────────────
# 2.  Globals & output handles
# ──────────────────────────
RNG = random.Random(20250712)
OUT = pathlib.Path("levels_v1.json")
PART = pathlib.Path("levels_v1.json.partial")

# ──────────────────────────
# 3.  Helpers
# ──────────────────────────

def distinct_palette(n: int) -> List[str]:
    """Return `n` vividly different #RRGGBB colours."""
    res: List[str] = []
    for i in range(n):
        r, g, b = colorsys.hsv_to_rgb(i / n, 0.85, 0.95)
        res.append(f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}")
    return res


def make_board(
    tube_size: int,
    n_colours: int,
    empties: int,
    *,
    add_frozen: bool,
    add_onecolour: bool,
) -> Dict:
    """Create one random, solvable board respecting specials & palette."""
    palette = distinct_palette(n_colours)

    tubes: List[List[str]] = [[c] * tube_size for c in palette]
    tubes.extend([[] for _ in range(empties)])
    total = len(tubes)

    frozen_idx: List[int] = []
    one_meta: List[Dict] = []

    if add_frozen:
        frozen_idx.append(RNG.randrange(n_colours))

    if add_onecolour:
        empties_idx = list(range(n_colours, total))
        if empties_idx:
            oc = RNG.choice(empties_idx)
            colour = RNG.choice(palette)
            tubes[oc].append(colour)  # seed token
            one_meta.append({"tubeIndex": oc, "color": colour})

    one_set = {m["tubeIndex"] for m in one_meta}

    # scramble
    tokens = list(itertools.chain.from_iterable(tubes))
    RNG.shuffle(tokens)

    for i in range(total):
        if i in frozen_idx or i in one_set:
            continue
        tubes[i].clear()

    for tok in tokens:
        while True:
            i = RNG.randrange(total)
            if len(tubes[i]) >= tube_size or i in frozen_idx:
                continue
            if i in one_set:
                required = next(m["color"] for m in one_meta if m["tubeIndex"] == i)
                if tok != required:
                    continue
            tubes[i].append(tok)
            break

    return {
        "colors": n_colours,
        "tubeSize": tube_size,
        "emptyTubes": empties,
        "tubes": tubes,
        "frozenTubes": frozen_idx,
        "oneColorInTubes": one_meta,
    }


def tier_cfg(idx: int):
    if idx <= 3:
        return dict(size=(3, 4), colours=(2, 3), empties=1, specials=False, gate=3)
    if idx <= 9:
        return dict(size=(4, 5), colours=(4, 5), empties=3, specials=False, gate=4)  
    if idx <= 35:
        return dict(size=(5, 7), colours=(5, 7), empties=2, specials=False, gate=10)
    if idx <= 44:
        return dict(size=(6, 8), colours=(6, 8), empties=2, specials=True, gate=18)
    return dict(size=(7, 9), colours=(7, 9), empties=2, specials=True, gate=25)

# ──────────────────────────
# 4.  Generation loop
# ──────────────────────────
print("Building 50‑level progressive pack …")
levels: List[Dict] = []
start = time.time()
level_num = 1
attempts = 0

while level_num <= 50:
    attempts += 1
    cfg = tier_cfg(level_num)

    size = RNG.randint(*cfg["size"])
    cols = RNG.randint(*cfg["colours"])
    empt = cfg["empties"]

    board = make_board(
        size,
        cols,
        empt,
        add_frozen=cfg["specials"] and RNG.random() < 0.4,
        add_onecolour=cfg["specials"] and RNG.random() < 0.4,
    )

    try:
        _, opt = solve_level(board, time_limit=4)
    except ValueError:
        continue

    if opt < cfg["gate"]:
        continue

    board.update(minMoves=opt, actualMoves=opt, shuffleMoves=opt)
    levels.append(board)

    tier = (level_num - 1) // 15 + 1
    print(f"✔ Level {level_num:2}/50 | tier={tier} tube={size} colours={cols} moves={opt}")
    PART.write_text(json.dumps(levels, indent=2))
    level_num += 1

# ──────────────────────────
# 5.  Finish
# ──────────────────────────
PART.rename(OUT)
print(f"\n✅  Finished in {time.time() - start:.1f}s (attempts: {attempts}) → {OUT}")
