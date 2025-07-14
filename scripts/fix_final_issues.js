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

// Comprehensive fix for problematic levels
function fixLevel(level, levelIndex) {
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  
  console.log(`\nFixing Level ${levelIndex + 1}:`);
  console.log(`  Expected: ${expectedColors} colors with ${expectedPerColor} each`);
  
  // Available colors from the game
  const availableColors = [
    "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
    "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
  ];
  
  // Target colors for this level
  const targetColors = availableColors.slice(0, expectedColors);
  
  // Identify frozen tubes and one-color restrictions
  const frozenTubes = level.frozenTubes || [];
  const oneColorTubes = level.oneColorInTubes || [];
  const oneColorRestrictions = {};
  oneColorTubes.forEach(restriction => {
    oneColorRestrictions[restriction.tubeIndex] = restriction.color;
  });
  
  // Strategy: Completely regenerate the level while preserving constraints
  
  // Step 1: Create perfect distribution
  const allBalls = [];
  targetColors.forEach(color => {
    for (let i = 0; i < expectedPerColor; i++) {
      allBalls.push(color);
    }
  });
  
  // Step 2: Shuffle balls
  shuffle(allBalls);
  
  // Step 3: Create new tubes
  const newTubes = [];
  for (let i = 0; i < level.tubes.length; i++) {
    newTubes.push([]);
  }
  
  // Step 4: Handle frozen tubes first
  const frozenTubeAssignments = {};
  frozenTubes.forEach(tubeIndex => {
    // For frozen tubes, we need to assign them a single color
    // Choose the color that appears most frequently in the original frozen tube
    const originalTube = level.tubes[tubeIndex];
    if (originalTube.length > 0) {
      const colorCounts = {};
      originalTube.forEach(color => {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      });
      
      // Find the most common color that's in our target colors
      let bestColor = null;
      let bestCount = 0;
      Object.keys(colorCounts).forEach(color => {
        if (targetColors.includes(color) && colorCounts[color] > bestCount) {
          bestColor = color;
          bestCount = colorCounts[color];
        }
      });
      
      // If no target color found, use the first target color
      if (!bestColor) {
        bestColor = targetColors[0];
      }
      
      frozenTubeAssignments[tubeIndex] = bestColor;
    }
  });
  
  // Step 5: Assign colors to frozen tubes
  const usedBalls = [];
  frozenTubes.forEach(tubeIndex => {
    const assignedColor = frozenTubeAssignments[tubeIndex];
    if (assignedColor) {
      // Fill the frozen tube with the assigned color
      const tubeSize = Math.min(expectedPerColor, level.tubeSize);
      for (let i = 0; i < tubeSize; i++) {
        newTubes[tubeIndex].push(assignedColor);
        usedBalls.push(assignedColor);
      }
    }
  });
  
  // Step 6: Remove used balls from the available pool
  const remainingBalls = [];
  const ballCounts = {};
  allBalls.forEach(ball => {
    ballCounts[ball] = (ballCounts[ball] || 0) + 1;
  });
  
  usedBalls.forEach(ball => {
    ballCounts[ball]--;
  });
  
  Object.keys(ballCounts).forEach(color => {
    for (let i = 0; i < ballCounts[color]; i++) {
      remainingBalls.push(color);
    }
  });
  
  shuffle(remainingBalls);
  
  // Step 7: Distribute remaining balls to non-frozen tubes
  let ballIndex = 0;
  const nonFrozenTubeIndices = [];
  for (let i = 0; i < newTubes.length; i++) {
    if (!frozenTubes.includes(i)) {
      nonFrozenTubeIndices.push(i);
    }
  }
  
  // Distribute balls evenly
  while (ballIndex < remainingBalls.length) {
    let placed = false;
    
    for (let i = 0; i < nonFrozenTubeIndices.length && ballIndex < remainingBalls.length; i++) {
      const tubeIndex = nonFrozenTubeIndices[i];
      
      if (newTubes[tubeIndex].length < expectedPerColor) {
        const ball = remainingBalls[ballIndex];
        
        // Check one-color restrictions
        const oneColorRestriction = oneColorRestrictions[tubeIndex];
        if (oneColorRestriction && oneColorRestriction !== ball) {
          continue;
        }
        
        newTubes[tubeIndex].push(ball);
        ballIndex++;
        placed = true;
      }
    }
    
    if (!placed) {
      // Try to place in any available tube
      let foundSpace = false;
      for (let i = 0; i < nonFrozenTubeIndices.length; i++) {
        const tubeIndex = nonFrozenTubeIndices[i];
        if (newTubes[tubeIndex].length < expectedPerColor) {
          const ball = remainingBalls[ballIndex];
          const oneColorRestriction = oneColorRestrictions[tubeIndex];
          if (!oneColorRestriction || oneColorRestriction === ball) {
            newTubes[tubeIndex].push(ball);
            ballIndex++;
            foundSpace = true;
            break;
          }
        }
      }
      
      if (!foundSpace) {
        console.log(`  Warning: Could not place remaining ${remainingBalls.length - ballIndex} balls`);
        break;
      }
    }
  }
  
  // Step 8: Update the level
  level.tubes = newTubes;
  
  // Step 9: Verify the fix
  const newCounts = countColors(level);
  console.log(`  After fix: ${JSON.stringify(newCounts)}`);
  
  // Check if it's correct
  const isCorrect = targetColors.every(color => newCounts[color] === expectedPerColor);
  console.log(`  ${isCorrect ? '✅' : '❌'} Color distribution ${isCorrect ? 'fixed' : 'still has issues'}`);
  
  return isCorrect;
}

// List of problematic levels (1-indexed)
const problematicLevels = [37, 38, 40, 44, 45, 46, 48];

console.log('Final fix for remaining color distribution issues...\n');

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

console.log(`\n=== FINAL SUMMARY ===`);
console.log(`Levels processed: ${problematicLevels.length}`);
console.log(`Successfully fixed: ${fixedCount}`);
console.log(`Remaining issues: ${problematicLevels.length - fixedCount}`);

// Save the fixed levels
const backupPath = LEVELS_PATH + '.backup-ultimate-' + Date.now();
fs.copyFileSync(LEVELS_PATH, backupPath);
console.log(`\nBackup created: ${backupPath}`);

fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));
console.log(`Updated levels saved to: ${LEVELS_PATH}`); 