# build_levels_json.py
"""
Generate a 50‑level tube‑sort pack with a clear, tiered difficulty ramp and
save it as `levels.json`.

Tiers
-----
Tier 1 (Easy)   : levels 1‑15  • tubeSize 4‑5 • 4‑5 colours • 3 empties • ≥4 moves
Tier 2 (Medium) : levels 16‑35 • tubeSize 5‑7 • 5‑7 colours • 2 empties • ≥10 moves
Tier 3 (Hard)   : levels 36‑45 • tubeSize 6‑8 • 6‑8 colours • 2 empties • specials • ≥18 moves
Tier 4 (Expert) : levels 46‑50 • tubeSize 7‑9 • 7‑9 colours • 2 empties • specials • ≥25 moves

Specials (tiers ≥3)
------------------
* **Frozen tube:** one solved tube that can’t be touched.
* **One‑colour target tube:** starts with a single token; may only contain that colour.

The script prints a ✔ line whenever it accepts a level, writes a partial
`levels.json.partial` on every accept, and finally renames it to
`levels.json`.

Requires `tube_sort_tools.py` in the same directory.
"""
from __future__ import annotations
import json, random, time, pathlib, sys, itertools
from typing import List, Dict, Tuple
from tube_sort_tools import solve_level, canonical_state, legal_moves, apply_move

RNG = random.Random(20250712)
OUT  = pathlib.Path("levels.json")
PART = pathlib.Path("levels.json.partial")

# ──────────────────────────────────────────────────────────────────────────────
# Utility helpers
# ──────────────────────────────────────────────────────────────────────────────

def rand_hex() -> str:
    """#RRGGBB colour."""
    return f"#{RNG.randrange(0x1000000):06x}"


def make_board(tube_size: int, n_colours: int, empties: int,
               *, add_frozen: bool, add_onecolour: bool) -> Dict:
    """Return a random board dict matching the requested parameters."""
    palette = [rand_hex() for _ in range(n_colours)]

    # Build solved tubes, then add empties
    tubes: List[List[str]] = [[c] * tube_size for c in palette]
    tubes.extend([[] for _ in range(empties)])
    total = len(tubes)

    frozen_idx: List[int] = []
    onecolour_meta: List[Dict] = []

    # ── specials ────────────────────────────────────────────
    if add_frozen:
        frozen_idx.append(RNG.randrange(n_colours))          # pick one solved tube

    if add_onecolour:
        empty_slots = list(range(n_colours, total))          # among empty tubes
        if empty_slots:
            oc_idx = RNG.choice(empty_slots)
            colour = RNG.choice(palette)
            tubes[oc_idx].append(colour)                    # seed with 1 token
            onecolour_meta.append({"tubeIndex": oc_idx, "color": colour})

    # ── scramble remaining tokens ──────────────────────────
    tokens = list(itertools.chain.from_iterable(tubes))
    RNG.shuffle(tokens)
    # clear all but the specials' valid tokens
    for i in range(total):
        if i in frozen_idx:
            continue
        tubes[i].clear()
    # re‑deal tokens respecting capacity & special rules
    for tok in tokens:
        while True:
            i = RNG.randrange(total)
            if len(tubes[i]) >= tube_size:
                continue
            if i in frozen_idx:
                continue                  # frozen already full
            if any(meta["tubeIndex"] == i for meta in onecolour_meta) and tok != tubes[i][0]:
                continue                  # one‑colour rule
            tubes[i].append(tok)
            break

    return {
        "colors": n_colours,
        "tubeSize": tube_size,
        "emptyTubes": empties,
        "tubes": tubes,
        "frozenTubes": frozen_idx,
        "oneColorInTubes": onecolour_meta,
    }


def tier_config(level_no: int):
    """Return the parameter ranges & gate for the given 1‑based level index."""
    if level_no <= 15:       # Tier 1: Easy
        return dict(size=(4, 5), colours=(4, 5), empty=3, specials=False, gate=4)
    if level_no <= 35:       # Tier 2: Medium
        return dict(size=(5, 7), colours=(5, 7), empty=2, specials=False, gate=10)
    if level_no <= 45:       # Tier 3: Hard
        return dict(size=(6, 8), colours=(6, 8), empty=2, specials=True,  gate=18)
    return dict(size=(7, 9), colours=(7, 9), empty=2, specials=True,  gate=25)  # Tier 4: Expert


# ──────────────────────────────────────────────────────────────────────────────
# Main generation loop
# ──────────────────────────────────────────────────────────────────────────────

levels: List[Dict] = []
start = time.time()
print("Building 50‑level progressive pack…")

level_idx = 0
attempts  = 0
while level_idx < 50:
    attempts += 1
    cfg = tier_config(level_idx + 1)

    size  = RNG.randint(*cfg["size"])
    cols  = RNG.randint(*cfg["colours"])
    empt  = cfg["empty"]
    board = make_board(size, cols, empt,
                       add_frozen   = cfg["specials"] and RNG.random() < 0.4,
                       add_onecolour= cfg["specials"] and RNG.random() < 0.4)
    try:
        _, opt = solve_level(board, time_limit=4)
    except ValueError:
        continue

    if opt < cfg["gate"]:
        continue

    board.update(minMoves=opt, actualMoves=opt, shuffleMoves=opt)
    levels.append(board)
    level_idx += 1

    # ── progress line & partial save ───────────────────────
    print(f"✔ Level {level_idx:2}/50 | tier={((level_idx-1)//15)+1} "
          f"tubeSize={size} colours={cols} minMoves={opt}")
    PART.write_text(json.dumps(levels, indent=2))

elapsed = time.time() - start
PART.rename(OUT)
print(f"\n✅  Finished in {elapsed:.1f}s  (attempts: {attempts}) → {OUT}")
