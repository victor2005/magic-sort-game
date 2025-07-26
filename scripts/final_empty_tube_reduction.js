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

// Final aggressive empty tube reduction
function finalEmptyTubeReduction() {
  console.log('Final aggressive empty tube reduction...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  let totalReduced = 0;
  
  levels.forEach((level, levelIndex) => {
    const currentEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    const frozenTubes = level.frozenTubes || [];
    const oneColorInTubes = level.oneColorInTubes || [];
    const specialTubes = frozenTubes.length + oneColorInTubes.length;
    
    // More aggressive empty tube reduction
    let optimalEmptyTubes = 1; // Always keep at least 1 empty tube
    
    if (levelIndex < 30) {
      optimalEmptyTubes = 1; // Early-mid levels: 1 empty tube
    } else {
      optimalEmptyTubes = 2; // Late levels: 2 empty tubes max
    }
    
    // If we have too many empty tubes, reduce them
    if (currentEmptyTubes > optimalEmptyTubes) {
      console.log(`\nLevel ${levelIndex + 1}: Reducing from ${currentEmptyTubes} to ${optimalEmptyTubes} empty tubes`);
      
      // Step 1: Create exactly tubeSize segments for each color
      const allSegments = [];
      const targetColors = COLORS.slice(0, level.colors);
      targetColors.forEach(color => {
        for (let i = 0; i < level.tubeSize; i++) {
          allSegments.push(color);
        }
      });
      
      // Step 2: Calculate new total tubes needed
      const newTotalTubes = level.colors + optimalEmptyTubes + specialTubes;
      const tubes = Array(newTotalTubes).fill().map(() => []);
      
      // Step 3: Handle frozen tubes first
      frozenTubes.forEach((frozenIndex) => {
        const tube = level.tubes[frozenIndex];
        if (tube.length > 0) {
          const frozenColor = tube[0]; // All segments in frozen tube should be same color
          
          // Fill frozen tube with the same amount as before
          for (let i = 0; i < tube.length; i++) {
            tubes[frozenIndex].push(frozenColor);
            // Remove these segments from the available pool
            const segmentIndex = allSegments.indexOf(frozenColor);
            if (segmentIndex !== -1) {
              allSegments.splice(segmentIndex, 1);
            }
          }
          
          console.log(`  Frozen tube ${frozenIndex}: ${tube.length}/${level.tubeSize} segments of ${frozenColor}`);
        }
      });
      
      // Step 4: Handle one-color tubes
      oneColorInTubes.forEach(restriction => {
        const tubeIndex = restriction.tubeIndex;
        const tube = level.tubes[tubeIndex];
        const designatedColor = restriction.color;
        
        // Fill one-color tube with the same content as before
        for (let i = 0; i < tube.length; i++) {
          tubes[tubeIndex].push(tube[i]);
          // Remove these segments from available pool
          const segmentIndex = allSegments.indexOf(tube[i]);
          if (segmentIndex !== -1) {
            allSegments.splice(segmentIndex, 1);
          }
        }
        
        console.log(`  One-color tube ${tubeIndex}: ${tube.length}/${level.tubeSize} segments (designated: ${designatedColor})`);
      });
      
      // Step 5: Shuffle remaining segments
      const remainingSegments = shuffle(allSegments);
      
      // Step 6: Distribute remaining segments to regular tubes (not frozen, not one-color)
      let segmentIndex = 0;
      for (let tubeIndex = 0; tubeIndex < newTotalTubes; tubeIndex++) {
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
      level.emptyTubes = optimalEmptyTubes;
      
      // Step 8: Verify color balance
      const colorCounts = countColors(level);
      
      // Check if all colors have exactly the expected count
      const problematicColors = targetColors.filter(
        color => (colorCounts[color] || 0) !== level.tubeSize
      );
      
      if (problematicColors.length === 0) {
        console.log(`  ✅ Perfect distribution maintained!`);
      } else {
        console.log(`  ⚠️  Issues: ${problematicColors.join(', ')}`);
      }
      
      totalReduced += (currentEmptyTubes - optimalEmptyTubes);
    }
  });
  
  // Save the modified levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log(`\n🎉 Reduced ${totalReduced} more unnecessary empty tubes!`);
  console.log(`Modified levels saved to ${levelsPath}`);
  
  // Final verification
  console.log('\nFinal verification...');
  let allPerfect = true;
  let noConflicts = true;
  let frozenPartial = true;
  
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
        if (tube.length > 0) {
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
      if (tube.length === level.tubeSize) {
        console.log(`❌ Level ${levelIndex + 1} frozen tube ${tubeIndex} is full`);
        frozenPartial = false;
      }
    });
  });
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(`✅ Perfect color distribution: ${allPerfect ? 'YES' : 'NO'}`);
  console.log(`✅ No frozen/one-color conflicts: ${noConflicts ? 'YES' : 'NO'}`);
  console.log(`✅ Frozen tubes partial: ${frozenPartial ? 'YES' : 'NO'}`);
  
  if (allPerfect && noConflicts && frozenPartial) {
    console.log('\n🎉 SUCCESS! Game is now much more challenging:');
    console.log('   • Perfect color distribution maintained');
    console.log('   • No conflicts between frozen and one-color tubes');
    console.log('   • Frozen tubes start with partial amounts');
    console.log('   • Aggressively reduced unnecessary empty tubes');
    console.log('   • Game is now much more challenging and fun!');
  } else {
    console.log('\n⚠️  Some issues remain');
  }
}

// Run the function
finalEmptyTubeReduction(); 