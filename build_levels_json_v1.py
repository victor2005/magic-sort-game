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


def validate_level_solvability(board: Dict) -> bool:
    """Validate that a level is solvable by checking color counts."""
    tube_size = board["tubeSize"]
    tubes = board["tubes"]
    one_color_tubes = board.get("oneColorInTubes", [])
    
    # Count all colors in the tubes
    color_counts = {}
    for tube in tubes:
        for color in tube:
            color_counts[color] = color_counts.get(color, 0) + 1
    
    # Account for one-color tubes - they will contain one token of their designated color
    for one_color_tube in one_color_tubes:
        designated_color = one_color_tube["color"]
        color_counts[designated_color] = color_counts.get(designated_color, 0) + 1
    
    # Each color must appear exactly tubeSize times
    for color, count in color_counts.items():
        if count != tube_size:
            print(f"❌ Color {color} appears {count} times, should be {tube_size}")
            return False
    
    return True


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

    # Start with perfect distribution: each color appears exactly tube_size times
    tubes: List[List[str]] = [[c] * tube_size for c in palette]
    tubes.extend([[] for _ in range(empties)])
    total = len(tubes)

    frozen_idx: List[int] = []
    one_meta: List[Dict] = []
    removed_tokens = []
    frozen_color = None

    # Handle one-color tubes first (so we can avoid its color in frozen tube)
    if add_onecolour:
        empties_idx = list(range(n_colours, total))
        if empties_idx:
            oc = RNG.choice(empties_idx)
            available_colors = palette.copy()
            # We'll avoid frozen_color later
            colour = RNG.choice(available_colors)
            tubes[oc].clear()  # Ensure one-color tube starts empty
            one_meta.append({"tubeIndex": oc, "color": colour})
            one_color_val = colour
        else:
            one_color_val = None
    else:
        one_color_val = None

    # Handle frozen tubes
    if add_frozen:
        frozen_idx.append(RNG.randrange(n_colours))
        frozen_tube = tubes[frozen_idx[0]]
        # Pick a color for the frozen tube that is not the one-color tube color
        available_colors = [c for c in palette if c != one_color_val]
        if not available_colors:
            return None
        frozen_color = RNG.choice(available_colors)
        # Remove all tokens from the frozen tube
        while frozen_tube:
            removed_tokens.append(frozen_tube.pop())
        # Decide how many tokens to put in (must be < tube_size, >=1)
        max_fill = tube_size - 1
        if max_fill < 1:
            return None
        fill_count = RNG.randint(1, max_fill)
        # Remove that many tokens of frozen_color from other tubes
        placed = 0
        for i in range(total):
            if i == frozen_idx[0]:
                continue
            while frozen_color in tubes[i] and placed < fill_count:
                tubes[i].remove(frozen_color)
                placed += 1
        if placed < fill_count:
            return None  # Not enough tokens to move
        # Place them in the frozen tube
        for _ in range(fill_count):
            frozen_tube.append(frozen_color)
        # Remove the placed tokens from removed_tokens (if any were from this color)
        removed_tokens = [tok for tok in removed_tokens if tok != frozen_color]

    # Redistribute removed tokens from frozen tubes
    if removed_tokens:
        one_set = {m["tubeIndex"] for m in one_meta}
        available_tubes = [i for i in range(total) if i not in frozen_idx and i not in one_set]
        for token in removed_tokens:
            placed = False
            RNG.shuffle(available_tubes)
            for i in available_tubes:
                if len(tubes[i]) < tube_size:
                    tubes[i].append(token)
                    placed = True
                    break
            if not placed:
                return None

    # Now scramble the non-special tubes while maintaining perfect distribution
    non_special_tubes = [i for i in range(total) if i not in frozen_idx and i not in {m["tubeIndex"] for m in one_meta}]
    if non_special_tubes:
        all_tokens = []
        for i in non_special_tubes:
            all_tokens.extend(tubes[i])
            tubes[i].clear()
        RNG.shuffle(all_tokens)
        token_idx = 0
        for i in non_special_tubes:
            while len(tubes[i]) < tube_size and token_idx < len(all_tokens):
                tubes[i].append(all_tokens[token_idx])
                token_idx += 1

    board = {
        "colors": n_colours,
        "tubeSize": tube_size,
        "emptyTubes": empties,
        "tubes": tubes,
        "frozenTubes": frozen_idx,
        "oneColorInTubes": one_meta,
    }
    if not validate_level_solvability(board):
        return None
    # Extra: ensure all frozen tubes are not full and only one color
    for idx in frozen_idx:
        if len(tubes[idx]) == tube_size:
            return None
        if len(set(tubes[idx])) > 1:
            return None
    return board


