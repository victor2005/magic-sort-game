from __future__ import annotations
import time, random, math, itertools, json
from collections import deque
from typing import List, Tuple, Dict, Optional, Sequence

# ---------------- State helpers ---------------- #

Tube = Tuple[str, ...]
State = Tuple[Tube, ...]

def canonical_state(tubes: Sequence[Sequence[str]]) -> State:
    return tuple(tuple(t) for t in tubes)

def is_goal(state: State, tube_size: int) -> bool:
    for tube in state:
        if not tube:
            continue
        if len(tube) != tube_size:
            return False
        if any(c != tube[0] for c in tube):
            return False
    return True

# ---------------- Move generation ---------------- #

Move = Tuple[int, int, int]  # (src, dst, block)

def legal_moves(state: State, tube_size: int) -> List[Move]:
    n = len(state)
    moves: List[Move] = []
    for i, src in enumerate(state):
        if not src:
            continue
        colour = src[-1]
        block = 1
        for k in range(len(src)-2, -1, -1):
            if src[k] == colour:
                block += 1
            else:
                break
        for j, dst in enumerate(state):
            if i == j:
                continue
            if len(dst) == tube_size:
                continue
            if dst and dst[-1] != colour:
                continue
            if tube_size - len(dst) < block:
                continue
            moves.append((i, j, block))
    return moves

def apply_move(state: State, move: Move) -> State:
    i, j, k = move
    lst = [list(t) for t in state]
    chunk = lst[i][-k:]
    lst[i] = lst[i][:-k]
    lst[j].extend(chunk)
    return canonical_state(lst)

# ---------------- Heuristic ---------------- #

def misplaced_heuristic(state: State, tube_size: int) -> int:
    h = 0
    for tube in state:
        if not tube:
            continue
        if len(tube) == tube_size and all(c == tube[0] for c in tube):
            continue
        wrong = sum(c != tube[0] for c in tube)
        h += math.ceil(wrong / tube_size)
    return h

# ---------------- Solvers ---------------- #

def bfs_optimal(state: State, tube_size: int,
                node_limit=1_000_000, time_limit=30):
    start = time.time()
    q = deque([(state, [])])
    seen = {state}
    nodes = 0
    while q:
        if nodes >= node_limit or time.time() - start > time_limit:
            return None
        cur, path = q.popleft()
        if is_goal(cur, tube_size):
            return path
        for mv in legal_moves(cur, tube_size):
            nxt = apply_move(cur, mv)
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, path+[mv]))
        nodes += 1
    return None

def ida_star(state: State, tube_size: int,
             heuristic=misplaced_heuristic, time_limit=30):
    bound = heuristic(state, tube_size)
    path: List[Move] = []
    start = time.time()

    def dfs(cur: State, g: int, bound: int):
        if time.time() - start > time_limit:
            return None, math.inf
        f = g + heuristic(cur, tube_size)
        if f > bound:
            return None, f
        if is_goal(cur, tube_size):
            return [], g
        min_bound = math.inf
        for mv in legal_moves(cur, tube_size):
            nxt = apply_move(cur, mv)
            res, nb = dfs(nxt, g+1, bound)
            if res is not None:
                return [mv]+res, nb
            min_bound = min(min_bound, nb)
        return None, min_bound

    while True:
        res, nb = dfs(state, 0, bound)
        if res is not None:
            return res
        if nb == math.inf:
            return None
        bound = nb

def solve_level(level: Dict,
                *,
                time_limit=30,
                node_limit=1_000_000,
                algorithm="auto",
                heuristic=misplaced_heuristic):
    tube_size = level["tubeSize"]
    state = canonical_state(level["tubes"])
    if is_goal(state, tube_size):
        return [], 0
    if algorithm == "bfs" or (algorithm == "auto" and len(state) <= 10):
        res = bfs_optimal(state, tube_size, node_limit, time_limit)
        if res is not None:
            return res, len(res)
    res = ida_star(state, tube_size, heuristic, time_limit)
    if res is not None:
        return res, len(res)
    raise ValueError("Solution not found within limits")

# ---------------- Generation ---------------- #

def generate_level(colours, tube_size, empty_tubes=2, scramble_moves=20, rng=None):
    if rng is None:
        rng = random.Random()
    solved = [[c]*tube_size for c in colours]
    solved.extend([[] for _ in range(empty_tubes)])
    state = canonical_state(solved)
    moves = []
    for _ in range(scramble_moves):
        mv = rng.choice(legal_moves(state, tube_size))
        state = apply_move(state, mv)
        moves.append(mv)
    level = {"tubeSize": tube_size, "tubes": [list(t) for t in state]}
    solution = list(reversed(moves))
    return level, solution

def generate_levels(spec,
                    *,
                    target_range=(10,25),
                    count=20,
                    max_attempts=500,
                    rng=None):
    if rng is None:
        rng = random.Random()
    tube_size = spec["tubeSize"]
    colours = spec["colours"]
    empty = spec.get("emptyTubes", 2)
    lo, hi = target_range
    levels = []
    attempts = 0
    while len(levels) < count and attempts < max_attempts:
        attempts += 1
        scramble = rng.randint(lo, hi)*2
        lvl, _ = generate_level(colours, tube_size, empty, scramble, rng)
        try:
            _, opt = solve_level(lvl, time_limit=10)
        except ValueError:
            continue
        if lo <= opt <= hi:
            lvl["minMoves"] = opt
            levels.append(lvl)
    return levels

def save_levels_json(levels, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(levels, f, indent=2)
