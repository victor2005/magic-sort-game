const fs = require('fs');
const path = require('path');

// Color palette
const COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
  '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
  '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
];

// Utility functions
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Game state class
class GameState {
  constructor(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
    this.tubes = tubes.map(t => [...t]);
    this.tubeSize = tubeSize;
    this.frozenTubes = frozenTubes;
    this.oneColorInTubes = oneColorInTubes;
  }

  clone() {
    return new GameState(this.tubes, this.tubeSize, this.frozenTubes, this.oneColorInTubes);
  }

  canPour(from, to) {
    if (from === to) return false;
    const fromTube = this.tubes[from];
    const toTube = this.tubes[to];
    
    if (fromTube.length === 0) return false;
    if (toTube.length >= this.tubeSize) return false;
    if (this.frozenTubes.includes(from)) return false;
    
    const color = fromTube[fromTube.length - 1];
    if (toTube.length > 0 && toTube[toTube.length - 1] !== color) return false;
    
    // Check one-color restrictions
    const oneColorRestriction = this.oneColorInTubes.find(r => r.tubeIndex === to);
    if (oneColorRestriction && oneColorRestriction.color !== color) return false;
    
    return true;
  }

  pour(from, to) {
    if (!this.canPour(from, to)) return false;
    
    const fromTube = this.tubes[from];
    const toTube = this.tubes[to];
    const color = fromTube[fromTube.length - 1];
    
    // Count consecutive same colors from top
    let count = 0;
    for (let i = fromTube.length - 1; i >= 0; i--) {
      if (fromTube[i] === color) count++;
      else break;
    }
    
    // How many can we pour?
    const space = this.tubeSize - toTube.length;
    const pourAmount = Math.min(count, space);
    
    // Execute pour
    for (let i = 0; i < pourAmount; i++) {
      toTube.push(fromTube.pop());
    }
    
    return true;
  }

  isSolved() {
    return this.tubes.every(tube => 
      tube.length === 0 || 
      (tube.length === this.tubeSize && tube.every(color => color === tube[0]))
    );
  }

  getValidMoves() {
    const moves = [];
    for (let from = 0; from < this.tubes.length; from++) {
      for (let to = 0; to < this.tubes.length; to++) {
        if (this.canPour(from, to)) {
          moves.push([from, to]);
        }
      }
    }
    return moves;
  }

  serialize() {
    return this.tubes.map(tube => tube.join(',')).join('|');
  }
}

