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

// Comprehensive fix for conflicts and difficulty
function fixConflictsAndDifficulty(level, levelIndex) {
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  
  if (frozenTubes.length === 0 && oneColorInTubes.length === 0) {
    return; // No special tubes to fix
  }
  
  console.log(`\nFixing Level ${levelIndex + 1}:`);
  console.log(`  Frozen tubes: ${frozenTubes.join(', ')}`);
  console.log(`  One-color tubes: ${oneColorInTubes.map(r => `${r.tubeIndex}(${r.color})`).join(', ')}`);
  
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
  
  // Step 3: Assign colors to frozen tubes first, avoiding colors used by one-color tubes
  const usedColors = new Set();
  const frozenTubeColors = {};
  
  // First, mark colors that are designated for one-color tubes as used
  oneColorInTubes.forEach(restriction => {
    usedColors.add(restriction.color);
  });
  
  frozenTubes.forEach((frozenIndex, frozenIdx) => {
    // Find an available color that hasn't been used by one-color tubes
    let assignedColor = null;
    for (const color of targetColors) {
      if (!usedColors.has(color)) {
        assignedColor = color;
        usedColors.add(color);
        break;
      }
    }
    
    if (!assignedColor) {
      // If no unique color available, we need to reassign one-color tube colors
      console.log(`  ⚠️  No available color for frozen tube ${frozenIndex}, reassigning one-color tubes...`);
      
      // Find a color that can be reassigned from one-color tubes
      const oneColorColors = oneColorInTubes.map(r => r.color);
      const availableColors = targetColors.filter(color => !oneColorColors.includes(color));
      
      if (availableColors.length > 0) {
        assignedColor = availableColors[0];
        usedColors.add(assignedColor);
        console.log(`  Reassigned frozen tube ${frozenIndex} to color ${assignedColor}`);
      } else {
        // Last resort: use the first target color
        assignedColor = targetColors[0];
        usedColors.add(assignedColor);
        console.log(`  Last resort: assigned frozen tube ${frozenIndex} to color ${assignedColor}`);
      }
    }
    
    frozenTubeColors[frozenIndex] = assignedColor;
    
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
  
  // Step 4: Handle one-color tubes - ensure they don't conflict with frozen tube colors
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const designatedColor = restriction.color;
    
    // Check if the designated color conflicts with a frozen tube
    const conflictingFrozenTube = frozenTubes.find(frozenIndex => 
      frozenTubeColors[frozenIndex] === designatedColor
    );
    
    if (conflictingFrozenTube !== undefined) {
      console.log(`  ⚠️  One-color tube ${tubeIndex} designated color ${designatedColor} conflicts with frozen tube ${conflictingFrozenTube}`);
      
      // Find an alternative color that's not used by any frozen tube
      let alternativeColor = null;
      for (const color of targetColors) {
        const isUsedByFrozen = frozenTubes.some(frozenIndex => 
          frozenTubeColors[frozenIndex] === color
        );
        if (!isUsedByFrozen) {
          alternativeColor = color;
          break;
        }
      }
      
      if (alternativeColor) {
        console.log(`  Reassigned one-color tube ${tubeIndex} from ${designatedColor} to ${alternativeColor}`);
        
        // Fill one-color tube with MIXED colors for difficulty (after level 40)
        if (levelIndex >= 40) {
          const mixedColors = [];
          const designatedColorCount = Math.floor(Math.random() * 3) + 1; // 1-3 segments of designated color
          const otherColorsCount = level.tubeSize - designatedColorCount;
          
          // Add some segments of the alternative color
          for (let i = 0; i < designatedColorCount; i++) {
            mixedColors.push(alternativeColor);
            const segmentIndex = allSegments.indexOf(alternativeColor);
            if (segmentIndex !== -1) {
              allSegments.splice(segmentIndex, 1);
            }
          }
          
          // Add other random colors for the remaining segments
          for (let i = 0; i < otherColorsCount; i++) {
            if (allSegments.length > 0) {
              const randomIndex = Math.floor(Math.random() * allSegments.length);
              const randomColor = allSegments[randomIndex];
              mixedColors.push(randomColor);
              allSegments.splice(randomIndex, 1);
            }
          }
          
          // Shuffle the mixed colors for more randomness
          const shuffledMixedColors = shuffle(mixedColors);
          tubes[tubeIndex] = shuffledMixedColors;
          
          console.log(`  One-color tube ${tubeIndex}: ${designatedColorCount}/${level.tubeSize} segments of ${alternativeColor} + mixed colors`);
        } else {
          // Before level 40, use mostly the designated color
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
      }
    } else {
      // No conflict, use the designated color
      if (levelIndex >= 40) {
        // After level 40, use MIXED colors for difficulty
        const mixedColors = [];
        const designatedColorCount = Math.floor(Math.random() * 3) + 1; // 1-3 segments of designated color
        const otherColorsCount = level.tubeSize - designatedColorCount;
        
        // Add some segments of the designated color
        for (let i = 0; i < designatedColorCount; i++) {
          mixedColors.push(designatedColor);
          const segmentIndex = allSegments.indexOf(designatedColor);
          if (segmentIndex !== -1) {
            allSegments.splice(segmentIndex, 1);
          }
        }
        
        // Add other random colors for the remaining segments
        for (let i = 0; i < otherColorsCount; i++) {
          if (allSegments.length > 0) {
            const randomIndex = Math.floor(Math.random() * allSegments.length);
            const randomColor = allSegments[randomIndex];
            mixedColors.push(randomColor);
            allSegments.splice(randomIndex, 1);
          }
        }
        
        // Shuffle the mixed colors for more randomness
        const shuffledMixedColors = shuffle(mixedColors);
        tubes[tubeIndex] = shuffledMixedColors;
        
        console.log(`  One-color tube ${tubeIndex}: ${designatedColorCount}/${level.tubeSize} segments of ${designatedColor} + mixed colors`);
      } else {
        // Before level 40, use mostly the designated color
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
  
  // Step 9: Verify no conflicts
  const frozenTubeColorSet = new Set(frozenTubes.map(index => frozenTubeColors[index]));
  const oneColorTubeColorSet = new Set(oneColorInTubes.map(r => r.color));
  const conflicts = [...frozenTubeColorSet].filter(color => oneColorTubeColorSet.has(color));
  
  if (conflicts.length === 0) {
    console.log(`  ✅ No frozen/one-color conflicts!`);
  } else {
    console.log(`  ⚠️  Conflicts found: ${conflicts.join(', ')}`);
  }
}

// Main execution
console.log('Comprehensive fix for conflicts and difficulty...');

// Load levels
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// Find levels with frozen tubes or one-color tubes
let levelsToFix = [];
levels.forEach((level, levelIndex) => {
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  if (frozenTubes.length > 0 || oneColorInTubes.length > 0) {
    levelsToFix.push(levelIndex);
  }
});

console.log(`Found ${levelsToFix.length} levels with special tubes to fix`);

// Fix each level
levelsToFix.forEach(levelIndex => {
  fixConflictsAndDifficulty(levels[levelIndex], levelIndex);
});

// Save the fixed levels
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`\nFixed ${levelsToFix.length} levels`);
console.log(`Fixed levels saved to ${levelsPath}`);

// Final verification
console.log('\nFinal verification...');
let allFixed = true;
let noConflicts = true;
let frozenTubesCorrect = true;
let oneColorTubesMixed = true;

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
    console.log(`Level ${levelIndex + 1} has color issues: ${problematicColors.join(', ')}`);
    allFixed = false;
  }
  
  // Check for frozen/one-color conflicts
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  
  if (frozenTubes.length > 0 && oneColorInTubes.length > 0) {
    // Get colors in frozen tubes
    const frozenColors = new Set();
    frozenTubes.forEach(tubeIndex => {
      const tube = level.tubes[tubeIndex];
      if (tube.length > 0) {
        frozenColors.add(tube[0]); // All segments in frozen tube should be same color
      }
    });
    
    // Check for conflicts with one-color tubes
    oneColorInTubes.forEach(restriction => {
      if (frozenColors.has(restriction.color)) {
        console.log(`Level ${levelIndex + 1} has conflict: frozen tube uses ${restriction.color}, one-color tube ${restriction.tubeIndex} also needs ${restriction.color}`);
        noConflicts = false;
      }
    });
  }
  
  // Check frozen tubes are not full
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    if (tube.length === level.tubeSize) {
      console.log(`Level ${levelIndex + 1} frozen tube ${tubeIndex} is full (${tube.length}/${level.tubeSize})`);
      frozenTubesCorrect = false;
    }
  });
  
  // Check one-color tubes after level 40 have mixed colors
  if (oneColorInTubes.length > 0 && levelIndex >= 40) {
    oneColorInTubes.forEach(restriction => {
      const tube = level.tubes[restriction.tubeIndex];
      if (tube.length > 0) {
        const firstColor = tube[0];
        const allSameColor = tube.every(color => color === firstColor);
        if (allSameColor) {
          console.log(`Level ${levelIndex + 1} one-color tube ${restriction.tubeIndex} has only one color (${firstColor})`);
          oneColorTubesMixed = false;
        }
      }
    });
  }
});

if (allFixed) {
  console.log('✅ All levels have perfect color distribution!');
} else {
  console.log('⚠️  Some levels still have color issues');
}

if (noConflicts) {
  console.log('✅ No frozen/one-color conflicts found!');
} else {
  console.log('⚠️  Some levels still have conflicts');
}

if (frozenTubesCorrect) {
  console.log('✅ All frozen tubes are properly partial!');
} else {
  console.log('⚠️  Some frozen tubes are still full');
}

if (oneColorTubesMixed) {
  console.log('✅ All one-color tubes after level 40 have mixed colors!');
} else {
  console.log('⚠️  Some one-color tubes after level 40 still have only one color');
}

if (allFixed && noConflicts && frozenTubesCorrect && oneColorTubesMixed) {
  console.log('\n🎉 ALL REQUIREMENTS MET! The game is perfectly balanced and challenging!');
} else {
  console.log('\n⚠️  Some issues remain');
} 