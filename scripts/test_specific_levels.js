// Test specific levels to verify they work with the game mechanics
const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Copy the State class and solver from verify_levels.js
class State {
  constructor(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
    this.tubes = tubes.map(t => t.slice());
    this.tubeSize = tubeSize;
    this.frozenTubes = frozenTubes;
    this.oneColorInTubes = oneColorInTubes;
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

    let count = 0;
    for (let k = from.length - 1; k >= 0; k--) {
      if (from[k] === color) count++; else break;
    }
    
    const space = this.tubeSize - to.length;
    const moveCount = Math.min(count, space);
    
    if (moveCount === 0) return null;

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

function solveLevel(level, maxDepth = 100, timeLimitMs = 15000) {
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  const initial = new State(level.tubes, level.tubeSize, frozenTubes, oneColorInTubes);
  if (initial.isSolved()) return [];

  const startTime = Date.now();

  function dfs(state, depthRemaining, pathSet, moves) {
    if (Date.now() - startTime > timeLimitMs) throw new Error('TIME_LIMIT');
    if (state.isSolved()) return moves;
    if (depthRemaining === 0) return null;

    const nTubes = state.tubes.length;
    for (let i = 0; i < nTubes; i++) {
      for (let j = 0; j < nTubes; j++) {
        const next = state.pour(i, j);
        if (!next) continue;
        // Skip moves that don't help
        if (next.tubes[j].length === level.tubeSize && next.tubes[j].every(c=>c===next.tubes[j][0]) && state.tubes[i].length===level.tubeSize) continue;
        const h = next.hash();
        if (pathSet.has(h)) continue;
        pathSet.add(h);
        const res = dfs(next, depthRemaining - 1, pathSet, moves.concat([[i, j]]));
        pathSet.delete(h);
        if (res) return res;
      }
    }
    return null;
  }

  // Try direct search at expected depth first
  const expectedMoves = level.minMoves || level.actualMoves || 20;
  try {
    const res = dfs(initial, expectedMoves, new Set([initial.hash()]), []);
    if (res) return res;
  } catch (e) {
    if (e.message === 'TIME_LIMIT') return null;
  }

  // If that fails, try iterative deepening
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

// Test specific levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

console.log('Testing specific levels:');

// Test levels 1-10 (should be easy)
for (let i = 0; i < 10; i++) {
  const lvl = levels[i];
  const expectedMoves = lvl.minMoves || lvl.actualMoves;
  const solution = solveLevel(lvl, expectedMoves + 5, 5000);
  
  if (solution) {
    console.log(`Level ${i + 1}: ✓ Solved in ${solution.length} moves (expected ${expectedMoves})`);
  } else {
    console.log(`Level ${i + 1}: ✗ Could not solve (expected ${expectedMoves} moves)`);
  }
}

// Test a few levels with special mechanics
console.log('\nTesting levels with special mechanics:');
const specialLevels = [26, 27, 28]; // These have frozen tubes and one-color tubes

for (const levelIndex of specialLevels) {
  const lvl = levels[levelIndex];
  const expectedMoves = lvl.minMoves || lvl.actualMoves;
  const frozenTubes = lvl.frozenTubes || [];
  const oneColorInTubes = lvl.oneColorInTubes || [];
  
  console.log(`\nLevel ${levelIndex + 1}:`);
  console.log(`  Expected moves: ${expectedMoves}`);
  console.log(`  Frozen tubes: ${frozenTubes.length > 0 ? frozenTubes.join(', ') : 'none'}`);
  console.log(`  One-color tubes: ${oneColorInTubes.length > 0 ? oneColorInTubes.map(t => `${t.tubeIndex}(${t.color})`).join(', ') : 'none'}`);
  
  const solution = solveLevel(lvl, expectedMoves + 10, 10000);
  
  if (solution) {
    console.log(`  ✓ Solved in ${solution.length} moves`);
  } else {
    console.log(`  ✗ Could not solve`);
  }
} 