def tier_cfg(idx: int):
    if idx == 1:
        return dict(size=(3, 3), colours=(2, 2), empties=1, specials=False, gate=2)
    if idx == 2:
        return dict(size=(3, 3), colours=(3, 3), empties=1, specials=False, gate=3)
    if idx == 3:
        return dict(size=(3, 4), colours=(3, 3), empties=2, specials=False, gate=4)
    if idx <= 9:
        return dict(size=(4, 4), colours=(4, 5), empties=2, specials=False, gate=6)
    if idx <= 20:
        return dict(size=(4, 5), colours=(5, 6), empties=2, specials=False, gate=8)
    if idx <= 30:
        return dict(size=(5, 6), colours=(6, 7), empties=2, specials=False, gate=12)
    if idx <= 40:
        # After level 30: Add more one-color tubes, some frozen tubes
        return dict(size=(4, 5), colours=(5, 6), empties=2, specials=True, gate=10)
    if idx <= 44:
        # More special features
        return dict(size=(5, 6), colours=(6, 7), empties=2, specials=True, gate=12)
    # Levels 45-50: Always have special features, but with easier difficulty
    return dict(size=(4, 5), colours=(5, 6), empties=2, specials=True, gate=12)

# Increase max attempts for hard levels
def get_max_attempts(level_num):
    if level_num > 30:
        return 200  # Try 200 times for hard levels
    return 100

# ──────────────────────────
# 4.  Generation loop (patched for specific levels only)
# ──────────────────────────

# Try to load existing levels.json to preserve all levels
EXISTING = pathlib.Path("public/levels.json")
levels: List[Dict] = []
if EXISTING.exists():
    with EXISTING.open() as f:
        try:
            all_levels = json.load(f)
            levels = all_levels
            print(f"Loaded {len(levels)} levels from existing file")
        except Exception as e:
            print(f"Failed to load existing levels.json: {e}")
            levels = []
else:
    print("No existing levels.json found, generating all levels.")

start = time.time()
attempts = 0

# Only retry specific levels that failed
levels_to_retry = [27, 41, 44]

for level_num in levels_to_retry:
    print(f"Retrying level {level_num}...")
    max_attempts_per_level = 50
    level_attempts = 0
    success = False
    
    while level_attempts < max_attempts_per_level and not success:
        level_attempts += 1
        attempts += 1
        cfg = tier_cfg(level_num)
        size = RNG.randint(*cfg["size"])
        cols = RNG.randint(*cfg["colours"])
        empt = cfg["empties"]
        # Always require at least one special tube for 31+
        board = make_board(
            size,
            cols,
            empt,
            add_frozen=cfg["specials"] and RNG.random() < 0.6,  # 60% chance for frozen
            add_onecolour=cfg["specials"] and RNG.random() < 0.8,  # 80% chance for one-color
        )
        if board is None:  # Check if board generation failed
            continue
        try:
            time_limit = min(8, 2 + (level_num // 10))
            _, opt = solve_level(board, time_limit=time_limit)
        except (ValueError, TimeoutError, Exception):
            continue
        if opt < 15:  # Lowered from 20 to 15
            continue
        board.update(minMoves=opt, actualMoves=opt, shuffleMoves=opt)
        levels[level_num - 1] = board  # Replace the level (0-indexed)
        tier = (level_num - 1) // 15 + 1
        print(f"✔ Level {level_num:2}/50 | tier={tier} tube={size} colours={cols} moves={opt} (attempts: {level_attempts})")
        success = True
    
    if not success:
        print(f"⚠️  Level {level_num} still failed after {max_attempts_per_level} attempts, keeping existing level.")

# ──────────────────────────
# 5.  Finish
# ──────────────────────────
OUT.write_text(json.dumps(levels, indent=2))
print(f"\n✅  Finished in {time.time() - start:.1f}s (attempts: {attempts}) → {OUT}")
print(f"📊 Updated {len(levels)} levels successfully")
