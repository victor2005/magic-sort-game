const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing All Unsolvable Levels...\n');

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

// Create a solvable level
function createSolvableLevel(levelIndex) {
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
  
  // Now scramble it with controlled moves to make it solvable
  const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
  
  // Apply some random moves to scramble (but keep it solvable)
  const numMoves = Math.floor(Math.random() * 8) + 5; // 5-12 moves
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
  
  return {
    ...originalLevel,
    tubes: scrambledTubes
  };
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

// Find all unsolvable levels in a range
function findUnsolvableLevels(startLevel, endLevel) {
  console.log(`🔍 Finding unsolvable levels from ${startLevel + 1} to ${endLevel + 1}...\n`);
  
  const unsolvableLevels = [];
  
  for (let i = startLevel; i <= endLevel; i++) {
    const result = testLevel(i);
    if (!result.solvable) {
      unsolvableLevels.push(i);
      console.log(`❌ Level ${i + 1}: UNSOLVABLE`);
    } else {
      console.log(`✅ Level ${i + 1}: SOLVABLE (${result.moves} moves)`);
    }
  }
  
  return unsolvableLevels;
}

// Fix unsolvable levels
function fixUnsolvableLevels(unsolvableLevels) {
  console.log(`\n🔧 Fixing ${unsolvableLevels.length} unsolvable levels...\n`);
  
  let fixedCount = 0;
  
  for (const levelIndex of unsolvableLevels) {
    console.log(`🔧 Fixing Level ${levelIndex + 1}...`);
    
    // Try to create a solvable level
    let attempts = 0;
    let newLevel = null;
    
    while (attempts < 10) {
      newLevel = createSolvableLevel(levelIndex);
      const result = solveLevel(newLevel.tubes, newLevel.tubeSize);
      
      if (result.solvable) {
        console.log(`✅ Level ${levelIndex + 1} fixed! (${result.moves} moves)`);
        levelsData[levelIndex] = newLevel;
        fixedCount++;
        break;
      }
      
      attempts++;
    }
    
    if (attempts >= 10) {
      console.log(`❌ Failed to fix Level ${levelIndex + 1} after 10 attempts`);
    }
  }
  
  return fixedCount;
}

// Main execution
const unsolvableLevels = findUnsolvableLevels(0, 9);
const fixedCount = fixUnsolvableLevels(unsolvableLevels);

console.log(`\n📊 Summary:`);
console.log(`Unsolvable levels found: ${unsolvableLevels.length}`);
console.log(`Levels fixed: ${fixedCount}`);

if (fixedCount > 0) {
  // Save the updated levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 All fixable levels have been updated!');
  
  // Test the fixed levels
  console.log('\n🧪 Testing fixed levels...');
  for (const levelIndex of unsolvableLevels) {
    const result = testLevel(levelIndex);
    if (result.solvable) {
      console.log(`✅ Level ${levelIndex + 1}: Now SOLVABLE (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${levelIndex + 1}: Still UNSOLVABLE`);
    }
  }
} else {
  console.log('\n❌ No levels were fixed. Need a different approach.');
} 