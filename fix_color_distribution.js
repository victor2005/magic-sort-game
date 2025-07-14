const fs = require('fs');

// Read levels data
const levels = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('Checking color distribution across all levels...\n');

let issuesFound = 0;
let issuesFixed = 0;

levels.forEach((level, levelIndex) => {
  const { tubes, tubeSize, colors } = level;
  
  // Count occurrences of each color
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if any color appears more or less than tubeSize times
  const problematicColors = [];
  const uniqueColors = Object.keys(colorCounts);
  
  uniqueColors.forEach(color => {
    if (colorCounts[color] !== tubeSize) {
      problematicColors.push({ color, count: colorCounts[color], expected: tubeSize });
    }
  });
  
  if (problematicColors.length > 0) {
    issuesFound++;
    console.log(`❌ Level ${levelIndex + 1}: Color distribution issues`);
    problematicColors.forEach(({ color, count, expected }) => {
      console.log(`   Color ${color}: has ${count}, expected ${expected}`);
    });
    
    // Try to fix the distribution
    const totalSegments = tubes.reduce((sum, tube) => sum + tube.length, 0);
    const expectedTotal = colors * tubeSize;
    
    if (totalSegments === expectedTotal) {
      // Same total count, just redistribute
      console.log(`   📝 Attempting to redistribute colors...`);
      
      // Create a flat array of all colors
      const allColors = [];
      tubes.forEach(tube => {
        allColors.push(...tube);
      });
      
      // Create target distribution
      const targetColors = [];
      uniqueColors.forEach(color => {
        for (let i = 0; i < tubeSize; i++) {
          targetColors.push(color);
        }
      });
      
      // Shuffle the target colors to create variation
      for (let i = targetColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetColors[i], targetColors[j]] = [targetColors[j], targetColors[i]];
      }
      
      // Redistribute back to tubes, maintaining constraints
      const newTubes = tubes.map(tube => []);
      const frozenTubes = level.frozenTubes || [];
      const oneColorInTubes = level.oneColorInTubes || [];
      
      // First, preserve frozen tube contents and one-color restrictions
      tubes.forEach((tube, tubeIndex) => {
        if (frozenTubes.includes(tubeIndex)) {
          // Keep frozen tube as is
          newTubes[tubeIndex] = [...tube];
          // Remove these colors from target distribution
          tube.forEach(color => {
            const index = targetColors.indexOf(color);
            if (index !== -1) {
              targetColors.splice(index, 1);
            }
          });
        }
      });
      
      // Handle one-color tubes
      oneColorInTubes.forEach(({ tubeIndex, color }) => {
        if (!frozenTubes.includes(tubeIndex)) {
          // Fill one-color tube with its required color up to current length
          const currentLength = tubes[tubeIndex].length;
          newTubes[tubeIndex] = Array(currentLength).fill(color);
          // Remove these colors from target distribution
          for (let i = 0; i < currentLength; i++) {
            const index = targetColors.indexOf(color);
            if (index !== -1) {
              targetColors.splice(index, 1);
            }
          }
        }
      });
      
      // Distribute remaining colors to non-frozen, non-one-color tubes
      let colorIndex = 0;
      tubes.forEach((tube, tubeIndex) => {
        if (!frozenTubes.includes(tubeIndex) && 
            !oneColorInTubes.find(r => r.tubeIndex === tubeIndex)) {
          // Fill this tube with remaining colors
          const tubeLength = tube.length;
          for (let i = 0; i < tubeLength && colorIndex < targetColors.length; i++) {
            newTubes[tubeIndex].push(targetColors[colorIndex++]);
          }
        }
      });
      
      // Update the level
      level.tubes = newTubes;
      
      // Verify the fix
      const newColorCounts = {};
      newTubes.forEach(tube => {
        tube.forEach(color => {
          newColorCounts[color] = (newColorCounts[color] || 0) + 1;
        });
      });
      
      const stillProblematic = Object.keys(newColorCounts).filter(
        color => newColorCounts[color] !== tubeSize
      );
      
      if (stillProblematic.length === 0) {
        console.log(`   ✅ Fixed! All colors now appear exactly ${tubeSize} times`);
        issuesFixed++;
      } else {
        console.log(`   ⚠️  Partial fix - some constraints prevent perfect distribution`);
      }
    } else {
      console.log(`   ⚠️  Cannot fix - total segment count mismatch (${totalSegments} vs ${expectedTotal})`);
    }
    console.log('');
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Issues found: ${issuesFound}`);
console.log(`   Issues fixed: ${issuesFixed}`);
console.log(`   Remaining issues: ${issuesFound - issuesFixed}`);

if (issuesFixed > 0) {
  // Backup current file
  const backupName = `src/levels.json.backup-color-fix-${Date.now()}`;
  fs.writeFileSync(backupName, fs.readFileSync('src/levels.json', 'utf8'));
  console.log(`   Backup created: ${backupName}`);
  
  // Write fixed levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levels, null, 2));
  console.log(`   ✅ Fixed levels saved to src/levels.json`);
} else {
  console.log(`   No changes needed.`);
} 