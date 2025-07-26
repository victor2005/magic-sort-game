const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Levels 22-30 with Reasonable Difficulty Scaling...\n');

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

// Calculate expected minimum moves based on level (more reasonable)
function getExpectedMinMoves(levelIndex) {
  if (levelIndex < 10) return 6; // Levels 1-10: 6 moves
  if (levelIndex < 20) return 8; // Levels 11-20: 8 moves
  if (levelIndex < 30) return 8; // Levels 21-30: 8 moves (reduced from 10)
  if (levelIndex < 40) return 10; // Levels 31-40: 10 moves (reduced from 12)
  if (levelIndex < 50) return 12; // Levels 41-50: 12 moves (reduced from 15)
  if (levelIndex < 60) return 15; // Levels 51-60: 15 moves (reduced from 18)
  if (levelIndex < 70) return 18; // Levels 61-70: 18 moves (reduced from 20)
  if (levelIndex < 80) return 20; // Levels 71-80: 20 moves (reduced from 25)
  if (levelIndex < 90) return 25; // Levels 81-90: 25 moves (reduced from 30)
  return 30; // Levels 91-100: 30 moves (reduced from 35)
}

// Create a solvable level with reasonable difficulty
function createSolvableLevel(levelIndex, minMoves) {
  const originalLevel = levelsData[levelIndex];
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d'];
  const tubeSize = originalLevel.tubeSize;
  const numColors = originalLevel.colors;
  const emptyTubes = originalLevel.emptyTubes;
  
  // Use only the colors we need
  const levelColors = colors.slice(0, numColors);
  
  // Create a solved state first
  const solvedTubes = [];
  for (let i = 0; i < numColors; i++) {
    solvedTubes.push(Array(tubeSize).fill(levelColors[i]));
  }
  
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    solvedTubes.push([]);
  }
  
  // Try different scrambling strategies
  let bestLevel = null;
  let bestMoves = 0;
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
    
    // Apply moves based on difficulty level (more reasonable)
    const baseMoves = Math.max(minMoves, 8); // At least 8 moves
    const numMoves = Math.floor(Math.random() * 10) + baseMoves;
    const moves = [];
    
    for (let i = 0; i < numMoves; i++) {
      const from = Math.floor(Math.random() * numColors);
      const to = Math.floor(Math.random() * solvedTubes.length);
      const count = Math.floor(Math.random() * 2) + 1; // 1-2 segments
      
      if (from !== to && scrambledTubes[from].length >= count) {
        moves.push({ from, to, count });
      }
    }
    
    // Apply the moves
    moves.forEach(move => {
      const fromTube = scrambledTubes[move.from];
      const toTube = scrambledTubes[move.to];
      
      if (fromTube.length >= move.count && toTube.length + move.count <= tubeSize) {
        const color = fromTube[fromTube.length - 1];
        
        // Remove from source
        for (let i = 0; i < move.count; i++) {
          fromTube.pop();
        }
        
        // Add to target
        for (let i = 0; i < move.count; i++) {
          toTube.push(color);
        }
      }
    });
    
    // Test if solvable and count moves
    const result = solveLevel(scrambledTubes, tubeSize);
    
    if (result.solvable && result.moves >= minMoves) {
      if (bestLevel === null || result.moves > bestMoves) {
        bestLevel = {
          ...originalLevel,
          tubes: scrambledTubes
        };
        bestMoves = result.moves;
      }
    }
  }
  
  return { level: bestLevel, moves: bestMoves };
}

// Test a single level
function testLevel(levelIndex) {
  const level = levelsData[levelIndex];
  const result = solveLevel(level.tubes, level.tubeSize);
  const expectedMinMoves = getExpectedMinMoves(levelIndex);
  
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    expectedMinMoves,
    colors: level.colors,
    tubeSize: level.tubeSize
  };
}

// Fix levels 22-30
console.log('🔧 Fixing levels 22-30 with reasonable difficulty...\n');

let fixedCount = 0;

for (let i = 21; i <= 29; i++) { // Levels 22-30 (indices 21-29)
  const expectedMinMoves = getExpectedMinMoves(i);
  console.log(`🔧 Fixing Level ${i + 1} (expected ${expectedMinMoves}+ moves)...`);
  
  const { level: newLevel, moves: newMoves } = createSolvableLevel(i, expectedMinMoves);
  
  if (newLevel && newMoves >= expectedMinMoves) {
    console.log(`✅ Level ${i + 1} fixed! (${newMoves} moves)`);
    levelsData[i] = newLevel;
    fixedCount++;
  } else {
    console.log(`❌ Failed to fix Level ${i + 1}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`Levels fixed: ${fixedCount}`);

if (fixedCount > 0) {
  // Save the updated levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 Levels 22-30 have been updated!');
  
  // Test the fixed levels
  console.log('\n🧪 Testing fixed levels...');
  for (let i = 21; i <= 29; i++) {
    const result = testLevel(i);
    if (result.solvable) {
      console.log(`✅ Level ${i + 1}: Now SOLVABLE (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${i + 1}: Still UNSOLVABLE`);
    }
  }
} else {
  console.log('\n❌ No levels were fixed. Need a different approach.');
} 