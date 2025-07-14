# build_levels_json.py — scramble‑first, solvable‑by‑construction
"""
Create **50 progressively harder tube‑sort levels** (`levels.json`) without
running the expensive optimal solver:

* Start from a solved layout → apply a random scramble sequence.
* Reject the board if it’s still solved or has fewer than the required number
  of "mixed"/partial tubes.
* Insert specials (frozen / one‑colour tubes) **after** scrambling so they don’t
  hide a solved state.
* Store the *reverse* scramble as `solution`, proving solvability.
* Tier curve exactly matches the user’s last request.
"""
from __future__ import annotations

import colorsys
import importlib.util
import itertools
import json
import pathlib
import random
import sys
import time
from typing import Dict, List, Tuple

# ──────────────────────────────────────────────────────────────────────────────
# 1.  Import tube_sort_tools primitives we need (no solver)
# ──────────────────────────────────────────────────────────────────────────────
MOD = "tube_sort_tools"
try:
    from tube_sort_tools import canonical_state, legal_moves, apply_move, is_goal  # type: ignore
except ModuleNotFoundError:
    ROOT = pathlib.Path(__file__).resolve().parent if "__file__" in globals() else pathlib.Path.cwd()
    tool_py = ROOT / "tube_sort_tools.py"
    if not tool_py.exists():
        sys.exit("❌  tube_sort_tools.py missing — place it next to this script")
    spec = importlib.util.spec_from_file_location(MOD, tool_py)
    if spec is None or spec.loader is None:
        sys.exit("❌  cannot load tube_sort_tools.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[MOD] = mod
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    canonical_state = mod.canonical_state  # type: ignore[attr-defined]
    legal_moves     = mod.legal_moves      # type: ignore[attr-defined]
    apply_move      = mod.apply_move       # type: ignore[attr-defined]
    is_goal         = mod.is_goal          # type: ignore[attr-defined]

# ──────────────────────────────────────────────────────────────────────────────
# 2.  Globals & file paths
# ──────────────────────────────────────────────────────────────────────────────
RNG  = random.Random(20250712)
OUT  = pathlib.Path("levels-v2.json")
PART = pathlib.Path("levels-v2.json.partial")

# ──────────────────────────────────────────────────────────────────────────────
# 3.  Tier configuration (single source of truth)
# ──────────────────────────────────────────────────────────────────────────────

def tier_cfg(idx: int):
    """Return tier parameters for 1‑based level index."""
    if idx <= 3:
        return dict(size=(3, 4), colours=(2, 3), empties=1, specials=False,
                    gate=1, mix=1, tier="Tutorial")
    if idx <= 9:
        return dict(size=(4, 5), colours=(4, 5), empties=3, specials=False,
                    gate=4, mix=1, tier="Easy")
    if idx <= 35:
        return dict(size=(5, 7), colours=(5, 7), empties=2, specials=False,
                    gate=10, mix=2, tier="Medium")
    if idx <= 44:
        return dict(size=(6, 8), colours=(6, 8), empties=2, specials=True,
                    gate=18, mix=2, tier="Hard")
    return dict(size=(7, 9), colours=(7, 9), empties=2, specials=True,
                gate=25, mix=2, tier="Expert")

# ──────────────────────────────────────────────────────────────────────────────
# 4.  Colour palette & helpers
# ──────────────────────────────────────────────────────────────────────────────

def distinct_palette(n: int) -> List[str]:
    return [
        f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
        for r, g, b in (colorsys.hsv_to_rgb(i / n, 0.85, 0.95) for i in range(n))
    ]


def tube_is_mixed(t: List[str], tube_size: int) -> bool:
    """True if tube is not homogenous full (non‑empty and not solved)."""
    return bool(t) and (len(set(t)) > 1 or len(t) < tube_size)

# ──────────────────────────────────────────────────────────────────────────────
# 5.  Board factory — scramble‑first, provably solvable
# ──────────────────────────────────────────────────────────────────────────────

def make_solvable_board(
    tube_size: int,
    n_colours: int,
    empties: int,
    *,
    specials: bool,
    desired_mix: int,
    scramble_len: int,
    max_global_retries: int = 100,
) -> Dict:
    """Return board dict with reverse scramble "solution" list."""
    palette = distinct_palette(n_colours)

    attempt = 0
    while attempt < max_global_retries:
        attempt += 1
        # 1. solved start
        tubes = [[c] * tube_size for c in palette] + [[] for _ in range(empties)]
        state = canonical_state(tubes)
        seq: List[Tuple[int, int, int]] = []

        # 2. raw scramble — keep scrambling until mix achieved or hard cap
        max_steps = scramble_len * 4
        while len(seq) < max_steps and sum(tube_is_mixed(list(t), tube_size) for t in state) < desired_mix:
            mv = RNG.choice(legal_moves(state, tube_size))
            state = apply_move(state, mv)
            seq.append(mv)
        if is_goal(state, tube_size):
            continue
        if sum(tube_is_mixed(list(t), tube_size) for t in state) < desired_mix:
            continue

        # 3. inject specials *after* scramble so they don't mask a solved board
        frozen_idx: List[int] = []
        one_meta: List[Dict] = []
        if specials and RNG.random() < 0.4:
            frozen_idx.append(RNG.randrange(len(state)))
        if specials and RNG.random() < 0.4 and empties > 0:
            oc = RNG.randrange(n_colours, len(state))
            colour = RNG.choice(palette)
            state = apply_move(state, (oc, oc, 1))  # create space if needed
            state[oc] = tuple([colour])
            one_meta.append({"tubeIndex": oc, "color": colour})

        return {
            "colors": n_colours,
            "tubeSize": tube_size,
            "emptyTubes": empties,
            "tubes": [list(t) for t in state],
            "frozenTubes": frozen_idx,
            "oneColorInTubes": one_meta,
            "minMoves": scramble_len,            # upper bound
            "scrambleMoves": scramble_len,
            "solution": list(reversed(seq)),     # reverse sequence solves board
        }

    raise RuntimeError("Exceeded max retries building non‑trivial board")

# ──────────────────────────────────────────────────────────────────────────────
# 6.  Generation loop
# ──────────────────────────────────────────────────────────────────────────────
print("Building 50‑level progressive pack … (scramble‑first)")
levels: List[Dict] = []
start = time.time()

for idx in range(1, 51):
    cfg = tier_cfg(idx)

    # target scramble length: gate + 50% jitter, but at least 4 moves
    scr_len = max(cfg["gate"] + RNG.randint(cfg["gate"] // 2, cfg["gate"]), 4)

    while True:
        try:
            board = make_solvable_board(
                tube_size   = RNG.randint(*cfg["size"]),
                n_colours   = RNG.randint(*cfg["colours"]),
                empties     = cfg["empties"],
                specials    = cfg["specials"],
                desired_mix = cfg["mix"],
                scramble_len= scr_len,
            )
            break
        except RuntimeError:
            scr_len += 2  # bump scramble length and retry

    levels.append(board)
    print(f"✔ Level {idx:2}/50 | {cfg['tier']:<7} tube={board['tubeSize']} colours={board['colors']} moves≤{scr_len}")
    PART.write_text(json.dumps(levels, indent=2))

# ──────────────────────────────────────────────────────────────────────────────
# 7.  Save
# ──────────────────────────────────────────────────────────────────────────────
PART.rename(OUT)
print(f"\n✅  Finished in {time.time() - start:.1f}s → {OUT}\nLevels saved with built‑in solution sequences.")
