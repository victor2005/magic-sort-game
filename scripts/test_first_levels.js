const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Game state class
class GameState {
  constructor(tubes, tubeSize) {
    this.tubes = tubes.map(t => t.slice());
    this.tubeSize = tubeSize;
  }

  clone() {
    return new GameState(this.tubes, this.tubeSize);
  }

  canPour(i, j) {
    if (i === j) return false;
    const from = this.tubes[i];
    const to = this.tubes[j];
    if (from.length === 0) return false;
    if (to.length === this.tubeSize) return false;
    const color = from[from.length - 1];
    if (to.length > 0 && to[to.length - 1] !== color) return false;
    return true;
  }

  pour(i, j) {
    if (!this.canPour(i, j)) return false;
    
    const from = this.tubes[i];
    const to = this.tubes[j];
    const color = from[from.length - 1];
    
    let count = 0;
    for (let k = from.length - 1; k >= 0; k--) {
      if (from[k] === color) count++;
      else break;
    }
    
    const space = this.tubeSize - to.length;
    const moveCount = Math.min(count, space);
    
    for (let m = 0; m < moveCount; m++) {
      to.push(from.pop());
    }
    return true;
  }

  getValidMoves() {
    const moves = [];
    for (let i = 0; i < this.tubes.length; i++) {
      for (let j = 0; j < this.tubes.length; j++) {
        if (this.canPour(i, j)) {
          moves.push([i, j]);
        }
      }
    }
    return moves;
  }

  isSolved() {
    return this.tubes.every(t => 
      t.length === 0 || (t.length === this.tubeSize && t.every(c => c === t[0]))
    );
  }

  serialize() {
    return this.tubes.map(t => t.join(',')).join('|');
  }
}

// BFS solver
function findOptimalSolution(state, maxMoves = 30) {
  if (state.isSolved()) return [];
  
  const queue = [{ state: state.clone(), moves: [] }];
  const visited = new Set([state.serialize()]);
  
  while (queue.length > 0) {
    const { state: currentState, moves } = queue.shift();
    
    if (moves.length >= maxMoves) continue;
    
    const validMoves = currentState.getValidMoves();
    for (const [from, to] of validMoves) {
      const newState = currentState.clone();
      newState.pour(from, to);
      
      if (newState.isSolved()) {
        return [...moves, [from, to]];
      }
      
      const key = newState.serialize();
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ state: newState, moves: [...moves, [from, to]] });
      }
    }
  }
  
  return null;
}

// Test first 10 levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

console.log('Testing first 10 levels:');
for (let i = 0; i < Math.min(10, levels.length); i++) {
  const level = levels[i];
  const state = new GameState(level.tubes, level.tubeSize);
  
  console.log(`\nLevel ${i + 1}:`);
  console.log(`  Expected moves: ${level.actualMoves}`);
  console.log(`  Tubes:`, level.tubes.map(t => t.join(',')));
  
  const solution = findOptimalSolution(state, 15);
  if (solution) {
    console.log(`  ✓ Solvable in ${solution.length} moves`);
    if (solution.length === level.actualMoves) {
      console.log(`  ✓ Matches expected difficulty`);
    } else {
      console.log(`  ⚠ Difficulty mismatch: expected ${level.actualMoves}, got ${solution.length}`);
    }
  } else {
    console.log(`  ✗ Not solvable within 15 moves`);
  }
} 