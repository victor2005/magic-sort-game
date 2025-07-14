const fs = require('fs');
const path = require('path');

// Load the levels
const levelsPath = path.join(__dirname, '..', 'src', 'levels.json');
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

console.log('Verifying frozen tube logic...');

// Helper function to check if a tube has only one color
function hasOnlyOneColor(tube) {
  if (tube.length === 0) return true;
  const firstColor = tube[0];
  return tube.every(color => color === firstColor);
}

let totalFrozenTubes = 0;
let validFrozenTubes = 0;
let invalidFrozenTubes = 0;
let levelsWithFrozenTubes = 0;

// Process each level
levels.forEach((level, levelIndex) => {
  if (!level.frozenTubes || level.frozenTubes.length === 0) {
    return; // Skip levels without frozen tubes
  }
  
  levelsWithFrozenTubes++;
  
  level.frozenTubes.forEach(frozenTubeIndex => {
    totalFrozenTubes++;
    const tube = level.tubes[frozenTubeIndex];
    
    if (hasOnlyOneColor(tube)) {
      validFrozenTubes++;
      if (tube.length === 0) {
        console.log(`Level ${levelIndex + 1}: Frozen tube ${frozenTubeIndex + 1} is empty ✓`);
      } else {
        console.log(`Level ${levelIndex + 1}: Frozen tube ${frozenTubeIndex + 1} has single color ${tube[0]} ✓`);
      }
    } else {
      invalidFrozenTubes++;
      console.log(`Level ${levelIndex + 1}: Frozen tube ${frozenTubeIndex + 1} has mixed colors [${tube.join(', ')}] ✗`);
    }
  });
});

console.log(`\n=== VERIFICATION RESULTS ===`);
console.log(`Levels with frozen tubes: ${levelsWithFrozenTubes}`);
console.log(`Total frozen tubes: ${totalFrozenTubes}`);
console.log(`Valid frozen tubes: ${validFrozenTubes}`);
console.log(`Invalid frozen tubes: ${invalidFrozenTubes}`);

if (invalidFrozenTubes === 0) {
  console.log(`\n✅ All frozen tubes are valid! (empty or single-color)`);
} else {
  console.log(`\n❌ Found ${invalidFrozenTubes} invalid frozen tubes with mixed colors`);
}

// Also check that the game logic is correct
console.log(`\n=== GAME LOGIC VERIFICATION ===`);
let solvableLevels = 0;
let unsolvableLevels = 0;

levels.forEach((level, levelIndex) => {
  // Simple heuristic: check if total color count matches expected
  const colorCounts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  const expectedPerColor = level.tubeSize;
  const actualColors = Object.keys(colorCounts);
  
  let isValid = true;
  actualColors.forEach(color => {
    if (colorCounts[color] !== expectedPerColor) {
      isValid = false;
    }
  });
  
  if (isValid && actualColors.length === level.colors) {
    solvableLevels++;
  } else {
    unsolvableLevels++;
    console.log(`Level ${levelIndex + 1}: Color distribution issue - expected ${level.colors} colors with ${expectedPerColor} each`);
    console.log(`  Actual: ${JSON.stringify(colorCounts)}`);
  }
});

console.log(`Solvable levels: ${solvableLevels}`);
console.log(`Potentially unsolvable levels: ${unsolvableLevels}`);

if (unsolvableLevels === 0) {
  console.log(`\n✅ All levels appear to have correct color distribution!`);
} else {
  console.log(`\n⚠️  ${unsolvableLevels} levels may have color distribution issues`);
} 