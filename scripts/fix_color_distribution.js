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

// Fix color distribution for a level
function fixColorDistribution(level, levelIndex) {
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  
  // Count current colors
  const currentCounts = countColors(level);
  const currentColorList = Object.keys(currentCounts);
  
  console.log(`\nFixing Level ${levelIndex + 1}:`);
  console.log(`  Expected: ${expectedColors} colors with ${expectedPerColor} each`);
  console.log(`  Current: ${JSON.stringify(currentCounts)}`);
  
  // Available colors from the game
  const availableColors = [
    "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
    "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
  ];
  
  // Identify frozen tubes and their colors
  const frozenTubes = level.frozenTubes || [];
  const frozenColors = new Set();
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    if (tube.length > 0) {
      frozenColors.add(tube[0]);
    }
  });
  
  // Identify one-color tubes and their colors
  const oneColorTubes = level.oneColorInTubes || [];
  const oneColorColors = new Set();
  oneColorTubes.forEach(restriction => {
    oneColorColors.add(restriction.color);
  });
  
  // Collect all colors that must be preserved
  const preservedColors = new Set([...frozenColors, ...oneColorColors]);
  
  // Create the target color distribution
  const targetColors = availableColors.slice(0, expectedColors);
  const targetCounts = {};
  targetColors.forEach(color => {
    targetCounts[color] = expectedPerColor;
  });
  
  // Collect all balls from non-frozen tubes
  const allBalls = [];
  const nonFrozenTubes = [];
  
  level.tubes.forEach((tube, index) => {
    if (frozenTubes.includes(index)) {
      // Keep frozen tubes as they are
      nonFrozenTubes.push([...tube]);
    } else {
      // Collect balls from non-frozen tubes
      allBalls.push(...tube);
      nonFrozenTubes.push([]);
    }
  });
  
  // Count balls from frozen tubes
  const frozenBallCounts = {};
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    tube.forEach(color => {
      frozenBallCounts[color] = (frozenBallCounts[color] || 0) + 1;
    });
  });
  
  // Calculate how many balls of each color we need in non-frozen tubes
  const neededBalls = [];
  targetColors.forEach(color => {
    const frozenCount = frozenBallCounts[color] || 0;
    const neededCount = expectedPerColor - frozenCount;
    for (let i = 0; i < neededCount; i++) {
      neededBalls.push(color);
    }
  });
  
  console.log(`  Needed balls for non-frozen tubes: ${neededBalls.length}`);
  console.log(`  Color distribution: ${JSON.stringify(targetCounts)}`);
  
  // Shuffle the needed balls
  shuffle(neededBalls);
  
  // Distribute balls to non-frozen tubes
  let ballIndex = 0;
  for (let tubeIndex = 0; tubeIndex < level.tubes.length; tubeIndex++) {
    if (frozenTubes.includes(tubeIndex)) {
      continue; // Skip frozen tubes
    }
    
    // Fill tube with shuffled balls, but don't overfill
    while (nonFrozenTubes[tubeIndex].length < expectedPerColor && ballIndex < neededBalls.length) {
      nonFrozenTubes[tubeIndex].push(neededBalls[ballIndex]);
      ballIndex++;
    }
  }
  
  // Distribute remaining balls randomly
  while (ballIndex < neededBalls.length) {
    const availableTubes = [];
    for (let tubeIndex = 0; tubeIndex < level.tubes.length; tubeIndex++) {
      if (!frozenTubes.includes(tubeIndex) && nonFrozenTubes[tubeIndex].length < expectedPerColor) {
        availableTubes.push(tubeIndex);
      }
    }
    
    if (availableTubes.length === 0) break;
    
    const randomTube = availableTubes[Math.floor(Math.random() * availableTubes.length)];
    nonFrozenTubes[randomTube].push(neededBalls[ballIndex]);
    ballIndex++;
  }
  
  // Update the level
  level.tubes = nonFrozenTubes;
  
  // Verify the fix
  const newCounts = countColors(level);
  console.log(`  After fix: ${JSON.stringify(newCounts)}`);
  
  // Check if it's correct
  const isCorrect = targetColors.every(color => newCounts[color] === expectedPerColor);
  console.log(`  ${isCorrect ? '✅' : '❌'} Color distribution ${isCorrect ? 'fixed' : 'still has issues'}`);
  
  return isCorrect;
}

// Process levels 21-50 (indices 20-49)
console.log('Fixing color distribution issues in levels 21-50...\n');

let fixedCount = 0;
let totalIssues = 0;

for (let i = 20; i < levels.length; i++) {
  const level = levels[i];
  const currentCounts = countColors(level);
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  
  // Check if this level has issues
  const hasIssues = Object.keys(currentCounts).length !== expectedColors ||
                   Object.values(currentCounts).some(count => count !== expectedPerColor);
  
  if (hasIssues) {
    totalIssues++;
    const fixed = fixColorDistribution(level, i);
    if (fixed) {
      fixedCount++;
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total levels with issues: ${totalIssues}`);
console.log(`Successfully fixed: ${fixedCount}`);
console.log(`Remaining issues: ${totalIssues - fixedCount}`);

// Save the fixed levels
const backupPath = LEVELS_PATH + '.backup-' + Date.now();
fs.copyFileSync(LEVELS_PATH, backupPath);
console.log(`\nBackup created: ${backupPath}`);

fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));
console.log(`Updated levels saved to: ${LEVELS_PATH}`); 