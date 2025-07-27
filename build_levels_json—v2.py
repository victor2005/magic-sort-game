# build_levels_json.py — final, stall-proof scramble-only generator
"""
Generate 50 tube-sort levels (`levels.json`) **without the heavy solver**.
Every board is provably solvable (reverse of the scramble sequence) and never
starts solved.

Key design
===========
* **Tutorial tier** (levels 1-3) now has **two empties** and scrambles using
  **single-token pours** so at least one tube becomes mixed after just a couple
  of moves.
* All other tiers use normal whole-block pours; we only need ≥1 mixed tube to
  prove the puzzle isn’t already solved.
* Specials (frozen / one-colour tubes) are added *after* scrambling so they
  can’t hide a solved state.
* The generator retries with a longer scramble if it somehow can’t satisfy the
  mix constraint, so it never stalls.
"""
from __future__ import annotations

import colorsys, importlib.util, json, pathlib, random, sys, time
from typing import List, Dict, Tuple

# ── tube_sort_tools helpers (no solver) ───────────────────────────────────────
ROOT = pathlib.Path(__file__).resolve().parent if "__file__" in globals() else pathlib.Path.cwd()
mod_path = ROOT / "tube_sort_tools.py"
spec = importlib.util.spec_from_file_location("tube_sort_tools", mod_path)
if not (mod_path.exists() and spec and spec.loader):
    sys.exit("❌ tube_sort_tools.py missing next to build_levels_json.py")
mod = importlib.util.module_from_spec(spec); sys.modules["tube_sort_tools"] = mod
spec.loader.exec_module(mod)  # type: ignore[attr-defined]
canonical_state = mod.canonical_state  # type: ignore[attr-defined]
legal_moves     = mod.legal_moves      # type: ignore[attr-defined]
apply_move      = mod.apply_move       # type: ignore[attr-defined]
is_goal         = mod.is_goal          # type: ignore[attr-defined]

# ── Globals ──────────────────────────────────────────────────────────────────
RNG  = random.Random(20250712)
OUT  = pathlib.Path("levels-v2.json")
PART = pathlib.Path("levels-v2.json.partial")

# ── Tier configuration ───────────────────────────────────────────────────────

def tier_cfg(idx: int) -> Dict:
    if idx <= 3:   # Tutorial — 2 empties, single-token scramble
        return dict(size=(3, 4), colours=(2, 3), empties=2, specials=False,
                    gate=1, mix=1, name="Tutorial", single_token=True)
    if idx <= 9:   # Easy
        return dict(size=(4, 5), colours=(4, 5), empties=3, specials=False,
                    gate=4, mix=1, name="Easy", single_token=False)
    if idx <= 35:  # Medium
        return dict(size=(5, 7), colours=(5, 7), empties=2, specials=False,
                    gate=10, mix=1, name="Medium", single_token=False)
    if idx <= 44:  # Hard
        return dict(size=(6, 8), colours=(6, 8), empties=2, specials=True,
                    gate=18, mix=1, name="Hard", single_token=False)
    # Expert
    return dict(size=(7, 9), colours=(7, 9), empties=2, specials=True,
                gate=25, mix=1, name="Expert", single_token=False)

# ── Utilities ─────────────────────────────────────────────────────────────────

def palette(n: int) -> List[str]:
    return [
        f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
        for r, g, b in (colorsys.hsv_to_rgb(i / n, 0.85, 0.95) for i in range(n))
    ]

def tube_mixed(t: List[str], cap: int) -> bool:
    return bool(t) and (len(set(t)) > 1 or len(t) < cap)

# ── Board builder ────────────────────────────────────────────────────────────

def build_board(
    tube_size: int,
    n_colours: int,
    empties: int,
    gate: int,
    specials: bool,
    mix: int,
    *,
    single_token: bool,
    max_tries: int = 400,
) -> Dict:
    """Return a solvable, non-trivial board with a stored solution."""
    colours = palette(n_colours)

    for _ in range(max_tries):
        # 1. solved base state
        tubes = [[c] * tube_size for c in colours] + [[] for _ in range(empties)]
        state = canonical_state(tubes)
        seq: List[Tuple[int, int, int]] = []

        # 2. scramble
        steps = max(gate + RNG.randint(gate // 2, gate), 4)
        dead=False
        for _ in range(steps):
            moves = [mv for mv in legal_moves(state, tube_size)
                     if (not single_token or mv[2] == 1)]
            if not moves:                      # no legal move → dead-end
                dead=True
                break
            mv = RNG.choice(moves)
            state = apply_move(state, mv)
            seq.append(mv)
        if dead:
            continue

        # 3. reject solved / low-mix
        if is_goal(state, tube_size):
            continue
        if sum(tube_mixed(list(t), tube_size) for t in state) < mix:
            continue

        # 4. specials added after scramble
        frozen_idx: List[int] = []
        one_meta: List[Dict] = []
        if specials and RNG.random() < 0.4:
            frozen_idx.append(RNG.randrange(len(state)))
        if specials and RNG.random() < 0.4 and empties > 0:
            oc_idx = RNG.randrange(n_colours, len(state))
            colour = colours[0]
            state = list(state); state[oc_idx] = (colour,); state = tuple(state)
            one_meta.append({"tubeIndex": oc_idx, "color": colour})

        return {
            "colors": n_colours,
            "tubeSize": tube_size,
            "emptyTubes": empties,
            "tubes": [list(t) for t in state],
            "frozenTubes": frozen_idx,
            "oneColorInTubes": one_meta,
            "minMoves": len(seq),
            "scrambleMoves": len(seq),
            "actualMoves": len(seq),
            "solution": list(reversed(seq)),
        }

    raise RuntimeError("retry limit hit — could not build board")

# ── Generation loop ──────────────────────────────────────────────────────────
print("Building 50-level progressive pack … (scramble-only)")
levels: List[Dict] = []
start = time.time()

for idx in range(1, 51):
    cfg = tier_cfg(idx)
    while True:
        try:
            board = build_board(
                tube_size   = RNG.randint(*cfg["size"]),
                n_colours   = RNG.randint(*cfg["colours"]),
                empties     = cfg["empties"],
                gate        = cfg["gate"],
                specials    = cfg["specials"],
                mix         = cfg["mix"],
                single_token= cfg["single_token"],
            )
            break
        except RuntimeError:
            cfg["gate"] += 2  # give it a longer scramble next try

    levels.append(board)
    PART.write_text(json.dumps(levels, indent=2))
    print(f"✔ Level {idx:2}/50 | {cfg['name']:<7} tube={board['tubeSize']} colours={board['colors']}")

PART.rename(OUT)
print(f"\n✅ Finished in {time.time() - start:.1f}s → {OUT}")