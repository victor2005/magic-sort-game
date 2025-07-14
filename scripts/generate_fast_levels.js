const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');
const BACKUP_PATH = path.join(__dirname, '../src/levels.json.bak');

// Helper to shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Simplified game state for faster generation
class GameState {
  constructor(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
    this.tubes = tubes.map(t => t.slice());
    this.tubeSize = tubeSize;
    this.frozenTubes = frozenTubes.slice();
    this.oneColorInTubes = oneColorInTubes.slice();
  }

  clone() {
    return new GameState(this.tubes, this.tubeSize, this.frozenTubes, this.oneColorInTubes);
  }

  canPour(i, j) {
    if (i === j) return false;
    const from = this.tubes[i];
    const to = this.tubes[j];
    if (from.length === 0) return false;
    if (to.length === this.tubeSize) return false;
    
    // Check if source tube is frozen - can't pour OUT of frozen tubes
    if (this.frozenTubes.includes(i)) return false;
    
    const color = from[from.length - 1];
    if (to.length > 0 && to[to.length - 1] !== color) return false;
    
    // Check one-color restrictions
    const oneColorRestriction = this.oneColorInTubes.find(r => r.tubeIndex === j);
    if (oneColorRestriction && oneColorRestriction.color !== color) return false;
    
    return true;
  }

