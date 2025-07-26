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
  const expectedPerColor = level.tubeSize;
  const expectedColors = level.colors;
  
  // Count current colors
  const currentCounts = countColors(level);
  
  console.log(`\nFixing Level ${levelIndex + 1}:`);
  console.log(`  Expected: ${expectedColors} colors with ${expectedPerColor} each`);
  console.log(`  Current: ${JSON.stringify(currentCounts)}`);
  
  // Target colors for this level
  const targetColors = COLORS.slice(0, expectedColors);
  
  // Identify frozen tubes and one-color restrictions
  const frozenTubes = level.frozenTubes || [];
  const oneColorInTubes = level.oneColorInTubes || [];
  
  // Step 1: Analyze frozen tubes and their colors
  const frozenTubeColors = {};
  frozenTubes.forEach(tubeIndex => {
    const tube = level.tubes[tubeIndex];
    if (tube.length > 0) {
      // For frozen tubes, we need to ensure they have exactly tubeSize segments of one color
      const colorCounts = {};
      tube.forEach(color => {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      });
      
      // Find the most common color in this frozen tube
      let dominantColor = null;
      let maxCount = 0;
      Object.keys(colorCounts).forEach(color => {
        if (colorCounts[color] > maxCount) {
          dominantColor = color;
          maxCount = colorCounts[color];
        }
      });
      
      // If no dominant color or it's not in target colors, use first target color
      if (!dominantColor || !targetColors.includes(dominantColor)) {
        dominantColor = targetColors[0];
      }
      
      frozenTubeColors[tubeIndex] = dominantColor;
    }
  });
  
  // Step 2: Create perfect distribution
  const allSegments = [];
  targetColors.forEach(color => {
    for (let i = 0; i < expectedPerColor; i++) {
      allSegments.push(color);
    }
  });
  
  // Step 3: Handle frozen tubes first - fill them with their assigned colors
  const newTubes = level.tubes.map(() => []);
  const usedSegments = new Set();
  
  frozenTubes.forEach(tubeIndex => {
    const assignedColor = frozenTubeColors[tubeIndex];
    if (assignedColor) {
      // Fill frozen tube with exactly tubeSize segments of the assigned color
      for (let i = 0; i < expectedPerColor; i++) {
        newTubes[tubeIndex].push(assignedColor);
        // Mark these segments as used
        const segmentIndex = allSegments.indexOf(assignedColor);
        if (segmentIndex !== -1) {
          allSegments.splice(segmentIndex, 1);
        }
      }
    } else {
      // If no color assigned, keep the frozen tube empty
      newTubes[tubeIndex] = [];
    }
  });
  
  // Step 4: Handle one-color tubes
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const color = restriction.color;
    
    // Ensure the tube exists in newTubes array
    if (tubeIndex >= newTubes.length) {
      // Extend the array if needed
      while (newTubes.length <= tubeIndex) {
        newTubes.push([]);
      }
    }
    
    // Fill one-color tube with some segments of its designated color
    const fillAmount = Math.floor(Math.random() * (expectedPerColor - 1)) + 1; // 1 to tubeSize-1
    for (let i = 0; i < fillAmount; i++) {
      newTubes[tubeIndex].push(color);
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
  for (let tubeIndex = 0; tubeIndex < level.tubes.length; tubeIndex++) {
    if (frozenTubes.includes(tubeIndex)) {
      continue; // Skip frozen tubes (already filled)
    }
    
    const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === tubeIndex);
    if (oneColorRestriction) {
      // For one-color tubes, only add segments of the designated color
      const designatedColor = oneColorRestriction.color;
      while (newTubes[tubeIndex].length < expectedPerColor && segmentIndex < remainingSegments.length) {
        if (remainingSegments[segmentIndex] === designatedColor) {
          newTubes[tubeIndex].push(remainingSegments[segmentIndex]);
          remainingSegments.splice(segmentIndex, 1);
        } else {
          segmentIndex++;
        }
      }
      segmentIndex = 0; // Reset for next tube
    } else {
      // Regular tube - fill with any available segments
      while (newTubes[tubeIndex].length < expectedPerColor && segmentIndex < remainingSegments.length) {
        newTubes[tubeIndex].push(remainingSegments[segmentIndex]);
        segmentIndex++;
      }
    }
  }
  
  // Step 7: If there are still remaining segments, distribute them randomly
  while (segmentIndex < remainingSegments.length) {
    const availableTubes = [];
    for (let i = 0; i < level.tubes.length; i++) {
      if (!frozenTubes.includes(i) && newTubes[i].length < expectedPerColor) {
        const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === i);
        if (!oneColorRestriction) {
          // Only add regular tubes (not one-color restricted)
          availableTubes.push(i);
        }
      }
    }
    
    if (availableTubes.length === 0) break;
    
    const randomTube = availableTubes[Math.floor(Math.random() * availableTubes.length)];
    newTubes[randomTube].push(remainingSegments[segmentIndex]);
    segmentIndex++;
  }
  
  // Step 8: Update the level
  level.tubes = newTubes;
  
  // Step 9: Verify the fix
  const newCounts = countColors(level);
  console.log(`  After fix: ${JSON.stringify(newCounts)}`);
  
  // Check if all colors have exactly the expected count
  const problematicColors = Object.keys(newCounts).filter(
    color => newCounts[color] !== expectedPerColor
  );
  
  if (problematicColors.length === 0) {
    console.log(`  ✅ Fixed! All colors now appear exactly ${expectedPerColor} times`);
    return true;
  } else {
    console.log(`  ⚠️  Still problematic: ${problematicColors.join(', ')}`);
    return false;
  }
}

// Main execution
console.log('Fixing frozen tube color distribution issues...');

// Load levels
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

let issuesFixed = 0;
let totalIssues = 0;

// Check each level for color distribution issues
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
    totalIssues++;
    console.log(`\nLevel ${levelIndex + 1} has color distribution issues:`);
    problematicColors.forEach(color => {
      const count = currentCounts[color] || 0;
      console.log(`  ${color}: ${count}/${expectedPerColor}`);
    });
    
    if (fixColorDistribution(level, levelIndex)) {
      issuesFixed++;
    }
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total levels with issues: ${totalIssues}`);
console.log(`Issues fixed: ${issuesFixed}`);
console.log(`Issues remaining: ${totalIssues - issuesFixed}`);

// Save the fixed levels
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`\nFixed levels saved to ${levelsPath}`); 