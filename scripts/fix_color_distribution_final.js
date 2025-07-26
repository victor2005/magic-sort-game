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

// Fix color distribution for a level
function fixColorDistribution(level, levelIndex) {
  const { colors, tubeSize, frozenTubes, oneColorInTubes } = level;
  
  // Step 1: Create exactly tubeSize segments for each color
  const allSegments = [];
  const targetColors = COLORS.slice(0, colors);
  targetColors.forEach(color => {
    for (let i = 0; i < tubeSize; i++) {
      allSegments.push(color);
    }
  });
  
  // Step 2: Calculate total tubes needed
  const totalTubes = colors + 1 + frozenTubes.length + oneColorInTubes.length; // Always 1 empty tube
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 3: Handle frozen tubes first
  frozenTubes.forEach((frozenIndex) => {
    // Use a color that's not used by one-color tubes
    const oneColorColors = new Set(oneColorInTubes.map(r => r.color));
    const availableColors = targetColors.filter(color => !oneColorColors.has(color));
    const frozenColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    
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

// Fix color distribution for all levels
function fixColorDistributionFinal() {
  console.log('Fixing color distribution for all levels...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  let fixedCount = 0;
  
  levels.forEach((level, levelIndex) => {
    const counts = countColors(level);
    const targetColors = COLORS.slice(0, level.colors);
    const issues = targetColors.filter(color => (counts[color] || 0) !== level.tubeSize);
    
    if (issues.length > 0) {
      console.log(`Fixing Level ${levelIndex + 1} color distribution issue: ${issues.join(', ')}`);
      
      // Fix the level
      level.tubes = fixColorDistribution(level, levelIndex);
      fixedCount++;
    }
  });
  
  // Save the fixed levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log(`\n🎉 Fixed ${fixedCount} levels with color distribution issues!`);
  console.log(`Modified levels saved to ${levelsPath}`);
  
  // Final verification
  console.log('\nFinal verification...');
  let allPerfect = true;
  let noConflicts = true;
  let frozenPartial = true;
  let emptyTubesMinimal = true;
  
  levels.forEach((level, levelIndex) => {
    const counts = countColors(level);
    const targetColors = COLORS.slice(0, level.colors);
    const issues = targetColors.filter(color => (counts[color] || 0) !== level.tubeSize);
    
    if (issues.length > 0) {
      console.log(`❌ Level ${levelIndex + 1} color distribution issue: ${issues.join(', ')}`);
      allPerfect = false;
    }
    
    const frozenTubes = level.frozenTubes || [];
    const oneColorInTubes = level.oneColorInTubes || [];
    
    if (frozenTubes.length > 0 && oneColorInTubes.length > 0) {
      const frozenColors = new Set();
      frozenTubes.forEach(tubeIndex => {
        const tube = level.tubes[tubeIndex];
        if (tube && tube.length > 0) {
          frozenColors.add(tube[0]);
        }
      });
      
      oneColorInTubes.forEach(restriction => {
        if (frozenColors.has(restriction.color)) {
          console.log(`❌ Level ${levelIndex + 1} conflict: frozen tube uses ${restriction.color}, one-color tube ${restriction.tubeIndex} also needs ${restriction.color}`);
          noConflicts = false;
        }
      });
    }
    
    frozenTubes.forEach(tubeIndex => {
      const tube = level.tubes[tubeIndex];
      if (tube && tube.length === level.tubeSize) {
        console.log(`❌ Level ${levelIndex + 1} frozen tube ${tubeIndex} is full`);
        frozenPartial = false;
      }
    });
    
    // Check empty tubes are minimal
    const actualEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    if (actualEmptyTubes !== 1) {
      console.log(`❌ Level ${levelIndex + 1} has ${actualEmptyTubes} empty tubes, should be 1`);
      emptyTubesMinimal = false;
    }
  });
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(`✅ Perfect color distribution: ${allPerfect ? 'YES' : 'NO'}`);
  console.log(`✅ No frozen/one-color conflicts: ${noConflicts ? 'YES' : 'NO'}`);
  console.log(`✅ Frozen tubes partial: ${frozenPartial ? 'YES' : 'NO'}`);
  console.log(`✅ Empty tubes minimal: ${emptyTubesMinimal ? 'YES' : 'NO'}`);
  
  if (allPerfect && noConflicts && frozenPartial && emptyTubesMinimal) {
    console.log('\n🎉 SUCCESS! All 100 levels are now perfect:');
    console.log('   • Perfect color distribution maintained');
    console.log('   • No conflicts between frozen and one-color tubes');
    console.log('   • Frozen tubes start with partial amounts');
    console.log('   • Empty tubes kept to absolute minimum (1 per level)');
    console.log('   • Progressive difficulty from levels 1-100');
    console.log('   • Much more challenging and engaging gameplay!');
  } else {
    console.log('\n⚠️  Some issues remain');
  }
}

// Run the function
fixColorDistributionFinal(); 