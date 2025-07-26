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

// Fix frozen tubes to be partial instead of full
function fixFrozenTubesPartial(level, levelIndex) {
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  
  if (frozenTubes.length === 0) {
    return; // No frozen tubes to fix
  }
  
  console.log(`\nFixing Level ${levelIndex + 1} frozen tubes:`);
  console.log(`  Frozen tubes: ${frozenTubes.join(', ')}`);
  
  // Step 1: Create exactly tubeSize segments for each color
  const allSegments = [];
  const targetColors = COLORS.slice(0, level.colors);
  targetColors.forEach(color => {
    for (let i = 0; i < level.tubeSize; i++) {
      allSegments.push(color);
    }
  });
  
  // Step 2: Calculate total tubes needed
  const totalTubes = level.colors + level.emptyTubes + frozenTubes.length + oneColorInTubes.length;
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 3: Handle frozen tubes first - assign each frozen tube a unique color and fill partially
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
    
    // Fill frozen tube with PARTIAL amount (1 to tubeSize-1) of the assigned color
    const partialAmount = Math.floor(Math.random() * (level.tubeSize - 1)) + 1; // 1 to tubeSize-1
    console.log(`  Frozen tube ${frozenIndex}: ${partialAmount}/${level.tubeSize} segments of ${assignedColor}`);
    
    for (let i = 0; i < partialAmount; i++) {
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
        // Fill one-color tube with the alternative color (partial amount)
        const partialAmount = Math.floor(Math.random() * (level.tubeSize - 1)) + 1; // 1 to tubeSize-1
        console.log(`  One-color tube ${tubeIndex}: ${partialAmount}/${level.tubeSize} segments of ${alternativeColor}`);
        
        for (let i = 0; i < partialAmount; i++) {
          tubes[tubeIndex].push(alternativeColor);
          // Remove these segments from available pool
          const segmentIndex = allSegments.indexOf(alternativeColor);
          if (segmentIndex !== -1) {
            allSegments.splice(segmentIndex, 1);
          }
        }
      }
    } else {
      // Use the designated color (partial amount)
      usedColors.add(designatedColor);
      const partialAmount = Math.floor(Math.random() * (level.tubeSize - 1)) + 1; // 1 to tubeSize-1
      console.log(`  One-color tube ${tubeIndex}: ${partialAmount}/${level.tubeSize} segments of ${designatedColor}`);
      
      for (let i = 0; i < partialAmount; i++) {
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
    while (tubes[tubeIndex].length < level.tubeSize && segmentIndex < remainingSegments.length) {
      tubes[tubeIndex].push(remainingSegments[segmentIndex]);
      segmentIndex++;
    }
  }
  
  // Step 7: Update the level
  level.tubes = tubes;
  
  // Step 8: Verify color balance
  const colorCounts = countColors(level);
  console.log(`  Final color distribution: ${JSON.stringify(colorCounts)}`);
  
  // Check if all colors have exactly the expected count
  const problematicColors = targetColors.filter(
    color => (colorCounts[color] || 0) !== level.tubeSize
  );
  
  if (problematicColors.length === 0) {
    console.log(`  ✅ Perfect distribution maintained!`);
  } else {
    console.log(`  ⚠️  Issues: ${problematicColors.join(', ')}`);
  }
}

// Main execution
console.log('Fixing frozen tubes to be partial instead of full...');

// Load levels
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// Find levels with frozen tubes
let levelsWithFrozenTubes = [];
levels.forEach((level, levelIndex) => {
  const frozenTubes = level.frozenTubes || [];
  if (frozenTubes.length > 0) {
    levelsWithFrozenTubes.push(levelIndex);
  }
});

console.log(`Found ${levelsWithFrozenTubes.length} levels with frozen tubes`);

// Fix each level with frozen tubes
levelsWithFrozenTubes.forEach(levelIndex => {
  fixFrozenTubesPartial(levels[levelIndex], levelIndex);
});

// Save the fixed levels
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`\nFixed ${levelsWithFrozenTubes.length} levels with frozen tubes`);
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
    console.log(`Level ${levelIndex + 1} has issues: ${problematicColors.join(', ')}`);
    allFixed = false;
  }
});

if (allFixed) {
  console.log('✅ All levels maintain perfect color distribution!');
} else {
  console.log('⚠️  Some levels still have issues');
}

// Verify frozen tubes are not full
console.log('\nVerifying frozen tubes are not full...');
let frozenTubesCorrect = true;

levels.forEach((level, levelIndex) => {
  const frozenTubes = level.frozenTubes || [];
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    if (tube.length === level.tubeSize) {
      console.log(`⚠️  Level ${levelIndex + 1} frozen tube ${tubeIndex} is full (${tube.length}/${level.tubeSize})`);
      frozenTubesCorrect = false;
    }
  });
});

if (frozenTubesCorrect) {
  console.log('✅ All frozen tubes are properly partial!');
} else {
  console.log('⚠️  Some frozen tubes are still full');
} 