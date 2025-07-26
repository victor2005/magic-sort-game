const fs = require('fs');

// Load levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🧪 Testing Multiple Levels for Solvability...\n');

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

// Test a single level
function testLevel(levelIndex) {
  const level = levelsData[levelIndex];
  const startTime = Date.now();
  const result = solveLevel(level.tubes, level.tubeSize);
  const endTime = Date.now();
  
  return {
    levelIndex,
    solvable: result.solvable,
    moves: result.moves,
    time: endTime - startTime,
    colors: level.colors,
    tubeSize: level.tubeSize
  };
}

// Test multiple levels
function testLevels(startLevel, endLevel) {
  console.log(`🔍 Testing Levels ${startLevel + 1} to ${endLevel + 1}...\n`);
  
  const results = [];
  const unsolvableLevels = [];
  
  for (let i = startLevel; i <= endLevel; i++) {
    const result = testLevel(i);
    results.push(result);
    
    if (result.solvable) {
      console.log(`✅ Level ${i + 1}: SOLVABLE (${result.moves} moves, ${result.time}ms)`);
    } else {
      console.log(`❌ Level ${i + 1}: UNSOLVABLE (${result.time}ms)`);
      unsolvableLevels.push(i);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`Total tested: ${results.length}`);
  console.log(`Solvable: ${results.filter(r => r.solvable).length}`);
  console.log(`Unsolvable: ${unsolvableLevels.length}`);
  
  if (unsolvableLevels.length > 0) {
    console.log(`\n🔧 Levels that need fixing: ${unsolvableLevels.map(l => l + 1).join(', ')}`);
  }
  
  return { results, unsolvableLevels };
}

// Test first 10 levels
const testResults = testLevels(0, 9);

console.log('\n🎯 Detailed Results:');
testResults.results.forEach(result => {
  const status = result.solvable ? '✅' : '❌';
  console.log(`${status} Level ${result.levelIndex + 1}: ${result.colors} colors, ${result.tubeSize} segments - ${result.solvable ? `${result.moves} moves` : 'UNSOLVABLE'}`);
}); 