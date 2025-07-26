const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🧪 Testing All Levels for Solvability and Difficulty Scaling...\n');

// Solver functions
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

function solveLevel(tubes, tubeSize, maxMoves = 100) {
  const visited = new Set();
  const queue = [{ tubes: JSON.parse(JSON.stringify(tubes)), moves: [] }];
  
  while (queue.length > 0 && queue.length < 2000) {
    const current = queue.shift();
    const stateKey = JSON.stringify(current.tubes);
    
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    
    if (isSolved(current.tubes, tubeSize)) {
      return { solvable: true, moves: current.moves.length };
    }
    
    if (current.moves.length >= maxMoves) continue;
    
    // Try all possible moves
    for (let fromIdx = 0; fromIdx < current.tubes.length; fromIdx++) {
      const from = current.tubes[fromIdx];
      if (from.length === 0) continue;
      
      const color = from[from.length - 1];
      let count = 1;
      for (let i = from.length - 2; i >= 0; i--) {
        if (from[i] === color) count++;
        else break;
      }
      
      for (let toIdx = 0; toIdx < current.tubes.length; toIdx++) {
        if (fromIdx === toIdx) continue;
        const to = current.tubes[toIdx];
        if (to.length === tubeSize) continue;
        if (to.length > 0 && to[to.length - 1] !== color) continue;
        
        let targetColorCount = 0;
        for (let i = 0; i < to.length; i++) {
          if (to[i] === color) targetColorCount++;
        }
        
        const space = tubeSize - to.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);
        
        if (pourCount > 0) {
          const newTubes = current.tubes.map((tube, i) =>
            i === fromIdx
              ? tube.slice(0, tube.length - pourCount)
              : i === toIdx
              ? [...tube, ...Array(pourCount).fill(color)]
              : tube
          );
          
          queue.push({
            tubes: newTubes,
            moves: [...current.moves, `${fromIdx}->${toIdx}:${pourCount}`]
          });
        }
      }
    }
  }
  
  return { solvable: false, moves: 0 };
}

// Calculate expected minimum moves based on level
function getExpectedMinMoves(levelIndex) {
  if (levelIndex < 10) return 6; // Levels 1-10: 6 moves
  if (levelIndex < 20) return 8; // Levels 11-20: 8 moves
  if (levelIndex < 30) return 10; // Levels 21-30: 10 moves
  if (levelIndex < 40) return 12; // Levels 31-40: 12 moves
  if (levelIndex < 50) return 15; // Levels 41-50: 15 moves
  if (levelIndex < 60) return 18; // Levels 51-60: 18 moves
  if (levelIndex < 70) return 20; // Levels 61-70: 20 moves
  if (levelIndex < 80) return 25; // Levels 71-80: 25 moves
  if (levelIndex < 90) return 30; // Levels 81-90: 30 moves
  return 35; // Levels 91-100: 35 moves
}

// Test a single level
function testLevel(levelIndex) {
  const level = levelsData[levelIndex];
  const startTime = Date.now();
  const result = solveLevel(level.tubes, level.tubeSize);
  const endTime = Date.now();
  const expectedMinMoves = getExpectedMinMoves(levelIndex);
  
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    time: endTime - startTime,
    colors: level.colors,
    tubeSize: level.tubeSize,
    expectedMinMoves,
    hasFrozenTubes: level.frozenTubes && level.frozenTubes.length > 0,
    hasOneColorTubes: level.oneColorInTubes && level.oneColorInTubes.length > 0
  };
}

// Test all levels
console.log('🔍 Testing all levels for solvability and difficulty...\n');

const results = [];
const unsolvableLevels = [];
const easyLevels = [];
const perfectLevels = [];

for (let i = 0; i < levelsData.length; i++) {
  const result = testLevel(i);
  results.push(result);
  
  if (!result.solvable) {
    unsolvableLevels.push(i);
    console.log(`❌ Level ${i + 1}: UNSOLVABLE (${result.time}ms)`);
  } else if (result.moves < result.expectedMinMoves) {
    easyLevels.push({ index: i, moves: result.moves, expected: result.expectedMinMoves });
    console.log(`⚠️  Level ${i + 1}: Too easy (${result.moves} moves, expected ${result.expectedMinMoves}+)`);
  } else {
    perfectLevels.push(i);
    console.log(`✅ Level ${i + 1}: Perfect (${result.moves} moves, expected ${result.expectedMinMoves}+)`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`Total levels tested: ${results.length}`);
console.log(`Perfect levels: ${perfectLevels.length}`);
console.log(`Too easy levels: ${easyLevels.length}`);
console.log(`Unsolvable levels: ${unsolvableLevels.length}`);

if (unsolvableLevels.length > 0) {
  console.log(`\n🔧 Unsolvable levels that need fixing: ${unsolvableLevels.map(l => l + 1).join(', ')}`);
}

if (easyLevels.length > 0) {
  console.log(`\n⚠️  Levels that are too easy:`);
  easyLevels.forEach(({ index, moves, expected }) => {
    console.log(`   Level ${index + 1}: ${moves} moves (expected ${expected}+)`);
  });
}

// Show difficulty progression
console.log(`\n📈 Difficulty Progression Analysis:`);
const difficultyRanges = [
  { name: 'Levels 1-10', start: 0, end: 9, expected: 6 },
  { name: 'Levels 11-20', start: 10, end: 19, expected: 8 },
  { name: 'Levels 21-30', start: 20, end: 29, expected: 10 },
  { name: 'Levels 31-40', start: 30, end: 39, expected: 12 },
  { name: 'Levels 41-50', start: 40, end: 49, expected: 15 },
  { name: 'Levels 51-60', start: 50, end: 59, expected: 18 },
  { name: 'Levels 61-70', start: 60, end: 69, expected: 20 },
  { name: 'Levels 71-80', start: 70, end: 79, expected: 25 },
  { name: 'Levels 81-90', start: 80, end: 89, expected: 30 },
  { name: 'Levels 91-100', start: 90, end: 99, expected: 35 }
];

difficultyRanges.forEach(range => {
  const rangeResults = results.slice(range.start, range.end + 1);
  const solvable = rangeResults.filter(r => r.solvable);
  const avgMoves = solvable.length > 0 ? Math.round(solvable.reduce((sum, r) => sum + r.moves, 0) / solvable.length) : 0;
  const minMoves = solvable.length > 0 ? Math.min(...solvable.map(r => r.moves)) : 0;
  const maxMoves = solvable.length > 0 ? Math.max(...solvable.map(r => r.moves)) : 0;
  
  console.log(`${range.name}: ${solvable.length}/${rangeResults.length} solvable, avg: ${avgMoves}, range: ${minMoves}-${maxMoves} (expected ${range.expected}+)`);
});

// Detailed results for first 30 levels
console.log(`\n🎯 Detailed Results (Levels 1-30):`);
for (let i = 0; i < Math.min(30, results.length); i++) {
  const result = results[i];
  const status = result.solvable ? (result.moves >= result.expectedMinMoves ? '✅' : '⚠️') : '❌';
  const difficulty = result.solvable ? 
    (result.moves >= result.expectedMinMoves ? 'Perfect' : 'Too Easy') : 'Unsolvable';
  
  console.log(`${status} Level ${i + 1}: ${result.colors} colors, ${result.tubeSize} segments - ${result.moves} moves (${difficulty})`);
} 