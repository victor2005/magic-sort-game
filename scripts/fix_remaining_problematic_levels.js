const fs = require('fs');

// Available colors from the game
const COLORS = [
  "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
  "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
];

// Helper function to shuffle array
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Count colors across all tubes
function countColors(level) {
  const counts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      counts[color] = (counts[color] || 0) + 1;
    });
  });
  return counts;
}

// Create a perfectly balanced level with proper constraints
function createPerfectLevel(levelIndex, colors, tubeSize, emptyTubes, frozenTubes = [], oneColorInTubes = []) {
  console.log(`\nRegenerating Level ${levelIndex + 1}:`);
  console.log(`  Colors: ${colors}, Tube Size: ${tubeSize}, Empty: ${emptyTubes}`);
  console.log(`  Frozen tubes: ${frozenTubes.join(', ')}`);
  console.log(`  One-color tubes: ${oneColorInTubes.map(r => `${r.tubeIndex}(${r.color})`).join(', ')}`);
  
  // Step 1: Create exactly tubeSize segments for each color
  const allSegments = [];
  const targetColors = COLORS.slice(0, colors);
  targetColors.forEach(color => {
    for (let i = 0; i < tubeSize; i++) {
      allSegments.push(color);
    }
  });
  
  // Step 2: Calculate total tubes needed
  const totalTubes = colors + emptyTubes + frozenTubes.length + oneColorInTubes.length;
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 3: Handle frozen tubes first
  frozenTubes.forEach((frozenIndex, frozenIdx) => {
    // Assign a unique color to each frozen tube
    const assignedColor = targetColors[frozenIdx % targetColors.length];
    
    // Fill frozen tube with exactly tubeSize segments of the assigned color
    for (let i = 0; i < tubeSize; i++) {
      tubes[frozenIndex].push(assignedColor);
      // Remove these segments from the available pool
      const segmentIndex = allSegments.indexOf(assignedColor);
      if (segmentIndex !== -1) {
        allSegments.splice(segmentIndex, 1);
      }
    }
  });
  
  // Step 4: Handle one-color tubes
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const color = restriction.color;
    
    // Fill one-color tube with some segments of its designated color
    const fillAmount = Math.floor(Math.random() * (tubeSize - 1)) + 1; // 1 to tubeSize-1
    for (let i = 0; i < fillAmount; i++) {
      tubes[tubeIndex].push(color);
      // Remove these segments from available pool
      const segmentIndex = allSegments.indexOf(color);
      if (segmentIndex !== -1) {
        allSegments.splice(segmentIndex, 1);
      }
    }
  });
  
  // Step 5: Shuffle remaining segments
  const remainingSegments = shuffle(allSegments);
  
  // Step 6: Distribute remaining segments to non-frozen, non-one-color tubes
  let segmentIndex = 0;
  for (let tubeIndex = 0; tubeIndex < totalTubes; tubeIndex++) {
    if (frozenTubes.includes(tubeIndex)) {
      continue; // Skip frozen tubes (already filled)
    }
    
    const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === tubeIndex);
    if (oneColorRestriction) {
      // For one-color tubes, only add segments of the designated color
      const designatedColor = oneColorRestriction.color;
      while (tubes[tubeIndex].length < tubeSize && segmentIndex < remainingSegments.length) {
        if (remainingSegments[segmentIndex] === designatedColor) {
          tubes[tubeIndex].push(remainingSegments[segmentIndex]);
          remainingSegments.splice(segmentIndex, 1);
        } else {
          segmentIndex++;
        }
      }
      segmentIndex = 0; // Reset for next tube
    } else {
      // Regular tube - fill with any available segments
      while (tubes[tubeIndex].length < tubeSize && segmentIndex < remainingSegments.length) {
        tubes[tubeIndex].push(remainingSegments[segmentIndex]);
        segmentIndex++;
      }
    }
  }
  
  // Step 7: If there are still remaining segments, distribute them randomly
  while (segmentIndex < remainingSegments.length) {
    const availableTubes = [];
    for (let i = 0; i < totalTubes; i++) {
      if (!frozenTubes.includes(i) && tubes[i].length < tubeSize) {
        const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === i);
        if (!oneColorRestriction) {
          // Only add regular tubes (not one-color restricted)
          availableTubes.push(i);
        }
      }
    }
    
    if (availableTubes.length === 0) break;
    
    const randomTube = availableTubes[Math.floor(Math.random() * availableTubes.length)];
    tubes[randomTube].push(remainingSegments[segmentIndex]);
    segmentIndex++;
  }
  
  // Step 8: Verify color balance
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  console.log(`  Color distribution: ${JSON.stringify(colorCounts)}`);
  
  // Check if all colors have exactly the expected count
  const problematicColors = targetColors.filter(
    color => (colorCounts[color] || 0) !== tubeSize
  );
  
  if (problematicColors.length === 0) {
    console.log(`  ✅ Perfect distribution achieved!`);
  } else {
    console.log(`  ⚠️  Still problematic: ${problematicColors.join(', ')}`);
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    shuffleMoves: 20 + levelIndex * 4,
    minMoves: colors + 2 + Math.floor(levelIndex / 5),
    tubes,
    frozenTubes,
    oneColorInTubes,
    actualMoves: 20 + levelIndex * 4
  };
}

// Main execution
console.log('Regenerating problematic levels with perfect color distribution...');

// Load levels
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// List of problematic levels that need regeneration
const problematicLevels = [29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 45, 47, 48, 49, 50];

problematicLevels.forEach(levelIndex => {
  const originalLevel = levels[levelIndex];
  
  // Skip if level doesn't exist
  if (!originalLevel) {
    console.log(`Level ${levelIndex + 1} doesn't exist, skipping...`);
    return;
  }
  
  // Extract parameters from original level
  const colors = originalLevel.colors;
  const tubeSize = originalLevel.tubeSize;
  const emptyTubes = originalLevel.emptyTubes;
  const frozenTubes = originalLevel.frozenTubes || [];
  const oneColorInTubes = originalLevel.oneColorInTubes || [];
  
  // Regenerate the level
  const newLevel = createPerfectLevel(levelIndex, colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes);
  
  // Update the level
  levels[levelIndex] = newLevel;
});

// Save the fixed levels
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`\nRegenerated ${problematicLevels.length} problematic levels`);
console.log(`Fixed levels saved to ${levelsPath}`);

// Verify all levels now have correct distribution
console.log('\nVerifying all levels...');
let allFixed = true;

levels.forEach((level, levelIndex) => {
  const currentCounts = countColors(level);
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  const targetColors = COLORS.slice(0, expectedColors);
  
  // Check if any color doesn't have exactly the expected count
  const problematicColors = targetColors.filter(
    color => (currentCounts[color] || 0) !== expectedPerColor
  );
  
  if (problematicColors.length > 0) {
    console.log(`Level ${levelIndex + 1} still has issues: ${problematicColors.join(', ')}`);
    allFixed = false;
  }
});

if (allFixed) {
  console.log('✅ All levels now have perfect color distribution!');
} else {
  console.log('⚠️  Some levels still have issues');
} 