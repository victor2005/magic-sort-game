const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Levels 22-30 - Solvability First...\n');

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

// Create a simple solvable level
function createSimpleSolvableLevel(levelIndex) {
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
    
    // Apply a simple number of moves
    const numMoves = Math.floor(Math.random() * 15) + 5; // 5-19 moves
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
    
    // Test if solvable
    const result = solveLevel(scrambledTubes, tubeSize);
    
    if (result.solvable) {
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

// Fix levels 22-30
console.log('🔧 Fixing levels 22-30 for solvability...\n');

let fixedCount = 0;

for (let i = 21; i <= 29; i++) { // Levels 22-30 (indices 21-29)
  console.log(`🔧 Fixing Level ${i + 1}...`);
  
  const { level: newLevel, moves: newMoves } = createSimpleSolvableLevel(i);
  
  if (newLevel && newMoves > 0) {
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