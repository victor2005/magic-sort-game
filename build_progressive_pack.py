# build_progressive_pack.py
import random, json, pathlib, itertools, time
from tube_sort_tools import solve_level, canonical_state, legal_moves, apply_move, save_levels_json

RNG = random.Random(20250712)

def make_board(tube_size, n_colours, empty, *,
               add_frozen=True, add_onecolour=True):
    # ----- palette -----
    palette = [f"#{RNG.randrange(0x1000000):06x}" for _ in range(n_colours)]

    # ----- special tubes -----
    frozen, onecolour = [], []
    tokens = [c for c in palette for _ in range(tube_size)]

    # freeze one fully-solved tube (so we don’t need to move it)
    if add_frozen:
        frozen_colour = RNG.choice(palette)
        tokens = [t for t in tokens if t != frozen_colour]   # remove its tokens
        frozen_tube = [frozen_colour] * tube_size
    else:
        frozen_tube = None

    # layout: n_colour tubes + empties (+ maybe an extra for onecolour)
    tubes = [[] for _ in range(n_colours + empty)]
    if frozen_tube:
        idx = RNG.randrange(len(tubes))
        tubes[idx] = frozen_tube
        frozen = [idx]

    # choose an “only-this-colour” tube (start with 1 token)
    if add_onecolour:
        idx = next(i for i, t in enumerate(tubes) if not t)  # first empty
        col = RNG.choice([c for c in palette if c not in tubes[idx]])
        tubes[idx].append(col)
        onecolour = [{"tubeIndex": idx, "color": col}]

    # ----- random fill of remaining tokens -----
    RNG.shuffle(tokens)
    for tok in tokens:
        while True:
            i = RNG.randrange(len(tubes))
            # skip frozen tube
            if i in frozen:
                continue
            # respect capacity
            if len(tubes[i]) >= tube_size:
                continue
            # respect one-colour rule
            if any(d["tubeIndex"] == i for d in onecolour) and tok != tubes[i][0]:
                continue
            tubes[i].append(tok)
            break

    return {
        "tubeSize": tube_size,
        "tubes": tubes,
        "frozenTubes": frozen,
        "oneColorInTubes": onecolour,
    }

def generate_pack(n_levels=50, *,
                  tube_range=(4, 9),
                  colour_range=(4, 9),
                  empty_range=(2, 3),
                  move_window=(6, 70),
                  max_attempts=4000):
    wanted_lo, wanted_hi = move_window
    candidates = []
    attempts = 0
    while len(candidates) < n_levels and attempts < max_attempts:
        attempts += 1
        size  = RNG.randint(*tube_range)
        cols  = RNG.randint(*colour_range)
        empt  = RNG.randint(*empty_range)
        board = make_board(size, cols, empt,
                           add_frozen = RNG.random() < 0.5,
                           add_onecolour = RNG.random() < 0.5)
        try:
            _, opt = solve_level(board, time_limit=12)
        except ValueError:
            continue                        # solver gave up
        if not (wanted_lo <= opt <= wanted_hi):
            continue
        board["minMoves"]   = opt
        board["colors"]     = cols
        board["emptyTubes"] = empt
        candidates.append(board)

    # sort easiest→hardest and trim
    candidates.sort(key=lambda b: b["minMoves"])
    return candidates[:n_levels]

if __name__ == "__main__":
    print("⏳  Building 50-level progressive pack …")
    levels = generate_pack()
    assert all(levels[i]["minMoves"] <= levels[i+1]["minMoves"]
               for i in range(len(levels)-1)), "difficulty order broken"
    out = pathlib.Path("levels_progressive_50.json")
    save_levels_json(levels, out)
    print(f"✅  Saved: {out}  (minMoves span {levels[0]['minMoves']} ➜ {levels[-1]['minMoves']})")