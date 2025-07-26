const fs = require('fs');

// Simple direct empty tube reduction
function simpleEmptyTubeReduction() {
  console.log('Simple direct empty tube reduction...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  let totalReduced = 0;
  
  levels.forEach((level, levelIndex) => {
    const currentEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    
    // Calculate optimal empty tubes
    let optimalEmptyTubes = 1; // Always keep at least 1 empty tube
    
    if (levelIndex < 30) {
      optimalEmptyTubes = 1; // Early-mid levels: 1 empty tube
    } else {
      optimalEmptyTubes = 2; // Late levels: 2 empty tubes max
    }
    
    // If we have too many empty tubes, reduce them
    if (currentEmptyTubes > optimalEmptyTubes) {
      console.log(`\nLevel ${levelIndex + 1}: Reducing from ${currentEmptyTubes} to ${optimalEmptyTubes} empty tubes`);
      
      // Find indices of empty tubes
      const emptyTubeIndices = [];
      level.tubes.forEach((tube, index) => {
        if (tube.length === 0) {
          emptyTubeIndices.push(index);
        }
      });
      
      // Remove excess empty tubes (keep only the first optimalEmptyTubes)
      const tubesToRemove = emptyTubeIndices.slice(optimalEmptyTubes);
      console.log(`  Removing ${tubesToRemove.length} excess empty tubes at indices: ${tubesToRemove.join(', ')}`);
      
      // Remove the excess empty tubes (in reverse order to maintain indices)
      tubesToRemove.reverse().forEach(index => {
        level.tubes.splice(index, 1);
      });
      
      // Update the emptyTubes property
      level.emptyTubes = optimalEmptyTubes;
      
      totalReduced += tubesToRemove.length;
    }
  });
  
  // Save the modified levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log(`\n🎉 Actually reduced ${totalReduced} unnecessary empty tubes!`);
  console.log(`Modified levels saved to ${levelsPath}`);
  
  // Final verification
  console.log('\nFinal verification...');
  let allCorrect = true;
  
  levels.forEach((level, levelIndex) => {
    const actualEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    const expectedEmptyTubes = levelIndex < 30 ? 1 : 2;
    
    if (actualEmptyTubes > expectedEmptyTubes) {
      console.log(`❌ Level ${levelIndex + 1} has ${actualEmptyTubes} empty tubes, should be ${expectedEmptyTubes}`);
      allCorrect = false;
    }
  });
  
  if (allCorrect) {
    console.log('✅ All empty tubes correctly reduced!');
  } else {
    console.log('⚠️  Some levels still have too many empty tubes');
  }
}

// Run the function
simpleEmptyTubeReduction(); 