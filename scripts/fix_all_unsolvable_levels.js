const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing All Unsolvable Levels with Proper Difficulty Scaling...\n');

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

// Create a solvable level with proper difficulty
function createSolvableLevel(levelIndex, minMoves) {
  const originalLevel = levelsData[levelIndex];
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d'];
  const tubeSize = originalLevel.tubeSize;
  const numColors = originalLevel.colors;
  const emptyTubes = originalLevel.emptyTubes;
  const frozenTubes = originalLevel.frozenTubes || [];
  const oneColorInTubes = originalLevel.oneColorInTubes || [];
  
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
    
    // Apply moves based on difficulty level
    const baseMoves = Math.floor(minMoves * 1.5); // Ensure enough scrambling
    const numMoves = Math.floor(Math.random() * 20) + baseMoves;
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

// Find all unsolvable levels
function findUnsolvableLevels() {
  console.log('🔍 Finding all unsolvable levels...\n');
  
  const unsolvableLevels = [];
  
  for (let i = 0; i < levelsData.length; i++) {
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

// Fix unsolvable levels in batches
function fixUnsolvableLevels(unsolvableLevels) {
  console.log(`\n🔧 Fixing ${unsolvableLevels.length} unsolvable levels...\n`);
  
  let fixedCount = 0;
  const batchSize = 10; // Fix 10 levels at a time
  
  for (let i = 0; i < unsolvableLevels.length; i += batchSize) {
    const batch = unsolvableLevels.slice(i, i + batchSize);
    console.log(`\n🔧 Processing batch ${Math.floor(i/batchSize) + 1} (levels ${batch[0] + 1}-${batch[batch.length-1] + 1})...`);
    
    for (const levelIndex of batch) {
      const expectedMinMoves = getExpectedMinMoves(levelIndex);
      console.log(`🔧 Fixing Level ${levelIndex + 1} (expected ${expectedMinMoves}+ moves)...`);
      
      const { level: newLevel, moves: newMoves } = createSolvableLevel(levelIndex, expectedMinMoves);
      
      if (newLevel && newMoves >= expectedMinMoves) {
        console.log(`✅ Level ${levelIndex + 1} fixed! (${newMoves} moves)`);
        levelsData[levelIndex] = newLevel;
        fixedCount++;
      } else {
        console.log(`❌ Failed to fix Level ${levelIndex + 1}`);
      }
    }
    
    // Save progress after each batch
    fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
    fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
    console.log(`💾 Progress saved after batch ${Math.floor(i/batchSize) + 1}`);
  }
  
  return fixedCount;
}

// Main execution
const unsolvableLevels = findUnsolvableLevels();
const fixedCount = fixUnsolvableLevels(unsolvableLevels);

console.log(`\n📊 Summary:`);
console.log(`Unsolvable levels found: ${unsolvableLevels.length}`);
console.log(`Levels fixed: ${fixedCount}`);

if (fixedCount > 0) {
  console.log('\n🎉 All fixable levels have been updated!');
  
  // Test a sample of fixed levels
  console.log('\n🧪 Testing sample of fixed levels...');
  const testLevels = unsolvableLevels.slice(0, 10); // Test first 10
  for (const levelIndex of testLevels) {
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