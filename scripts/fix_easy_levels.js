const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Easy Levels - Ensuring minimum 6 moves required...\n');

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

// Create a level with minimum moves
function createLevelWithMinMoves(levelIndex, minMoves = 6) {
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
  
  // Try different scrambling strategies to get minimum moves
  let bestLevel = null;
  let bestMoves = 0;
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
    
    // Apply more moves to ensure minimum difficulty
    const numMoves = Math.floor(Math.random() * 15) + minMoves; // minMoves to minMoves+14
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
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    colors: level.colors,
    tubeSize: level.tubeSize
  };
}

// Find levels that are too easy (less than 6 moves)
function findEasyLevels(startLevel, endLevel, minMoves = 6) {
  console.log(`🔍 Finding levels with less than ${minMoves} moves from ${startLevel + 1} to ${endLevel + 1}...\n`);
  
  const easyLevels = [];
  
  for (let i = startLevel; i <= endLevel; i++) {
    const result = testLevel(i);
    if (result.solvable && result.moves < minMoves) {
      easyLevels.push({ index: i, moves: result.moves });
      console.log(`⚠️  Level ${i + 1}: Too easy (${result.moves} moves)`);
    } else if (result.solvable) {
      console.log(`✅ Level ${i + 1}: Good difficulty (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${i + 1}: UNSOLVABLE`);
    }
  }
  
  return easyLevels;
}

// Fix easy levels
function fixEasyLevels(easyLevels, minMoves = 6) {
  console.log(`\n🔧 Fixing ${easyLevels.length} easy levels to require at least ${minMoves} moves...\n`);
  
  let fixedCount = 0;
  
  for (const { index, moves } of easyLevels) {
    console.log(`🔧 Fixing Level ${index + 1} (currently ${moves} moves)...`);
    
    const { level: newLevel, moves: newMoves } = createLevelWithMinMoves(index, minMoves);
    
    if (newLevel && newMoves >= minMoves) {
      console.log(`✅ Level ${index + 1} fixed! (${newMoves} moves)`);
      levelsData[index] = newLevel;
      fixedCount++;
    } else {
      console.log(`❌ Failed to fix Level ${index + 1}`);
    }
  }
  
  return fixedCount;
}

// Main execution - test first 20 levels
const easyLevels = findEasyLevels(0, 19, 6);
const fixedCount = fixEasyLevels(easyLevels, 6);

console.log(`\n📊 Summary:`);
console.log(`Easy levels found: ${easyLevels.length}`);
console.log(`Levels fixed: ${fixedCount}`);

if (fixedCount > 0) {
  // Save the updated levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 All easy levels have been updated!');
  
  // Test the fixed levels
  console.log('\n🧪 Testing fixed levels...');
  for (const { index } of easyLevels) {
    const result = testLevel(index);
    if (result.solvable && result.moves >= 6) {
      console.log(`✅ Level ${index + 1}: Now good difficulty (${result.moves} moves)`);
    } else if (result.solvable) {
      console.log(`⚠️  Level ${index + 1}: Still too easy (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${index + 1}: Still UNSOLVABLE`);
    }
  }
} else {
  console.log('\n✅ No easy levels found or fixed. All levels have appropriate difficulty.');
} 