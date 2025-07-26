const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Remaining Easy Levels with Aggressive Approach...\n');

// Solver functions
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

function solveLevel(tubes, tubeSize, maxMoves = 50) {
  const visited = new Set();
  const queue = [{ tubes: JSON.parse(JSON.stringify(tubes)), moves: [] }];
  
  while (queue.length > 0 && queue.length < 1000) {
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

// Create a level with aggressive scrambling
function createAggressiveLevel(levelIndex, minMoves = 6) {
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
  
  // Try different scrambling strategies with more aggressive moves
  let bestLevel = null;
  let bestMoves = 0;
  
  for (let attempt = 0; attempt < 100; attempt++) {
    const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
    
    // Apply many more moves to ensure difficulty
    const numMoves = Math.floor(Math.random() * 20) + 15; // 15-34 moves
    const moves = [];
    
    for (let i = 0; i < numMoves; i++) {
      const from = Math.floor(Math.random() * numColors);
      const to = Math.floor(Math.random() * solvedTubes.length);
      const count = Math.floor(Math.random() * 3) + 1; // 1-3 segments
      
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
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    colors: level.colors,
    tubeSize: level.tubeSize
  };
}

// Fix specific levels that are still too easy
const levelsToFix = [3, 7]; // Level 4 and 8 (indices 3 and 7)

console.log(`🔧 Fixing specific levels: ${levelsToFix.map(l => l + 1).join(', ')}...\n`);

let fixedCount = 0;

for (const levelIndex of levelsToFix) {
  const currentResult = testLevel(levelIndex);
  console.log(`🔧 Fixing Level ${levelIndex + 1} (currently ${currentResult.moves} moves)...`);
  
  const { level: newLevel, moves: newMoves } = createAggressiveLevel(levelIndex, 6);
  
  if (newLevel && newMoves >= 6) {
    console.log(`✅ Level ${levelIndex + 1} fixed! (${newMoves} moves)`);
    levelsData[levelIndex] = newLevel;
    fixedCount++;
  } else {
    console.log(`❌ Failed to fix Level ${levelIndex + 1}`);
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
  
  console.log('\n🎉 Remaining easy levels have been updated!');
  
  // Test the fixed levels
  console.log('\n🧪 Testing fixed levels...');
  for (const levelIndex of levelsToFix) {
    const result = testLevel(levelIndex);
    if (result.solvable && result.moves >= 6) {
      console.log(`✅ Level ${levelIndex + 1}: Now good difficulty (${result.moves} moves)`);
    } else if (result.solvable) {
      console.log(`⚠️  Level ${levelIndex + 1}: Still too easy (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${levelIndex + 1}: Still UNSOLVABLE`);
    }
  }
} else {
  console.log('\n❌ No levels were fixed. Need a different approach.');
} 