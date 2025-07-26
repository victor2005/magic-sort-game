const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

// Get Level 2 (index 1)
const level2 = levelsData[1];
console.log('🎯 Testing Level 2 Solvability...\n');

console.log('📊 Level 2 Configuration:');
console.log(`Colors: ${level2.colors}`);
console.log(`Tube Size: ${level2.tubeSize}`);
console.log(`Empty Tubes: ${level2.emptyTubes}`);
console.log(`Frozen Tubes: ${level2.frozenTubes.length}`);
console.log(`One-Color Tubes: ${level2.oneColorInTubes.length}`);

console.log('\n🎨 Tubes:');
level2.tubes.forEach((tube, index) => {
  console.log(`Tube ${index}: [${tube.map(color => color).join(', ')}]`);
});

// Check color distribution
console.log('\n🔍 Color Distribution Analysis:');
const colorCounts = {};
level2.tubes.forEach(tube => {
  tube.forEach(color => {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
});

console.log('Color counts:');
Object.entries(colorCounts).forEach(([color, count]) => {
  console.log(`  ${color}: ${count} segments`);
  if (count !== level2.tubeSize) {
    console.log(`    ⚠️  WARNING: ${color} has ${count} segments, should be ${level2.tubeSize}`);
  }
});

// Check if solved
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

console.log('\n✅ Is Level 2 already solved?', isSolved(level2.tubes, level2.tubeSize));

// Check if any tubes are already completed
console.log('\n🎯 Completed Tubes:');
level2.tubes.forEach((tube, index) => {
  if (tube.length === level2.tubeSize && tube.every(color => color === tube[0])) {
    console.log(`  Tube ${index}: ✅ Completed with ${tube[0]}`);
  } else if (tube.length === 0) {
    console.log(`  Tube ${index}: 🗑️  Empty`);
  } else {
    console.log(`  Tube ${index}: 🔄 Mixed colors`);
  }
});

// Simple solver to test if it's solvable
function hasPossibleMove(tubes, tubeSize) {
  for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
    const from = tubes[fromIdx];
    if (from.length === 0) continue;
    
    const color = from[from.length - 1];
    let count = 1;
    for (let i = from.length - 2; i >= 0; i--) {
      if (from[i] === color) count++;
      else break;
    }
    
    for (let toIdx = 0; toIdx < tubes.length; toIdx++) {
      if (fromIdx === toIdx) continue;
      const to = tubes[toIdx];
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
        return true;
      }
    }
  }
  return false;
}

console.log('\n🔍 Has possible moves?', hasPossibleMove(level2.tubes, level2.tubeSize));

// Try to solve it with a simple approach
function solveLevel(tubes, tubeSize, maxMoves = 50) {
  const visited = new Set();
  const queue = [{ tubes: JSON.parse(JSON.stringify(tubes)), moves: [] }];
  
  while (queue.length > 0 && queue.length < 1000) {
    const current = queue.shift();
    const stateKey = JSON.stringify(current.tubes);
    
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    
    if (isSolved(current.tubes, tubeSize)) {
      console.log('🎉 SOLUTION FOUND!');
      console.log('Moves:', current.moves.length);
      return true;
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
  
  return false;
}

console.log('\n🧪 Attempting to solve Level 2...');
const startTime = Date.now();
const solvable = solveLevel(level2.tubes, level2.tubeSize);
const endTime = Date.now();

console.log(`⏱️  Solver took ${endTime - startTime}ms`);
if (solvable) {
  console.log('✅ Level 2 is SOLVABLE!');
} else {
  console.log('❌ Level 2 appears to be UNSOLVABLE or very difficult');
  console.log('🔧 This level needs to be regenerated.');
} 