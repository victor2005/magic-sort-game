const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Level 21 - Creating a solvable configuration...\n');

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

// Create a solvable Level 21
function createSolvableLevel21() {
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d'];
  const tubeSize = 5;
  const numColors = 8;
  const emptyTubes = 1;
  
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
  const numMoves = Math.floor(Math.random() * 15) + 10; // 10-24 moves
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
    colors: 8,
    tubeSize: 5,
    emptyTubes: 1,
    frozenTubes: [],
    oneColorInTubes: [],
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

console.log('🔧 Creating solvable Level 21...');

// Try to create a solvable level
let attempts = 0;
let newLevel = null;
let result = null;

while (attempts < 20) {
  newLevel = createSolvableLevel21();
  result = solveLevel(newLevel.tubes, newLevel.tubeSize);
  
  if (result.solvable && result.moves >= 6) {
    console.log(`✅ Level 21 created! (${result.moves} moves)`);
    break;
  }
  
  attempts++;
}

if (newLevel && result && result.solvable) {
  // Update the level
  levelsData[20] = newLevel;
  
  // Save the updated levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 Level 21 has been fixed!');
  
  // Test the fixed level
  console.log('\n🧪 Testing fixed Level 21...');
  const finalResult = testLevel(20);
  if (finalResult.solvable) {
    console.log(`✅ Level 21: Now SOLVABLE (${finalResult.moves} moves)`);
  } else {
    console.log(`❌ Level 21: Still UNSOLVABLE`);
  }
} else {
  console.log('❌ Failed to create a solvable Level 21 after 20 attempts');
} 