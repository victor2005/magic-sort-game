const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Read levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Helper function to count colors in a level
function countColors(level) {
  const counts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      counts[color] = (counts[color] || 0) + 1;
    });
  });
  return counts;
}

// Helper function to shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Fix specific problematic levels
function fixLevel(level, levelIndex) {
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  
  // Count current colors
  const currentCounts = countColors(level);
  
  console.log(`\nFixing Level ${levelIndex + 1}:`);
  console.log(`  Expected: ${expectedColors} colors with ${expectedPerColor} each`);
  console.log(`  Current: ${JSON.stringify(currentCounts)}`);
  
  // Available colors from the game
  const availableColors = [
    "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
    "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
  ];
  
  // Target colors for this level
  const targetColors = availableColors.slice(0, expectedColors);
  
  // Identify frozen tubes and their colors
  const frozenTubes = level.frozenTubes || [];
  const frozenTubeColors = {};
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    if (tube.length > 0) {
      frozenTubeColors[tubeIndex] = tube[0];
    }
  });
  
  // Identify one-color tubes and their colors
  const oneColorTubes = level.oneColorInTubes || [];
  const oneColorRestrictions = {};
  oneColorTubes.forEach(restriction => {
    oneColorRestrictions[restriction.tubeIndex] = restriction.color;
  });
  
  // For problematic levels, we need to completely regenerate the distribution
  // while preserving frozen tube constraints
  
  // Step 1: Clear all non-frozen tubes
  const newTubes = [];
  for (let i = 0; i < level.tubes.length; i++) {
    if (frozenTubes.includes(i)) {
      // Keep frozen tubes as they are
      newTubes.push([...level.tubes[i]]);
    } else {
      // Clear non-frozen tubes
      newTubes.push([]);
    }
  }
  
  // Step 2: Calculate how many of each color we need
  const neededCounts = {};
  targetColors.forEach(color => {
    neededCounts[color] = expectedPerColor;
  });
  
  // Step 3: Subtract colors already in frozen tubes
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    tube.forEach(color => {
      if (neededCounts[color] !== undefined) {
        neededCounts[color]--;
      }
    });
  });
  
  // Step 4: Create the needed balls
  const neededBalls = [];
  Object.keys(neededCounts).forEach(color => {
    for (let i = 0; i < neededCounts[color]; i++) {
      neededBalls.push(color);
    }
  });
  
  console.log(`  Needed balls: ${neededBalls.length}`);
  console.log(`  Needed distribution: ${JSON.stringify(neededCounts)}`);
  
  // Step 5: Shuffle and distribute balls
  shuffle(neededBalls);
  
  // Distribute balls to non-frozen tubes
  let ballIndex = 0;
  const nonFrozenTubeIndices = [];
  for (let i = 0; i < newTubes.length; i++) {
    if (!frozenTubes.includes(i)) {
      nonFrozenTubeIndices.push(i);
    }
  }
  
  // Distribute balls evenly across non-frozen tubes
  while (ballIndex < neededBalls.length) {
    for (let i = 0; i < nonFrozenTubeIndices.length && ballIndex < neededBalls.length; i++) {
      const tubeIndex = nonFrozenTubeIndices[i];
      
      // Check if this tube can accept more balls
      if (newTubes[tubeIndex].length < expectedPerColor) {
        const ball = neededBalls[ballIndex];
        
        // Check one-color restrictions
        const oneColorRestriction = oneColorRestrictions[tubeIndex];
        if (oneColorRestriction && oneColorRestriction !== ball) {
          // This tube can only accept a specific color, skip this ball
          continue;
        }
        
        newTubes[tubeIndex].push(ball);
        ballIndex++;
      }
    }
    
    // If we couldn't place any balls in this round, break to avoid infinite loop
    if (ballIndex < neededBalls.length) {
      // Find any tube that can still accept balls
      let placed = false;
      for (let i = 0; i < nonFrozenTubeIndices.length; i++) {
        const tubeIndex = nonFrozenTubeIndices[i];
        if (newTubes[tubeIndex].length < expectedPerColor) {
          const ball = neededBalls[ballIndex];
          const oneColorRestriction = oneColorRestrictions[tubeIndex];
          if (!oneColorRestriction || oneColorRestriction === ball) {
            newTubes[tubeIndex].push(ball);
            ballIndex++;
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        console.log(`  Warning: Could not place remaining ${neededBalls.length - ballIndex} balls`);
        break;
      }
    }
  }
  
  // Update the level
  level.tubes = newTubes;
  
  // Verify the fix
  const newCounts = countColors(level);
  console.log(`  After fix: ${JSON.stringify(newCounts)}`);
  
  // Check if it's correct
  const isCorrect = targetColors.every(color => newCounts[color] === expectedPerColor);
  console.log(`  ${isCorrect ? '✅' : '❌'} Color distribution ${isCorrect ? 'fixed' : 'still has issues'}`);
  
  return isCorrect;
}

// List of problematic levels (1-indexed)
const problematicLevels = [37, 38, 40, 44, 45, 46, 48];

console.log('Fixing remaining color distribution issues...\n');

let fixedCount = 0;

problematicLevels.forEach(levelNum => {
  const levelIndex = levelNum - 1;
  if (levelIndex < levels.length) {
    const level = levels[levelIndex];
    const fixed = fixLevel(level, levelIndex);
    if (fixed) {
      fixedCount++;
    }
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Levels processed: ${problematicLevels.length}`);
console.log(`Successfully fixed: ${fixedCount}`);
console.log(`Remaining issues: ${problematicLevels.length - fixedCount}`);

// Save the fixed levels
const backupPath = LEVELS_PATH + '.backup-final-' + Date.now();
fs.copyFileSync(LEVELS_PATH, backupPath);
console.log(`\nBackup created: ${backupPath}`);

fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));
console.log(`Updated levels saved to: ${LEVELS_PATH}`); 