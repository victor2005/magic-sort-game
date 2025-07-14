const fs = require('fs');
const path = require('path');

// Load the current levels
const levelsPath = path.join(__dirname, '..', 'src', 'levels.json');
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

console.log('Fixing frozen tube logic...');

let fixedCount = 0;
let totalFrozenTubes = 0;

// Helper function to check if a tube has only one color
function hasOnlyOneColor(tube) {
  if (tube.length === 0) return true;
  const firstColor = tube[0];
  return tube.every(color => color === firstColor);
}

// Helper function to make a tube single-color by keeping the most common color
function makeSingleColor(tube, tubeSize) {
  if (tube.length === 0) return [];
  
  // Count occurrences of each color
  const colorCounts = {};
  tube.forEach(color => {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
  
  // Find the most common color
  let mostCommonColor = tube[0];
  let maxCount = 0;
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonColor = color;
    }
  }
  
  // Fill the tube with the most common color, up to the original length
  return Array(tube.length).fill(mostCommonColor);
}

// Process each level
levels.forEach((level, levelIndex) => {
  if (!level.frozenTubes || level.frozenTubes.length === 0) {
    return; // Skip levels without frozen tubes
  }
  
  let levelFixed = false;
  
  level.frozenTubes.forEach(frozenTubeIndex => {
    totalFrozenTubes++;
    const tube = level.tubes[frozenTubeIndex];
    
    if (!hasOnlyOneColor(tube)) {
      console.log(`Level ${levelIndex + 1}: Fixing frozen tube ${frozenTubeIndex + 1}`);
      console.log(`  Before: [${tube.join(', ')}]`);
      
      // Fix the tube by making it single-color
      level.tubes[frozenTubeIndex] = makeSingleColor(tube, level.tubeSize);
      
      console.log(`  After:  [${level.tubes[frozenTubeIndex].join(', ')}]`);
      
      levelFixed = true;
    }
  });
  
  if (levelFixed) {
    fixedCount++;
  }
});

console.log(`\nSummary:`);
console.log(`- Total frozen tubes found: ${totalFrozenTubes}`);
console.log(`- Levels with frozen tubes fixed: ${fixedCount}`);

// Write the fixed levels back to the file
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`\nFixed levels saved to ${levelsPath}`); 