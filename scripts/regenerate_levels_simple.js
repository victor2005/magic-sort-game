const fs = require('fs');

console.log('🎯 Regenerating All Levels with Core Requirements...\n');

// Solver functions
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

function solveLevel(tubes, tubeSize, maxMoves = 200) {
  const visited = new Set();
  const queue = [{ tubes: JSON.parse(JSON.stringify(tubes)), moves: [] }];
  
  while (queue.length > 0 && queue.length < 5000) {
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

// Get level configuration based on difficulty
function getLevelConfig(levelIndex) {
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d', '#9c27b0', '#795548'];
  
  if (levelIndex < 3) {
    // Tutorial levels (1-3)
    return {
      colors: 2 + levelIndex, // 2-4 colors
      tubeSize: 4,
      emptyTubes: 1,
      frozenTubes: [],
      oneColorInTubes: [],
      minMoves: 4
    };
  } else if (levelIndex < 20) {
    // Early levels (4-20)
    return {
      colors: 4 + Math.floor((levelIndex - 3) / 3), // 4-6 colors
      tubeSize: 4 + Math.floor((levelIndex - 3) / 6), // 4-5 segments
      emptyTubes: 1,
      frozenTubes: [],
      oneColorInTubes: [],
      minMoves: 8
    };
  } else if (levelIndex < 40) {
    // Mid levels (21-40)
    const frozenCount = Math.floor((levelIndex - 20) / 10); // 0-1 frozen tubes
    const oneColorCount = Math.floor((levelIndex - 20) / 15); // 0-1 one-color tubes
    return {
      colors: 6 + Math.floor((levelIndex - 20) / 10), // 6-8 colors
      tubeSize: 5 + Math.floor((levelIndex - 20) / 20), // 5-6 segments
      emptyTubes: 1,
      frozenTubes: frozenCount > 0 ? [0] : [],
      oneColorInTubes: oneColorCount > 0 ? [{ tubeIndex: 1, color: colors[0] }] : [],
      minMoves: 12
    };
  } else if (levelIndex < 60) {
    // Advanced levels (41-60)
    const frozenCount = 1 + Math.floor((levelIndex - 40) / 10); // 1-2 frozen tubes
    const oneColorCount = 1 + Math.floor((levelIndex - 40) / 15); // 1-2 one-color tubes
    return {
      colors: 7 + Math.floor((levelIndex - 40) / 10), // 7-9 colors
      tubeSize: 6 + Math.floor((levelIndex - 40) / 20), // 6-7 segments
      emptyTubes: 1,
      frozenTubes: frozenCount > 0 ? [0, 1].slice(0, frozenCount) : [],
      oneColorInTubes: oneColorCount > 0 ? [
        { tubeIndex: 2, color: colors[0] },
        { tubeIndex: 3, color: colors[1] }
      ].slice(0, oneColorCount) : [],
      minMoves: 18
    };
  } else if (levelIndex < 80) {
    // Expert levels (61-80)
    const frozenCount = 2 + Math.floor((levelIndex - 60) / 10); // 2-3 frozen tubes
    const oneColorCount = 2 + Math.floor((levelIndex - 60) / 15); // 2-3 one-color tubes
    return {
      colors: 8 + Math.floor((levelIndex - 60) / 10), // 8-10 colors
      tubeSize: 7 + Math.floor((levelIndex - 60) / 20), // 7-8 segments
      emptyTubes: 1,
      frozenTubes: frozenCount > 0 ? [0, 1, 2].slice(0, frozenCount) : [],
      oneColorInTubes: oneColorCount > 0 ? [
        { tubeIndex: 3, color: colors[0] },
        { tubeIndex: 4, color: colors[1] },
        { tubeIndex: 5, color: colors[2] }
      ].slice(0, oneColorCount) : [],
      minMoves: 25
    };
  } else {
    // Master levels (81-100)
    const frozenCount = 3 + Math.floor((levelIndex - 80) / 10); // 3-4 frozen tubes
    const oneColorCount = 2; // Always 2 one-color tubes for master levels
    return {
      colors: 9 + Math.floor((levelIndex - 80) / 10), // 9-10 colors
      tubeSize: 8 + Math.floor((levelIndex - 80) / 20), // 8-9 segments
      emptyTubes: 1,
      frozenTubes: frozenCount > 0 ? [0, 1, 2, 3].slice(0, frozenCount) : [],
      oneColorInTubes: [
        { tubeIndex: 4, color: colors[0] },
        { tubeIndex: 5, color: colors[1] }
      ],
      minMoves: 35
    };
  }
}

// Create a simple level with core requirements
function createSimpleLevel(levelIndex) {
  const config = getLevelConfig(levelIndex);
  const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d', '#9c27b0', '#795548'];
  const levelColors = colors.slice(0, config.colors);
  
  // Create solved state
  const solvedTubes = [];
  for (let i = 0; i < config.colors; i++) {
    solvedTubes.push(Array(config.tubeSize).fill(levelColors[i]));
  }
  
  // Add empty tubes
  for (let i = 0; i < config.emptyTubes; i++) {
    solvedTubes.push([]);
  }
  
  // Apply frozen tube restrictions (simplified)
  config.frozenTubes.forEach((frozenIndex, frozenIdx) => {
    const frozenColor = levelColors[frozenIdx];
    const frozenSegments = Math.floor(Math.random() * (config.tubeSize - 1)) + 1; // 1 to tubeSize-1
    
    // Clear the frozen tube and add partial segments
    solvedTubes[frozenIndex] = Array(frozenSegments).fill(frozenColor);
    
    // Remove the frozen color from other tubes
    for (let i = 0; i < solvedTubes.length; i++) {
      if (!config.frozenTubes.includes(i)) {
        solvedTubes[i] = solvedTubes[i].filter(c => c !== frozenColor);
      }
    }
    
    // Redistribute the remaining segments
    const remainingSegments = config.tubeSize - frozenSegments;
    let redistributed = 0;
    for (let i = 0; i < solvedTubes.length && redistributed < remainingSegments; i++) {
      if (!config.frozenTubes.includes(i) && solvedTubes[i].length < config.tubeSize) {
        const space = config.tubeSize - solvedTubes[i].length;
        const toAdd = Math.min(space, remainingSegments - redistributed);
        for (let j = 0; j < toAdd; j++) {
          solvedTubes[i].push(frozenColor);
        }
        redistributed += toAdd;
      }
    }
  });
  
  // Apply one-color tube restrictions (simplified)
  config.oneColorInTubes.forEach((oneColorConfig, oneColorIdx) => {
    const oneColorIndex = oneColorConfig.tubeIndex;
    const oneColorColor = oneColorConfig.color;
    
    // Avoid conflicts with frozen tubes
    const frozenColors = config.frozenTubes.map((_, idx) => levelColors[idx]);
    if (frozenColors.includes(oneColorColor)) {
      const availableColors = levelColors.filter(c => !frozenColors.includes(c));
      oneColorConfig.color = availableColors[oneColorIdx % availableColors.length];
    }
    
    // For levels after 40, one-color tubes start with mixed colors
    if (levelIndex >= 40) {
      const mixedColors = [];
      const otherColors = levelColors.filter(c => c !== oneColorConfig.color);
      
      // Add some of the designated color
      const designatedCount = Math.floor(Math.random() * 3) + 1; // 1-3 segments
      for (let i = 0; i < designatedCount; i++) {
        mixedColors.push(oneColorConfig.color);
      }
      
      // Add other colors to fill the tube
      while (mixedColors.length < config.tubeSize) {
        const randomColor = otherColors[Math.floor(Math.random() * otherColors.length)];
        mixedColors.push(randomColor);
      }
      
      // Shuffle the mixed colors
      for (let i = mixedColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixedColors[i], mixedColors[j]] = [mixedColors[j], mixedColors[i]];
      }
      
      solvedTubes[oneColorIndex] = mixedColors;
    } else {
      // For levels before 40, one-color tubes start with partial designated color
      const designatedCount = Math.floor(Math.random() * (config.tubeSize - 1)) + 1; // 1 to tubeSize-1
      solvedTubes[oneColorIndex] = Array(designatedCount).fill(oneColorConfig.color);
    }
    
    // Remove this color from other tubes and redistribute
    const usedSegments = solvedTubes[oneColorIndex].filter(c => c === oneColorConfig.color).length;
    const remainingSegments = config.tubeSize - usedSegments;
    
    for (let i = 0; i < solvedTubes.length; i++) {
      if (i !== oneColorIndex && !config.frozenTubes.includes(i)) {
        solvedTubes[i] = solvedTubes[i].filter(c => c !== oneColorConfig.color);
      }
    }
    
    // Redistribute the remaining segments
    let redistributed = 0;
    for (let i = 0; i < solvedTubes.length && redistributed < remainingSegments; i++) {
      if (i !== oneColorIndex && !config.frozenTubes.includes(i) && solvedTubes[i].length < config.tubeSize) {
        const space = config.tubeSize - solvedTubes[i].length;
        const toAdd = Math.min(space, remainingSegments - redistributed);
        for (let j = 0; j < toAdd; j++) {
          solvedTubes[i].push(oneColorConfig.color);
        }
        redistributed += toAdd;
      }
    }
  });
  
  // Now scramble the level
  let bestLevel = null;
  let bestMoves = 0;
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const scrambledTubes = JSON.parse(JSON.stringify(solvedTubes));
    
    // Apply scrambling moves
    const numMoves = Math.floor(Math.random() * 20) + 10; // 10-29 moves
    const moves = [];
    
    for (let i = 0; i < numMoves; i++) {
      const from = Math.floor(Math.random() * config.colors);
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
      
      if (fromTube.length >= move.count && toTube.length + move.count <= config.tubeSize) {
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
    const result = solveLevel(scrambledTubes, config.tubeSize);
    
    if (result.solvable) {
      // Check that no tubes are fully solved
      const hasSolvedTubes = scrambledTubes.some(tube => 
        tube.length === config.tubeSize && tube.every(c => c === tube[0])
      );
      
      if (!hasSolvedTubes) {
        if (bestLevel === null || result.moves > bestMoves) {
          bestLevel = {
            colors: config.colors,
            tubeSize: config.tubeSize,
            emptyTubes: config.emptyTubes,
            frozenTubes: config.frozenTubes,
            oneColorInTubes: config.oneColorInTubes,
            tubes: scrambledTubes
          };
          bestMoves = result.moves;
        }
      }
    }
  }
  
  return { level: bestLevel, moves: bestMoves };
}

// Generate all levels
console.log('🎯 Generating all 100 levels with core requirements...\n');

const allLevels = [];

for (let i = 0; i < 100; i++) {
  console.log(`🔧 Generating Level ${i + 1}...`);
  
  const { level: newLevel, moves: newMoves } = createSimpleLevel(i);
  
  if (newLevel && newMoves > 0) {
    console.log(`✅ Level ${i + 1} generated! (${newMoves} moves)`);
    allLevels.push(newLevel);
  } else {
    console.log(`❌ Failed to generate Level ${i + 1}, using fallback`);
    // Create a fallback simple level
    const config = getLevelConfig(i);
    const colors = ['#ffd54f', '#e57373', '#81c784', '#64b5f6', '#ba68c8', '#ff8a65', '#4db6ac', '#ffb74d'];
    const levelColors = colors.slice(0, config.colors);
    
    const fallbackTubes = [];
    for (let j = 0; j < config.colors; j++) {
      fallbackTubes.push(Array(config.tubeSize).fill(levelColors[j]));
    }
    for (let j = 0; j < config.emptyTubes; j++) {
      fallbackTubes.push([]);
    }
    
    allLevels.push({
      colors: config.colors,
      tubeSize: config.tubeSize,
      emptyTubes: config.emptyTubes,
      frozenTubes: config.frozenTubes,
      oneColorInTubes: config.oneColorInTubes,
      tubes: fallbackTubes
    });
  }
}

// Save the levels
fs.writeFileSync('src/levels.json', JSON.stringify(allLevels, null, 2));
console.log('💾 Updated src/levels.json');

fs.writeFileSync('public/levels.json', JSON.stringify(allLevels, null, 2));
console.log('💾 Updated public/levels.json');

console.log('\n🎉 All 100 levels have been regenerated!');

// Test a sample of levels
console.log('\n🧪 Testing sample levels...');
const testLevels = [0, 9, 19, 29, 39, 49, 59, 69, 79, 99];
for (const levelIndex of testLevels) {
  const result = solveLevel(allLevels[levelIndex].tubes, allLevels[levelIndex].tubeSize);
  if (result.solvable) {
    console.log(`✅ Level ${levelIndex + 1}: SOLVABLE (${result.moves} moves)`);
  } else {
    console.log(`❌ Level ${levelIndex + 1}: UNSOLVABLE`);
  }
} 