  pour(i, j) {
    if (!this.canPour(i, j)) return false;
    
    const from = this.tubes[i];
    const to = this.tubes[j];
    const color = from[from.length - 1];
    
    // Count consecutive balls of same color on top
    let count = 0;
    for (let k = from.length - 1; k >= 0; k--) {
      if (from[k] === color) count++;
      else break;
    }
    
    // Move as many as possible
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

// Fast BFS solver with limited depth
function findFastSolution(state, maxMoves = 30) {
  if (state.isSolved()) return [];
  
  const queue = [{ state: state.clone(), moves: [] }];
  const visited = new Set([state.serialize()]);
  let iterations = 0;
  const maxIterations = 15000; // Increased for more complex levels
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
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

// Fast level generation with reasonable difficulty
function generateFastLevel(levelIdx, targetMoves) {
  const colorList = [
    "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
    "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
  ];
  
  // Progressive complexity with more aggressive difficulty scaling and larger tube sizes
  let colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes;
  
  if (levelIdx < 5) {
    // Very easy start - 3 colors
    colors = 3;
    tubeSize = 4;
    emptyTubes = 2;
    frozenTubes = [];
    oneColorInTubes = [];
  } else if (levelIdx < 10) {
    // Easy - 4 colors
    colors = 4;
    tubeSize = 4;
    emptyTubes = 2;
    frozenTubes = [];
    oneColorInTubes = [];
  } else if (levelIdx < 15) {
    // Medium-easy - 5 colors
    colors = 5;
    tubeSize = 4;
    emptyTubes = 2;
    frozenTubes = [];
    oneColorInTubes = [];
  } else if (levelIdx < 20) {
    // Medium - 5 colors, larger tubes
    colors = 5;
    tubeSize = 5;
    emptyTubes = 2;
    frozenTubes = [];
    oneColorInTubes = [];
  } else if (levelIdx < 25) {
    // Medium-hard - 6 colors, start adding restrictions
    colors = 6;
    tubeSize = 5;
    emptyTubes = 2;
    // Randomly add 1-2 frozen tubes
    frozenTubes = [];
    const numFrozen = Math.random() < 0.7 ? 1 : 2;
    for (let i = 0; i < numFrozen; i++) {
      const frozenIdx = Math.floor(Math.random() * colors);
      if (!frozenTubes.includes(frozenIdx)) {
        frozenTubes.push(frozenIdx);
      }
    }
    oneColorInTubes = [];
  } else if (levelIdx < 30) {
    // Hard - 7 colors, more restrictions, fewer empty tubes, larger tubes
    colors = 7;
    tubeSize = 6; // Increased tube size for more challenge
    emptyTubes = Math.random() < 0.5 ? 2 : 1; // Randomly reduce empty tubes
    // Randomly add 1-3 frozen tubes
    frozenTubes = [];
    const numFrozen = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numFrozen; i++) {
      const frozenIdx = Math.floor(Math.random() * colors);
      if (!frozenTubes.includes(frozenIdx)) {
        frozenTubes.push(frozenIdx);
      }
    }
    // Randomly add one-color restrictions
    oneColorInTubes = [];
    if (Math.random() < 0.4) {
      oneColorInTubes.push({
        tubeIndex: colors + Math.floor(Math.random() * emptyTubes),
        color: colorList[Math.floor(Math.random() * colors)]
      });
    }
  } else if (levelIdx < 35) {
    // Very hard - 8 colors, many restrictions, larger tubes
    colors = 8;
    tubeSize = 6; // Increased tube size for more challenge
    emptyTubes = Math.random() < 0.3 ? 3 : (Math.random() < 0.6 ? 2 : 1);
    // Randomly add 2-4 frozen tubes
    frozenTubes = [];
    const numFrozen = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numFrozen; i++) {
      const frozenIdx = Math.floor(Math.random() * colors);
      if (!frozenTubes.includes(frozenIdx)) {
        frozenTubes.push(frozenIdx);
      }
    }
    // Randomly add 1-2 one-color restrictions
    oneColorInTubes = [];
    const numOneColor = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numOneColor && i < emptyTubes; i++) {
      oneColorInTubes.push({
        tubeIndex: colors + i,
        color: colorList[Math.floor(Math.random() * colors)]
      });
    }
  } else if (levelIdx < 40) {
    // Extremely hard - 9 colors, maximum restrictions, even larger tubes
    colors = 9;
    tubeSize = 7; // Increased tube size for more challenge
    emptyTubes = Math.random() < 0.2 ? 3 : (Math.random() < 0.5 ? 2 : 1);
    // Randomly add 3-5 frozen tubes
    frozenTubes = [];
    const numFrozen = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numFrozen; i++) {
      const frozenIdx = Math.floor(Math.random() * colors);
      if (!frozenTubes.includes(frozenIdx)) {
        frozenTubes.push(frozenIdx);
      }
    }
    // Randomly add 1-3 one-color restrictions
    oneColorInTubes = [];
    const numOneColor = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numOneColor && i < emptyTubes; i++) {
      oneColorInTubes.push({
        tubeIndex: colors + i,
        color: colorList[Math.floor(Math.random() * colors)]
      });
    }
  } else {
    // Insane difficulty - 10 colors, extreme restrictions, maximum tube size
    colors = 10;
    tubeSize = 8; // Maximum tube size for ultimate challenge
    emptyTubes = Math.random() < 0.1 ? 3 : (Math.random() < 0.3 ? 2 : 1); // Mostly 1 empty tube!
    // Randomly add 4-7 frozen tubes
    frozenTubes = [];
    const numFrozen = Math.floor(Math.random() * 4) + 4;
    for (let i = 0; i < numFrozen; i++) {
      const frozenIdx = Math.floor(Math.random() * colors);
      if (!frozenTubes.includes(frozenIdx)) {
        frozenTubes.push(frozenIdx);
      }
    }
    // Randomly add 1-3 one-color restrictions (all empty tubes if possible)
    oneColorInTubes = [];
    const numOneColor = Math.min(emptyTubes, Math.floor(Math.random() * 3) + 1);
    for (let i = 0; i < numOneColor; i++) {
      oneColorInTubes.push({
        tubeIndex: colors + i,
        color: colorList[Math.floor(Math.random() * colors)]
      });
    }
  }
  
  // Try more attempts for higher difficulty levels
  const maxAttempts = levelIdx < 30 ? 15 : 25;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const level = createFastLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes, colorList);
    
    // Quick solvability check with higher move limits for complex levels
    const maxSearchMoves = Math.min(targetMoves + 10, 30);
    const solution = findFastSolution(
      new GameState(level.tubes, level.tubeSize, level.frozenTubes, level.oneColorInTubes),
      maxSearchMoves
    );
    
    if (solution && solution.length >= Math.max(targetMoves - 5, 3)) {
      return {
        ...level,
        actualMoves: solution.length,
        minMoves: solution.length,
        shuffleMoves: solution.length
      };
    }
  }
  
  // Fallback
  return createSimpleLevel(levelIdx, targetMoves, colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes, colorList);
}

