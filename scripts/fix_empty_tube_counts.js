const fs = require('fs');

// Fix empty tube counts
function fixEmptyTubeCounts() {
  console.log('Fixing empty tube counts...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  let totalFixed = 0;
  
  levels.forEach((level, levelIndex) => {
    const actualEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    const declaredEmptyTubes = level.emptyTubes;
    
    if (actualEmptyTubes !== declaredEmptyTubes) {
      console.log(`Level ${levelIndex + 1}: Actual empty tubes: ${actualEmptyTubes}, Declared: ${declaredEmptyTubes}`);
      
      // Update the declared count to match actual
      level.emptyTubes = actualEmptyTubes;
      totalFixed++;
    }
  });
  
  // Save the fixed levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log(`\n🎉 Fixed ${totalFixed} level empty tube count mismatches!`);
  console.log(`Fixed levels saved to ${levelsPath}`);
  
  // Final verification
  console.log('\nFinal verification...');
  let allConsistent = true;
  
  levels.forEach((level, levelIndex) => {
    const actualEmptyTubes = level.tubes.filter(tube => tube.length === 0).length;
    const declaredEmptyTubes = level.emptyTubes;
    
    if (actualEmptyTubes !== declaredEmptyTubes) {
      console.log(`❌ Level ${levelIndex + 1}: Mismatch - Actual: ${actualEmptyTubes}, Declared: ${declaredEmptyTubes}`);
      allConsistent = false;
    }
  });
  
  if (allConsistent) {
    console.log('✅ All empty tube counts are now consistent!');
  } else {
    console.log('⚠️  Some inconsistencies remain');
  }
}

// Run the function
fixEmptyTubeCounts(); 