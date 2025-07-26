const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Levels with Solved Tubes - Ensuring no tubes start solved...\n');

// Check if a tube is solved (completely filled with one color)
function isTubeSolved(tube, tubeSize) {
  return tube.length === tubeSize && tube.every(color => color === tube[0]);
}

// Check if any tube in a level starts solved
function hasSolvedTubes(tubes, tubeSize) {
  return tubes.some(tube => isTubeSolved(tube, tubeSize));
}

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

// Create a level without solved tubes
function createLevelWithoutSolvedTubes(levelIndex, minMoves = 6) {
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
  
  for (let attempt = 0; attempt < 100; attempt++) {
    const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
    
    // Apply many moves to ensure no solved tubes remain
    const numMoves = Math.floor(Math.random() * 25) + 20; // 20-44 moves
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
    
    // Check if any tubes are still solved
    if (hasSolvedTubes(scrambledTubes, tubeSize)) {
      continue; // Skip this attempt if any tubes are solved
    }
    
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
  const hasSolved = hasSolvedTubes(level.tubes, level.tubeSize);
  
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    hasSolvedTubes: hasSolved,
    colors: level.colors,
    tubeSize: level.tubeSize
  };
}

// Find levels with solved tubes
function findLevelsWithSolvedTubes(startLevel, endLevel) {
  console.log(`🔍 Finding levels with solved tubes from ${startLevel + 1} to ${endLevel + 1}...\n`);
  
  const levelsWithSolvedTubes = [];
  
  for (let i = startLevel; i <= endLevel; i++) {
    const result = testLevel(i);
    if (result.hasSolvedTubes) {
      levelsWithSolvedTubes.push({ index: i, moves: result.moves });
      console.log(`⚠️  Level ${i + 1}: Has solved tubes (${result.moves} moves)`);
    } else if (result.solvable) {
      console.log(`✅ Level ${i + 1}: No solved tubes (${result.moves} moves)`);
    } else {
      console.log(`❌ Level ${i + 1}: UNSOLVABLE`);
    }
  }
  
  return levelsWithSolvedTubes;
}

// Fix levels with solved tubes
function fixLevelsWithSolvedTubes(levelsWithSolvedTubes, minMoves = 6) {
  console.log(`\n🔧 Fixing ${levelsWithSolvedTubes.length} levels with solved tubes...\n`);
  
  let fixedCount = 0;
  
  for (const { index, moves } of levelsWithSolvedTubes) {
    console.log(`🔧 Fixing Level ${index + 1} (currently ${moves} moves)...`);
    
    const { level: newLevel, moves: newMoves } = createLevelWithoutSolvedTubes(index, minMoves);
    
    if (newLevel && newMoves >= minMoves) {
      console.log(`✅ Level ${index + 1} fixed! (${newMoves} moves, no solved tubes)`);
      levelsData[index] = newLevel;
      fixedCount++;
    } else {
      console.log(`❌ Failed to fix Level ${index + 1}`);
    }
  }
  
  return fixedCount;
}

// Main execution - test first 20 levels
const levelsWithSolvedTubes = findLevelsWithSolvedTubes(0, 19);
const fixedCount = fixLevelsWithSolvedTubes(levelsWithSolvedTubes, 6);

console.log(`\n📊 Summary:`);
console.log(`Levels with solved tubes found: ${levelsWithSolvedTubes.length}`);
console.log(`Levels fixed: ${fixedCount}`);

if (fixedCount > 0) {
  // Save the updated levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 All levels with solved tubes have been updated!');
  
  // Test the fixed levels
  console.log('\n🧪 Testing fixed levels...');
  for (const { index } of levelsWithSolvedTubes) {
    const result = testLevel(index);
    if (result.solvable && !result.hasSolvedTubes && result.moves >= 6) {
      console.log(`✅ Level ${index + 1}: Now perfect (${result.moves} moves, no solved tubes)`);
    } else if (result.solvable && !result.hasSolvedTubes) {
      console.log(`⚠️  Level ${index + 1}: No solved tubes but too easy (${result.moves} moves)`);
    } else if (result.hasSolvedTubes) {
      console.log(`❌ Level ${index + 1}: Still has solved tubes`);
    } else {
      console.log(`❌ Level ${index + 1}: Still UNSOLVABLE`);
    }
  }
} else {
  console.log('\n✅ No levels with solved tubes found. All levels are already good!');
} 