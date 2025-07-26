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
  
  // Step 3: Handle frozen tubes first - assign each frozen tube a unique color
  const usedColors = new Set();
  frozenTubes.forEach((frozenIndex, frozenIdx) => {
    // Find an available color that hasn't been used yet
    let assignedColor = null;
    for (const color of targetColors) {
      if (!usedColors.has(color)) {
        assignedColor = color;
        usedColors.add(color);
        break;
      }
    }
    
    if (!assignedColor) {
      // If no unique color available, use the first target color
      assignedColor = targetColors[0];
    }
    
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
  
  // Step 4: Handle one-color tubes - use colors that haven't been used by frozen tubes
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const designatedColor = restriction.color;
    
    // Check if the designated color is already used by a frozen tube
    if (usedColors.has(designatedColor)) {
      console.log(`  ⚠️  One-color tube ${tubeIndex} designated color ${designatedColor} conflicts with frozen tube`);
      // Find an alternative color
      let alternativeColor = null;
      for (const color of targetColors) {
        if (!usedColors.has(color)) {
          alternativeColor = color;
          usedColors.add(color);
          break;
        }
      }
      
      if (alternativeColor) {
        // Fill one-color tube with the alternative color
        for (let i = 0; i < tubeSize; i++) {
          tubes[tubeIndex].push(alternativeColor);
          // Remove these segments from available pool
          const segmentIndex = allSegments.indexOf(alternativeColor);
          if (segmentIndex !== -1) {
            allSegments.splice(segmentIndex, 1);
          }
        }
      }
    } else {
      // Use the designated color
      usedColors.add(designatedColor);
      for (let i = 0; i < tubeSize; i++) {
        tubes[tubeIndex].push(designatedColor);
        // Remove these segments from available pool
        const segmentIndex = allSegments.indexOf(designatedColor);
        if (segmentIndex !== -1) {
          allSegments.splice(segmentIndex, 1);
        }
      }
    }
  });
  
  // Step 5: Shuffle remaining segments
  const remainingSegments = shuffle(allSegments);
  
  // Step 6: Distribute remaining segments to regular tubes (not frozen, not one-color)
  let segmentIndex = 0;
  for (let tubeIndex = 0; tubeIndex < totalTubes; tubeIndex++) {
    if (frozenTubes.includes(tubeIndex) || oneColorInTubes.find(r => r.tubeIndex === tubeIndex)) {
      continue; // Skip frozen and one-color tubes (already filled)
    }
    
    // Fill regular tube with remaining segments
    while (tubes[tubeIndex].length < tubeSize && segmentIndex < remainingSegments.length) {
      tubes[tubeIndex].push(remainingSegments[segmentIndex]);
      segmentIndex++;
    }
  }
  
  // Step 7: Verify color balance
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
console.log('Ultimate color distribution fix...');

// Load levels
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// Check each level for color distribution issues
let problematicLevels = [];
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
    problematicLevels.push(levelIndex);
    console.log(`Level ${levelIndex + 1} has issues: ${problematicColors.join(', ')}`);
  }
});

console.log(`\nFound ${problematicLevels.length} problematic levels to fix`);

// Regenerate all problematic levels
problematicLevels.forEach(levelIndex => {
  const originalLevel = levels[levelIndex];
  
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
console.log(`\nFixed ${problematicLevels.length} problematic levels`);
console.log(`Fixed levels saved to ${levelsPath}`);

// Final verification
console.log('\nFinal verification...');
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