const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🧪 Testing Level 21 Solvability...\n');

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

// Test Level 21
const level21 = levelsData[20]; // Level 21 is at index 20
console.log(`Level 21 Configuration:`);
console.log(`- Colors: ${level21.colors}`);
console.log(`- Tube Size: ${level21.tubeSize}`);
console.log(`- Empty Tubes: ${level21.emptyTubes}`);
console.log(`- Frozen Tubes: ${level21.frozenTubes || []}`);
console.log(`- One Color Tubes: ${level21.oneColorInTubes || []}`);
console.log(`- Total Tubes: ${level21.tubes.length}`);

console.log('\n🔍 Testing solvability...');
const startTime = Date.now();
const result = solveLevel(level21.tubes, level21.tubeSize);
const endTime = Date.now();

if (result.solvable) {
  console.log(`✅ Level 21: SOLVABLE (${result.moves} moves, ${endTime - startTime}ms)`);
} else {
  console.log(`❌ Level 21: UNSOLVABLE (${endTime - startTime}ms)`);
}

// Show tube contents for debugging
console.log('\n📊 Tube Contents:');
level21.tubes.forEach((tube, index) => {
  console.log(`Tube ${index + 1}: [${tube.join(', ')}]`);
}); 