// Create a level with strategic ball placement
function createFastLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes, colorList) {
  const balls = [];
  for (let i = 0; i < colors; i++) {
    for (let j = 0; j < tubeSize; j++) {
      balls.push(colorList[i]);
    }
  }
  
  // Shuffle balls
  shuffle(balls);
  
  const totalTubes = colors + emptyTubes;
  const tubes = [];
  for (let i = 0; i < totalTubes; i++) {
    tubes.push([]);
  }
  
  // Fill tubes with mixed colors
  let ballIndex = 0;
  for (let tubeIdx = 0; tubeIdx < colors; tubeIdx++) {
    for (let i = 0; i < tubeSize && ballIndex < balls.length; i++) {
      tubes[tubeIdx].push(balls[ballIndex++]);
    }
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    tubes,
    frozenTubes,
    oneColorInTubes
  };
}

// Simple fallback level
function createSimpleLevel(levelIdx, targetMoves, colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes, colorList) {
  const balls = [];
  for (let i = 0; i < colors; i++) {
    for (let j = 0; j < tubeSize; j++) {
      balls.push(colorList[i]);
    }
  }
  
  shuffle(balls);
  
  const totalTubes = colors + emptyTubes;
  const tubes = [];
  for (let i = 0; i < totalTubes; i++) {
    tubes.push([]);
  }
  
  let ballIndex = 0;
  for (let tubeIdx = 0; tubeIdx < colors; tubeIdx++) {
    for (let i = 0; i < tubeSize && ballIndex < balls.length; i++) {
      tubes[tubeIdx].push(balls[ballIndex++]);
    }
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    shuffleMoves: targetMoves,
    minMoves: targetMoves,
    tubes,
    frozenTubes,
    oneColorInTubes,
    actualMoves: targetMoves
  };
}

// Generate all levels quickly
function generateAllLevels(numLevels = 50) {
  const levels = [];
  
  for (let i = 0; i < numLevels; i++) {
    // Much more aggressive difficulty progression
    let targetMoves;
    if (i < 5) {
      // Very easy start: 4-8 moves
      targetMoves = 4 + Math.floor(i * 0.8);
    } else if (i < 10) {
      // Easy: 8-12 moves
      targetMoves = 8 + Math.floor((i - 5) * 0.8);
    } else if (i < 15) {
      // Medium-easy: 12-18 moves
      targetMoves = 12 + Math.floor((i - 10) * 1.2);
    } else if (i < 20) {
      // Medium: 18-25 moves
      targetMoves = 18 + Math.floor((i - 15) * 1.4);
    } else if (i < 25) {
      // Medium-hard: 25-35 moves
      targetMoves = 25 + Math.floor((i - 20) * 2);
    } else if (i < 30) {
      // Hard: 35-50 moves
      targetMoves = 35 + Math.floor((i - 25) * 3);
    } else if (i < 35) {
      // Very hard: 50-70 moves
      targetMoves = 50 + Math.floor((i - 30) * 4);
    } else if (i < 40) {
      // Extremely hard: 70-95 moves
      targetMoves = 70 + Math.floor((i - 35) * 5);
    } else {
      // Insane: 95+ moves
      targetMoves = 95 + Math.floor((i - 40) * 6);
    }
    
    console.log(`Generating level ${i + 1}...`);
    
    const level = generateFastLevel(i, targetMoves);
    levels.push(level);
    
    const frozenInfo = level.frozenTubes.length > 0 ? ` (${level.frozenTubes.length} frozen)` : '';
    const oneColorInfo = level.oneColorInTubes.length > 0 ? ` (${level.oneColorInTubes.length} one-color)` : '';
    
    console.log(`Level ${i + 1}: ${level.colors} colors, ${level.tubeSize} tube size, ${level.actualMoves} moves${frozenInfo}${oneColorInfo}`);
  }
  
  return levels;
}

// Main execution
console.log('Generating levels quickly...');

// Backup existing levels
if (fs.existsSync(LEVELS_PATH)) {
  fs.copyFileSync(LEVELS_PATH, BACKUP_PATH);
  console.log('Backed up existing levels to levels.json.bak');
}

// Generate new levels
const levels = generateAllLevels(50);

// Save to file
fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));

console.log(`\nGenerated ${levels.length} levels successfully!`);
console.log('\nSample levels:');
levels.slice(0, 10).forEach((level, i) => {
  const frozenInfo = level.frozenTubes.length > 0 ? ` (${level.frozenTubes.length} frozen)` : '';
  const oneColorInfo = level.oneColorInTubes.length > 0 ? ` (${level.oneColorInTubes.length} one-color)` : '';
  console.log(`Level ${i + 1}: ${level.actualMoves} moves (${level.colors} colors, ${level.tubeSize} tube size)${frozenInfo}${oneColorInfo}`);
}); 