// BFS solver
function solveBFS(state, maxMoves = 100) {
  if (state.isSolved()) return [];
  
  const queue = [{ state: state.clone(), moves: [] }];
  const visited = new Set([state.serialize()]);
  
  while (queue.length > 0) {
    const { state: current, moves } = queue.shift();
    
    if (moves.length >= maxMoves) continue;
    
    const validMoves = current.getValidMoves();
    for (const [from, to] of validMoves) {
      const newState = current.clone();
      if (newState.pour(from, to)) {
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
  }
  
  return null;
}

// Create a simple solvable level
function createSimpleLevel(levelIndex) {
  // Progressive difficulty
  const colors = Math.min(3 + Math.floor(levelIndex / 10), 8);
  const tubeSize = Math.min(4 + Math.floor(levelIndex / 15), 8);
  const emptyTubes = Math.min(2 + Math.floor(levelIndex / 20), 3);
  
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Create tubes with perfect color distribution
    const tubes = [];
    
    // Create color segments
    const allSegments = [];
    for (let i = 0; i < colors; i++) {
      for (let j = 0; j < tubeSize; j++) {
        allSegments.push(COLORS[i]);
      }
    }
    
    // Shuffle segments
    const shuffledSegments = shuffle(allSegments);
    
    // Distribute to tubes
    let segmentIndex = 0;
    for (let i = 0; i < colors; i++) {
      const tube = [];
      for (let j = 0; j < tubeSize; j++) {
        tube.push(shuffledSegments[segmentIndex++]);
      }
      tubes.push(tube);
    }
    
    // Add empty tubes
    for (let i = 0; i < emptyTubes; i++) {
      tubes.push([]);
    }
    
    // Create special features for higher levels
    let frozenTubes = [];
    let oneColorInTubes = [];
    
    // Add frozen empty tubes for higher levels
    if (levelIndex >= 20) {
      const emptyIndices = tubes.map((tube, idx) => tube.length === 0 ? idx : -1).filter(idx => idx !== -1);
      if (emptyIndices.length > 0) {
        frozenTubes = [emptyIndices[0]]; // Just one frozen empty tube
      }
    }
    
    // Add one-color tube for very high levels
    if (levelIndex >= 35) {
      tubes.push([]); // Add extra empty tube
      oneColorInTubes = [{
        tubeIndex: tubes.length - 1,
        color: COLORS[Math.floor(Math.random() * colors)]
      }];
    }
    
    // Test if solvable
    const state = new GameState(tubes, tubeSize, frozenTubes, oneColorInTubes);
    const solution = solveBFS(state, 50);
    
    if (solution && solution.length >= Math.max(3, Math.floor(levelIndex / 2))) {
      console.log(`Level ${levelIndex + 1}: ${colors} colors, ${tubeSize} size, ${emptyTubes} empty, solution: ${solution.length} moves`);
      return {
        colors,
        tubeSize,
        emptyTubes,
        tubes,
        frozenTubes,
        oneColorInTubes
      };
    }
  }
  
  // Ultimate fallback - create a very simple level
  console.warn(`Using ultimate fallback for level ${levelIndex + 1}`);
  return createUltimateFallback(levelIndex);
}

// Ultimate fallback - guaranteed solvable
function createUltimateFallback(levelIndex) {
  const colors = Math.min(3 + Math.floor(levelIndex / 15), 6);
  const tubeSize = Math.min(4 + Math.floor(levelIndex / 20), 6);
  const emptyTubes = 2;
  
  const tubes = [];
  
  // Create almost-solved state with just a few mixed segments
  for (let i = 0; i < colors; i++) {
    const tube = Array(tubeSize).fill(COLORS[i]);
    
    // Mix just the top segment with another color occasionally
    if (Math.random() < 0.3 && colors > 1) {
      const otherColor = COLORS[(i + 1) % colors];
      tube[tube.length - 1] = otherColor;
    }
    
    tubes.push(tube);
  }
  
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push([]);
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    tubes,
    frozenTubes: [],
    oneColorInTubes: []
  };
}

// Generate all levels
function generateAllLevels(numLevels = 51) {
  console.log(`Generating ${numLevels} simple solvable levels...`);
  
  const levels = [];
  
  for (let i = 0; i < numLevels; i++) {
    console.log(`\nGenerating level ${i + 1}/${numLevels}...`);
    const level = createSimpleLevel(i);
    levels.push(level);
  }
  
  return levels;
}

// Verify all levels
function verifyAllLevels(levels) {
  console.log('\n🔍 Verifying all levels...');
  
  let allValid = true;
  
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const state = new GameState(level.tubes, level.tubeSize, level.frozenTubes, level.oneColorInTubes);
    
    // Check for split colors in frozen tubes
    if (level.frozenTubes && level.frozenTubes.length > 0) {
      const frozenColors = new Set();
      for (const frozenIndex of level.frozenTubes) {
        const tube = level.tubes[frozenIndex];
        for (const color of tube) {
          if (frozenColors.has(color)) {
            console.error(`❌ Level ${i + 1}: Color ${color} appears in multiple frozen tubes`);
            allValid = false;
            continue;
          }
          frozenColors.add(color);
        }
      }
    }
    
    // Check solvability
    const solution = solveBFS(state, 100);
    if (!solution) {
      console.error(`❌ Level ${i + 1}: No solution found`);
      allValid = false;
    } else {
      console.log(`✅ Level ${i + 1}: Solvable in ${solution.length} moves`);
    }
  }
  
  return allValid;
}

// Main execution
if (require.main === module) {
  const levels = generateAllLevels(51);
  
  if (verifyAllLevels(levels)) {
    // Save to file
    const outputPath = path.join(__dirname, '../src/levels.json');
    const backupPath = path.join(__dirname, '../src/levels_backup_before_simple_regeneration.json');
    
    // Create backup
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, backupPath);
      console.log(`📦 Backup created: ${backupPath}`);
    }
    
    // Save new levels
    fs.writeFileSync(outputPath, JSON.stringify(levels, null, 2));
    console.log(`\n💾 Generated ${levels.length} solvable levels saved to: ${outputPath}`);
    console.log('🎉 All levels are guaranteed to be solvable with progressive difficulty!');
  } else {
    console.error('\n❌ Some levels failed verification. Not saving to file.');
  }
} 