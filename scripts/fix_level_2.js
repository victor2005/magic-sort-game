const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing Level 2 - Creating a solvable configuration...\n');

// Create a simple, solvable Level 2
function createSolvableLevel2() {
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6'];
  const tubeSize = 4;
  
  // Create a solved state first
  const solvedTubes = [
    Array(tubeSize).fill(colors[0]), // All yellow
    Array(tubeSize).fill(colors[1]), // All red
    Array(tubeSize).fill(colors[2]), // All green
    Array(tubeSize).fill(colors[3]), // All blue
    [] // Empty tube
  ];
  
  // Now scramble it with a few moves to make it solvable
  const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
  
  // Apply some random moves to scramble (but keep it solvable)
  const moves = [
    { from: 0, to: 4, count: 2 }, // Move 2 yellow to empty
    { from: 1, to: 0, count: 2 }, // Move 2 red to yellow tube
    { from: 2, to: 1, count: 1 }, // Move 1 green to red tube
    { from: 3, to: 2, count: 1 }, // Move 1 blue to green tube
    { from: 4, to: 3, count: 1 }, // Move 1 yellow to blue tube
  ];
  
  // Apply the moves
  moves.forEach(move => {
    const fromTube = scrambledTubes[move.from];
    const toTube = scrambledTubes[move.to];
    const color = fromTube[fromTube.length - 1];
    
    // Remove from source
    for (let i = 0; i < move.count; i++) {
      fromTube.pop();
    }
    
    // Add to target
    for (let i = 0; i < move.count; i++) {
      toTube.push(color);
    }
  });
  
  return {
    colors: 4,
    tubeSize: 4,
    emptyTubes: 1,
    frozenTubes: [],
    oneColorInTubes: [],
    tubes: scrambledTubes
  };
}

// Create the new Level 2
const newLevel2 = createSolvableLevel2();

console.log('📊 New Level 2 Configuration:');
console.log(`Colors: ${newLevel2.colors}`);
console.log(`Tube Size: ${newLevel2.tubeSize}`);
console.log(`Empty Tubes: ${newLevel2.emptyTubes}`);

console.log('\n🎨 New Tubes:');
newLevel2.tubes.forEach((tube, index) => {
  console.log(`Tube ${index}: [${tube.map(color => color).join(', ')}]`);
});

// Verify color distribution
console.log('\n🔍 Color Distribution Check:');
const colorCounts = {};
newLevel2.tubes.forEach(tube => {
  tube.forEach(color => {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
});

let distributionCorrect = true;
Object.entries(colorCounts).forEach(([color, count]) => {
  console.log(`  ${color}: ${count} segments`);
  if (count !== newLevel2.tubeSize) {
    console.log(`    ⚠️  WARNING: ${color} has ${count} segments, should be ${newLevel2.tubeSize}`);
    distributionCorrect = false;
  }
});

if (distributionCorrect) {
  console.log('✅ Color distribution is correct!');
} else {
  console.log('❌ Color distribution is incorrect!');
  process.exit(1);
}

// Test if it's solvable
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

console.log('\n🧪 Testing if new Level 2 is solvable...');
const startTime = Date.now();
const solvable = solveLevel(newLevel2.tubes, newLevel2.tubeSize);
const endTime = Date.now();

console.log(`⏱️  Solver took ${endTime - startTime}ms`);
if (solvable) {
  console.log('✅ New Level 2 is SOLVABLE!');
  
  // Update the levels data
  levelsData[1] = newLevel2;
  
  // Save back to file
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated src/levels.json');
  
  // Also update public/levels.json
  fs.writeFileSync('public/levels.json', JSON.stringify(levelsData, null, 2));
  console.log('💾 Updated public/levels.json');
  
  console.log('\n🎉 Level 2 has been fixed and is now solvable!');
} else {
  console.log('❌ New Level 2 is still unsolvable!');
  console.log('🔧 Need to try a different approach.');
} 