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

// Make Level 44 more challenging
function makeLevel44Challenging() {
  console.log('Making Level 44 more challenging...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  const level44 = levels[43]; // Level 44 (0-indexed)
  
  console.log('Current Level 44:');
  console.log('  Colors:', level44.colors);
  console.log('  Tube size:', level44.tubeSize);
  console.log('  Empty tubes:', level44.emptyTubes);
  console.log('  Frozen tubes:', level44.frozenTubes || []);
  console.log('  One-color tubes:', level44.oneColorInTubes || []);
  
  // Step 1: Create exactly tubeSize segments for each color
  const allSegments = [];
  const targetColors = COLORS.slice(0, level44.colors);
  targetColors.forEach(color => {
    for (let i = 0; i < level44.tubeSize; i++) {
      allSegments.push(color);
    }
  });
  
  // Step 2: Add special tubes to make it more challenging
  // Add 1 frozen tube and 1 one-color tube
  const frozenTubes = [2]; // Tube 2 will be frozen
  const oneColorInTubes = [{ tubeIndex: 6, color: "#e57373" }]; // Tube 6 will be one-color for red
  
  // Step 3: Calculate total tubes needed
  const totalTubes = level44.colors + level44.emptyTubes + frozenTubes.length + oneColorInTubes.length;
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 4: Handle frozen tube first
  const frozenIndex = frozenTubes[0];
  const frozenColor = "#64b5f6"; // Blue for frozen tube
  
  // Fill frozen tube with PARTIAL amount (1 to tubeSize-1) of the assigned color
  const frozenPartialAmount = Math.floor(Math.random() * (level44.tubeSize - 1)) + 1; // 1 to tubeSize-1
  console.log(`  Frozen tube ${frozenIndex}: ${frozenPartialAmount}/${level44.tubeSize} segments of ${frozenColor}`);
  
  for (let i = 0; i < frozenPartialAmount; i++) {
    tubes[frozenIndex].push(frozenColor);
    // Remove these segments from the available pool
    const segmentIndex = allSegments.indexOf(frozenColor);
    if (segmentIndex !== -1) {
      allSegments.splice(segmentIndex, 1);
    }
  }
  
  // Step 5: Handle one-color tube
  const oneColorIndex = oneColorInTubes[0].tubeIndex;
  const oneColorDesignated = oneColorInTubes[0].color;
  
  // Since this is before level 40, use mostly the designated color
  const oneColorPartialAmount = Math.floor(Math.random() * (level44.tubeSize - 1)) + 1; // 1 to tubeSize-1
  console.log(`  One-color tube ${oneColorIndex}: ${oneColorPartialAmount}/${level44.tubeSize} segments of ${oneColorDesignated}`);
  
  for (let i = 0; i < oneColorPartialAmount; i++) {
    tubes[oneColorIndex].push(oneColorDesignated);
    // Remove these segments from available pool
    const segmentIndex = allSegments.indexOf(oneColorDesignated);
    if (segmentIndex !== -1) {
      allSegments.splice(segmentIndex, 1);
    }
  }
  
  // Step 6: Shuffle remaining segments
  const remainingSegments = shuffle(allSegments);
  
  // Step 7: Distribute remaining segments to regular tubes (not frozen, not one-color)
  let segmentIndex = 0;
  for (let tubeIndex = 0; tubeIndex < totalTubes; tubeIndex++) {
    if (frozenTubes.includes(tubeIndex) || oneColorInTubes.find(r => r.tubeIndex === tubeIndex)) {
      continue; // Skip frozen and one-color tubes (already filled)
    }
    
    // Fill regular tube with remaining segments
    while (tubes[tubeIndex].length < level44.tubeSize && segmentIndex < remainingSegments.length) {
      tubes[tubeIndex].push(remainingSegments[segmentIndex]);
      segmentIndex++;
    }
  }
  
  // Step 8: Update the level
  level44.tubes = tubes;
  level44.frozenTubes = frozenTubes;
  level44.oneColorInTubes = oneColorInTubes;
  
  // Step 9: Verify color balance
  const colorCounts = countColors(level44);
  console.log(`  Final color distribution: ${JSON.stringify(colorCounts)}`);
  
  // Check if all colors have exactly the expected count
  const problematicColors = targetColors.filter(
    color => (colorCounts[color] || 0) !== level44.tubeSize
  );
  
  if (problematicColors.length === 0) {
    console.log(`  ✅ Perfect distribution maintained!`);
  } else {
    console.log(`  ⚠️  Issues: ${problematicColors.join(', ')}`);
  }
  
  // Step 10: Verify no conflicts
  const frozenTubeColorSet = new Set([frozenColor]);
  const oneColorTubeColorSet = new Set([oneColorDesignated]);
  const conflicts = [...frozenTubeColorSet].filter(color => oneColorTubeColorSet.has(color));
  
  if (conflicts.length === 0) {
    console.log(`  ✅ No frozen/one-color conflicts!`);
  } else {
    console.log(`  ⚠️  Conflicts found: ${conflicts.join(', ')}`);
  }
  
  // Save the modified levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log(`\nLevel 44 has been made more challenging!`);
  console.log(`Modified level saved to ${levelsPath}`);
  
  // Final verification
  console.log('\nFinal verification...');
  const currentCounts = countColors(level44);
  const expectedPerColor = level44.tubeSize;
  const expectedColors = level44.colors;
  const targetColorsFinal = COLORS.slice(0, expectedColors);
  
  // Check if any color doesn't have exactly the expected count
  const problematicColorsFinal = targetColorsFinal.filter(
    color => (currentCounts[color] || 0) !== expectedPerColor
  );
  
  if (problematicColorsFinal.length === 0) {
    console.log('✅ Level 44 has perfect color distribution!');
  } else {
    console.log(`⚠️  Level 44 has color issues: ${problematicColorsFinal.join(', ')}`);
  }
  
  // Check for frozen/one-color conflicts
  const frozenTubesFinal = level44.frozenTubes || [];
  const oneColorInTubesFinal = level44.oneColorInTubes || [];
  
  if (frozenTubesFinal.length > 0 && oneColorInTubesFinal.length > 0) {
    // Get colors in frozen tubes
    const frozenColors = new Set();
    frozenTubesFinal.forEach(tubeIndex => {
      const tube = level44.tubes[tubeIndex];
      if (tube.length > 0) {
        frozenColors.add(tube[0]); // All segments in frozen tube should be same color
      }
    });
    
    // Check for conflicts with one-color tubes
    let hasConflicts = false;
    oneColorInTubesFinal.forEach(restriction => {
      if (frozenColors.has(restriction.color)) {
        console.log(`⚠️  Level 44 has conflict: frozen tube uses ${restriction.color}, one-color tube ${restriction.tubeIndex} also needs ${restriction.color}`);
        hasConflicts = true;
      }
    });
    
    if (!hasConflicts) {
      console.log('✅ Level 44 has no frozen/one-color conflicts!');
    }
  }
  
  // Check frozen tubes are not full
  let frozenTubesCorrect = true;
  frozenTubesFinal.forEach(tubeIndex => {
    const tube = level44.tubes[tubeIndex];
    if (tube.length === level44.tubeSize) {
      console.log(`⚠️  Level 44 frozen tube ${tubeIndex} is full (${tube.length}/${level44.tubeSize})`);
      frozenTubesCorrect = false;
    }
  });
  
  if (frozenTubesCorrect) {
    console.log('✅ Level 44 frozen tubes are properly partial!');
  }
  
  console.log('\n🎉 Level 44 is now more challenging with:');
  console.log('   • 1 frozen tube (partial blue)');
  console.log('   • 1 one-color tube (partial red)');
  console.log('   • Perfect color distribution maintained');
  console.log('   • No conflicts between special tubes');
}

// Run the function
makeLevel44Challenging(); 