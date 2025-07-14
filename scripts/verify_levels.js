// Basic Water Sort Puzzle solver to verify solvability of levels
// Usage: node scripts/verify_levels.js

const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// ----------------- Helper structures -----------------
class State {
  constructor(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
    // Deep copy tubes to avoid mutation
    this.tubes = tubes.map(t => t.slice());
    this.tubeSize = tubeSize;
    this.frozenTubes = frozenTubes;
    this.oneColorInTubes = oneColorInTubes;
    // Precompute hash for memoization
    this._hash = this.tubes.map(t => t.join(',')).join('|');
  }

  hash() {
    return this._hash;
  }

  isSolved() {
    return this.tubes.every(t => t.length === 0 || (t.length === this.tubeSize && t.every(c => c === t[0])));
  }

  clone() {
    return new State(this.tubes, this.tubeSize, this.frozenTubes, this.oneColorInTubes);
  }

  // Try to pour from tube i to j, returns new State or null if move invalid
  pour(i, j) {
    if (i === j) return null;
    const from = this.tubes[i];
    const to = this.tubes[j];
    if (from.length === 0) return null;
    if (to.length === this.tubeSize) return null;
    
    // Check if source tube is frozen - can't pour OUT of frozen tubes
    if (this.frozenTubes.includes(i)) return null;
    
    const color = from[from.length - 1];
    if (to.length > 0 && to[to.length - 1] !== color) return null;
    
    // Check one-color restrictions
    const oneColorRestriction = this.oneColorInTubes.find(r => r.tubeIndex === j);
    if (oneColorRestriction && oneColorRestriction.color !== color) return null;

    // Count how many balls of the same color on top of from
    let count = 0;
    for (let k = from.length - 1; k >= 0; k--) {
      if (from[k] === color) count++; else break;
    }
    
    // Calculate how many we can pour based on space available
    const space = this.tubeSize - to.length;
    const moveCount = Math.min(count, space);
    
    if (moveCount === 0) return null;

    // Execute move on clone
    const newState = this.clone();
    const nFrom = newState.tubes[i];
    const nTo = newState.tubes[j];
    for (let m = 0; m < moveCount; m++) {
      nTo.push(nFrom.pop());
    }
    newState._hash = newState.tubes.map(t => t.join(',')).join('|');
    return newState;
  }
}

// ----------------- DFS Solver -----------------
function solveLevel(level, maxDepth = 100, timeLimitMs = 5000) {
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  const initial = new State(level.tubes, level.tubeSize, frozenTubes, oneColorInTubes);
  if (initial.isSolved()) return [];

  const startTime = Date.now();

  // Helper recursive DFS with path-based visited to save memory
  function dfs(state, depthRemaining, pathSet, moves) {
    // Time check
    if (Date.now() - startTime > timeLimitMs) throw new Error('TIME_LIMIT');
    if (state.isSolved()) return moves;
    if (depthRemaining === 0) return null;

    const nTubes = state.tubes.length;
    for (let i = 0; i < nTubes; i++) {
      for (let j = 0; j < nTubes; j++) {
        const next = state.pour(i, j);
        if (!next) continue;
        // Heuristic: don't move if it doesn't change anything meaningful.
        // Skip moving a full uniform tube into an empty tube (already solved tube)
        if (next.tubes[j].length === level.tubeSize && next.tubes[j].every(c=>c===next.tubes[j][0]) && state.tubes[i].length===level.tubeSize) continue;
        const h = next.hash();
        if (pathSet.has(h)) continue; // avoid cycles within current path
        pathSet.add(h);
        const res = dfs(next, depthRemaining - 1, pathSet, moves.concat([[i, j]]));
        pathSet.delete(h);
        if (res) return res;
      }
    }
    return null;
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (depth % 10 === 0) {
      console.log(`  searching depth ${depth}...`);
    }
    try {
      const res = dfs(initial, depth, new Set([initial.hash()]), []);
      if (res) return res;
    } catch (e) {
      if (e.message === 'TIME_LIMIT') return null;
      throw e;
    }
  }
  return null;
}

// ----------------- Main -----------------
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));
let allSolvable = true;
levels.forEach((lvl, idx) => {
  // Use expected move count to set search depth, with some buffer
  const expectedMoves = lvl.minMoves || lvl.actualMoves || 20;
  const maxDepth = Math.max(expectedMoves + 10, 30); // Add buffer for search
  const timeLimit = Math.max(10000, expectedMoves * 500); // More time for complex levels
  
  const solution = solveLevel(lvl, maxDepth, timeLimit);
  if (!solution) {
    console.warn(`Level ${idx + 1} appears UNSOLVABLE or exceeds search limit (expected ${expectedMoves} moves, searched up to ${maxDepth}).`);
    allSolvable = false;
  } else {
    console.log(`Level ${idx + 1} solved in ${solution.length} moves (expected ${expectedMoves}).`);
  }
});

if (allSolvable) {
  console.log('All levels verified solvable.');
} else {
  console.log('Some levels may be unsolvable. See warnings above.');
} 