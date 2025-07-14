const fs = require('fs');
const path = require('path');

// Color palette
const COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
  '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
  '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
];

// Game state class for solving
class GameState {
  constructor(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
    this.tubes = tubes.map(t => t.slice());
    this.tubeSize = tubeSize;
    this.frozenTubes = frozenTubes;
    this.oneColorInTubes = oneColorInTubes;
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
    
    // Can't pour OUT of frozen tubes
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
    
    // Count how many of this color are already in target
    let targetColorCount = 0;
    for (let i = 0; i < to.length; i++) {
      if (to[i] === color) targetColorCount++;
    }
    
    // Calculate how many we can pour
    const space = this.tubeSize - to.length;
    const maxPourForSpace = Math.min(count, space);
    const maxPourForColor = this.tubeSize - targetColorCount;
    const pourCount = Math.min(maxPourForSpace, maxPourForColor);
    
    if (pourCount <= 0) return false;
    
    // Execute the pour
    for (let m = 0; m < pourCount; m++) {
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

// BFS solver to find optimal solution
function findOptimalSolution(state, maxMoves = 50) {
  if (state.isSolved()) return [];
  
  const queue = [{ state: state.clone(), moves: [] }];
  const visited = new Set([state.serialize()]);
  let iterations = 0;
  const maxIterations = 50000;
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const { state: currentState, moves } = queue.shift();
    
    if (moves.length >= maxMoves) continue;
    
    const validMoves = currentState.getValidMoves();
    for (const [from, to] of validMoves) {
      const newState = currentState.clone();
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

// Create a solved state first, then scramble it
function createSolvedState(colors, tubeSize, emptyTubes) {
  const tubes = [];
  
  // Create solved tubes (one color per tube)
  for (let i = 0; i < colors; i++) {
    const color = COLORS[i];
    tubes.push(Array(tubeSize).fill(color));
  }
  
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push([]);
  }
  
  return new GameState(tubes, tubeSize);
}

// Scramble a solved state by making random valid moves
function scrambleState(state, moves) {
  const scrambled = state.clone();
  
  for (let i = 0; i < moves; i++) {
    const validMoves = scrambled.getValidMoves();
    if (validMoves.length === 0) break;
    
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    scrambled.pour(randomMove[0], randomMove[1]);
  }
  
  return scrambled;
}

// Generate a level with specific difficulty
function generateLevel(levelIndex) {
  const maxAttempts = 100;
  
  // Progressive difficulty parameters
  const baseColors = 3;
  const maxColors = 12;
  const baseSize = 4;
  const maxSize = 8;
  const baseEmpty = 2;
  const maxEmpty = 3;
  
  // Calculate level parameters
  const progress = Math.min(levelIndex / 50, 1); // 50 levels for full progression
  const colors = Math.floor(baseColors + (maxColors - baseColors) * progress);
  const tubeSize = Math.floor(baseSize + (maxSize - baseSize) * progress);
  const emptyTubes = Math.floor(baseEmpty + (maxEmpty - baseEmpty) * progress);
  
  // Target minimum moves (progressive difficulty)
  const minMoves = Math.floor(colors * 2 + levelIndex * 0.5);
  const maxMoves = Math.floor(minMoves * 1.5 + 10);
  
  // Scramble intensity
  const scrambleIntensity = Math.floor(colors * tubeSize * 2 + levelIndex * 2);
  
  // Special features for higher levels
  let frozenTubes = [];
  let oneColorInTubes = [];
  
  if (levelIndex >= 20) {
    // Add frozen tubes (empty ones only to avoid split color issues)
    const numFrozen = Math.min(Math.floor(levelIndex / 25), 2);
    frozenTubes = Array.from({length: numFrozen}, (_, i) => colors + i);
  }
  
  if (levelIndex >= 35) {
    // Add one-color tubes
    const numOneColor = Math.min(Math.floor(levelIndex / 35), 1);
    if (numOneColor > 0 && colors + emptyTubes + frozenTubes.length < 15) {
      // Add an extra tube for one-color restriction
      oneColorInTubes = [{
        tubeIndex: colors + emptyTubes + frozenTubes.length,
        color: COLORS[Math.floor(Math.random() * colors)]
      }];
    }
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Create solved state
      const totalTubes = colors + emptyTubes + frozenTubes.length + oneColorInTubes.length;
      const solved = createSolvedState(colors, tubeSize, emptyTubes + frozenTubes.length + oneColorInTubes.length);
      
      // Apply special tube configurations
      const finalState = new GameState(solved.tubes, tubeSize, frozenTubes, oneColorInTubes);
      
      // Scramble the state
      const scrambled = scrambleState(finalState, scrambleIntensity);
      
      // Verify it's not already solved
      if (scrambled.isSolved()) continue;
      
      // Find solution
      const solution = findOptimalSolution(scrambled, maxMoves);
      
      if (solution && solution.length >= minMoves && solution.length <= maxMoves) {
        // Success! Create level data
        const level = {
          colors,
          tubeSize,
          emptyTubes,
          tubes: scrambled.tubes,
          frozenTubes,
          oneColorInTubes
        };
        
        console.log(`Level ${levelIndex + 1}: ${colors} colors, ${tubeSize} size, ${emptyTubes} empty, solution: ${solution.length} moves`);
        return level;
      }
    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed for level ${levelIndex + 1}:`, error.message);
    }
  }
  
  // Fallback: create a simple level
  console.warn(`Using fallback for level ${levelIndex + 1}`);
  return createSimpleLevel(levelIndex, colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes);
}

// Fallback simple level generator
function createSimpleLevel(levelIndex, colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes) {
  const tubes = [];
  
  // Create mixed tubes
  for (let i = 0; i < colors; i++) {
    const tube = [];
    for (let j = 0; j < tubeSize; j++) {
      tube.push(COLORS[i]);
    }
    tubes.push(tube);
  }
  
  // Shuffle segments between tubes
  const allSegments = tubes.flat();
  const shuffled = allSegments.sort(() => Math.random() - 0.5);
  
  // Redistribute
  let segmentIndex = 0;
  for (let i = 0; i < colors; i++) {
    tubes[i] = shuffled.slice(segmentIndex, segmentIndex + tubeSize);
    segmentIndex += tubeSize;
  }
  
  // Add empty tubes
  for (let i = 0; i < emptyTubes + frozenTubes.length + oneColorInTubes.length; i++) {
    tubes.push([]);
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

// Generate all levels
function generateAllLevels(numLevels = 51) {
  console.log(`Generating ${numLevels} deterministic solvable levels...`);
  
  const levels = [];
  
  for (let i = 0; i < numLevels; i++) {
    console.log(`\nGenerating level ${i + 1}/${numLevels}...`);
    const level = generateLevel(i);
    levels.push(level);
  }
  
  return levels;
}

// Verify a level is solvable
function verifyLevel(level, levelIndex) {
  console.log(`Verifying level ${levelIndex + 1}...`);
  
  const state = new GameState(level.tubes, level.tubeSize, level.frozenTubes, level.oneColorInTubes);
  
  // Check for split colors in frozen tubes
  if (level.frozenTubes && level.frozenTubes.length > 0) {
    const frozenColors = new Set();
    for (const frozenIndex of level.frozenTubes) {
      const tube = level.tubes[frozenIndex];
      for (const color of tube) {
        if (frozenColors.has(color)) {
          console.error(`❌ Level ${levelIndex + 1}: Color ${color} appears in multiple frozen tubes`);
          return false;
        }
        frozenColors.add(color);
      }
    }
  }
  
  // Check solvability
  const solution = findOptimalSolution(state, 100);
  if (!solution) {
    console.error(`❌ Level ${levelIndex + 1}: No solution found`);
    return false;
  }
  
  console.log(`✅ Level ${levelIndex + 1}: Solvable in ${solution.length} moves`);
  return true;
}

// Main execution
if (require.main === module) {
  const levels = generateAllLevels(51);
  
  console.log('\n🔍 Verifying all levels...');
  let allValid = true;
  
  for (let i = 0; i < levels.length; i++) {
    if (!verifyLevel(levels[i], i)) {
      allValid = false;
    }
  }
  
  if (allValid) {
    // Save to file
    const outputPath = path.join(__dirname, '../src/levels.json');
    const backupPath = path.join(__dirname, '../src/levels_backup_before_regeneration.json');
    
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
    console.error('\n❌ Some levels failed verification. Please check the logs above.');
  }
} 