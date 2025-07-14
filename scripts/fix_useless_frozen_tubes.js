const fs = require('fs');

// Load the current levels
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Fixing useless frozen tubes...\n');

// Helper function to check if a tube is full
function isTubeFull(tube, tubeSize) {
  return tube.length === tubeSize;
}

// Helper function to check if a tube has only one color
function hasOnlyOneColor(tube) {
  if (tube.length === 0) return true;
  const firstColor = tube[0];
  return tube.every(color => color === firstColor);
}

let totalFixed = 0;
let totalFrozenTubes = 0;

// Process each level
levelsData.forEach((level, levelIndex) => {
  if (!level.frozenTubes || level.frozenTubes.length === 0) {
    return; // Skip levels without frozen tubes
  }
  
  console.log(`Checking Level ${levelIndex + 1}...`);
  
  level.frozenTubes.forEach(frozenTubeIndex => {
    totalFrozenTubes++;
    const tube = level.tubes[frozenTubeIndex];
    
    // Check if this frozen tube is useless (full with single color)
    if (isTubeFull(tube, level.tubeSize) && hasOnlyOneColor(tube) && tube.length > 0) {
      console.log(`  🔧 Frozen tube ${frozenTubeIndex + 1} is useless (full with ${tube[0]})`);
      
      // Strategy: Make it partially filled so it can accept more of the same color
      // Remove 1-3 balls to create space
      const ballsToRemove = Math.min(3, Math.floor(Math.random() * 3) + 1);
      const originalLength = tube.length;
      
      // Remove balls from the top
      for (let i = 0; i < ballsToRemove; i++) {
        tube.pop();
      }
      
      console.log(`    ✅ Removed ${ballsToRemove} balls (${originalLength} -> ${tube.length})`);
      console.log(`    💡 Now players can pour ${tube[0]} into this frozen tube`);
      totalFixed++;
    }
  });
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total frozen tubes checked: ${totalFrozenTubes}`);
console.log(`Useless frozen tubes fixed: ${totalFixed}`);

if (totalFixed > 0) {
  // Create backup
  const backupFile = `src/levels.json.backup-frozen-fix-${Date.now()}`;
  fs.writeFileSync(backupFile, JSON.stringify(levelsData, null, 2));
  
  // Save the fixed levels
  fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));
  
  console.log(`\n💾 Backup saved as: ${backupFile}`);
  console.log(`✅ Fixed levels saved!`);
  console.log(`\nNow frozen tubes serve a purpose:`);
  console.log(`- Players can pour matching colors INTO partially filled frozen tubes`);
  console.log(`- Players still cannot pour OUT of frozen tubes`);
  console.log(`- This creates strategic decisions about tube management`);
} else {
  console.log(`\n✅ No useless frozen tubes found!`);
} 