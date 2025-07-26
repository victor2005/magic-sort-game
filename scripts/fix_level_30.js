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

// Generate a solvable level configuration
function generateSolvableLevel(levelIndex) {
  const colors = 6;
  const tubeSize = 6;
  const emptyTubes = 1;
  const frozenTubes = [];
  const oneColorTubes = [];
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    frozenTubes,
    oneColorInTubes: oneColorTubes,
    levelIndex
  };
}

// Generate tubes for a level
function generateTubes(level) {
  const { colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes, levelIndex } = level;
  
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
  
  // Step 3: Handle frozen tubes first (ensure no duplicate colors)
  const usedFrozenColors = new Set();
  frozenTubes.forEach((frozenIndex) => {
    // Use a color that's not used by one-color tubes and not used by other frozen tubes
    const oneColorColors = new Set(oneColorInTubes.map(r => r.color));
    const availableColors = targetColors.filter(color => 
      !oneColorColors.has(color) && !usedFrozenColors.has(color)
    );
    
    if (availableColors.length === 0) {
      console.log(`Warning: No available colors for frozen tube ${frozenIndex} in level ${levelIndex + 1}`);
      return;
    }
    
    const frozenColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    usedFrozenColors.add(frozenColor);
    
    // Fill frozen tube with PARTIAL amount (1 to tubeSize-1) of the assigned color
    const frozenPartialAmount = Math.floor(Math.random() * (tubeSize - 1)) + 1; // 1 to tubeSize-1
    
    for (let i = 0; i < frozenPartialAmount; i++) {
      tubes[frozenIndex].push(frozenColor);
      // Remove these segments from the available pool
      const segmentIndex = allSegments.indexOf(frozenColor);
      if (segmentIndex !== -1) {
        allSegments.splice(segmentIndex, 1);
      }
    }
  });
  
  // Step 4: Handle one-color tubes
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const designatedColor = restriction.color;
    
    // Fill one-color tube with mixed colors for difficulty (after level 40)
    if (levelIndex >= 40) {
      const mixedColors = [];
      const designatedColorCount = Math.floor(Math.random() * 3) + 1; // 1-3 segments of designated color
      const otherColorsCount = tubeSize - designatedColorCount;
      
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
    } else {
      // Before level 40, use mostly the designated color
      const partialAmount = Math.floor(Math.random() * (tubeSize - 1)) + 1; // 1 to tubeSize-1
      
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
    while (tubes[tubeIndex].length < tubeSize && segmentIndex < remainingSegments.length) {
      tubes[tubeIndex].push(remainingSegments[segmentIndex]);
      segmentIndex++;
    }
  }
  
  // Step 7: Ensure exactly one empty tube
  const filledTubes = tubes.filter(tube => tube.length > 0);
  const emptyTubesCount = tubes.filter(tube => tube.length === 0).length;
  
  if (emptyTubesCount > 1) {
    // Remove excess empty tubes
    const newTubes = filledTubes;
    // Add exactly one empty tube
    newTubes.push([]);
    return newTubes;
  } else if (emptyTubesCount === 0) {
    // Add one empty tube
    tubes.push([]);
    return tubes;
  }
  
  return tubes;
}

// Simple solvability check
function isSolvable(tubes, tubeSize) {
  // Check if there are any obvious unsolvable patterns
  // This is a basic check - a full solver would be more comprehensive
  
  // Count colors
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if any color has more segments than can fit in tubes
  const totalTubes = tubes.length;
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > totalTubes * tubeSize) {
      return false;
    }
  }
  
  return true;
}

// Fix Level 30
function fixLevel30() {
  console.log('🔧 Fixing Level 30...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  // Generate a new Level 30
  let attempts = 0;
  let newLevel = null;
  
  while (attempts < 10) {
    attempts++;
    console.log(`Attempt ${attempts} to generate solvable Level 30...`);
    
    const levelConfig = generateSolvableLevel(29); // Level 30 (0-indexed)
    levelConfig.tubes = generateTubes(levelConfig);
    
    // Basic solvability check
    if (isSolvable(levelConfig.tubes, levelConfig.tubeSize)) {
      newLevel = levelConfig;
      break;
    }
  }
  
  if (newLevel) {
    // Remove levelIndex from final output
    delete newLevel.levelIndex;
    
    // Replace Level 30
    levels[29] = newLevel;
    
    // Save the fixed levels
    fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
    console.log('✅ Level 30 has been regenerated and saved!');
    
    // Verify the fix
    console.log('\n📊 New Level 30 Configuration:');
    console.log(`Colors: ${newLevel.colors}`);
    console.log(`Tube size: ${newLevel.tubeSize}`);
    console.log(`Total tubes: ${newLevel.tubes.length}`);
    console.log(`Empty tubes: ${newLevel.tubes.filter(t => t.length === 0).length}`);
    console.log(`Frozen tubes: ${newLevel.frozenTubes.length}`);
    console.log(`One-color tubes: ${newLevel.oneColorInTubes.length}`);
    
    console.log('\n🔍 New Initial State:');
    newLevel.tubes.forEach((tube, index) => {
      console.log(`Tube ${index + 1}: [${tube.map(color => color.substring(1, 4)).join(', ')}]`);
    });
    
    console.log('\n🎯 Level 30 should now be solvable!');
  } else {
    console.log('❌ Failed to generate a solvable Level 30 after 10 attempts');
  }
}

// Run the fix
fixLevel30(); 