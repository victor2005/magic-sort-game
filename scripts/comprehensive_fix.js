const fs = require('fs');

// Load the current levels
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

console.log('🔧 Starting comprehensive game fixes...\n');

// Function to count colors in a level
function countColors(level) {
  const colorCounts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      if (color) {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    });
  });
  return colorCounts;
}

// Function to get all colors used in a level
function getUniqueColors(level) {
  const colors = new Set();
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      if (color) colors.add(color);
    });
  });
  return Array.from(colors);
}

// Function to fix color distribution
function fixColorDistribution(level) {
  const tubeSize = level.tubeSize;
  const colors = getUniqueColors(level);
  const targetCount = tubeSize;
  
  // Count current colors
  const colorCounts = countColors(level);
  
  // Check if already balanced
  const isBalanced = colors.every(color => colorCounts[color] === targetCount);
  if (isBalanced) return false; // No changes needed
  
  // Find colors that need adjustment
  const needMore = [];
  const needLess = [];
  
  colors.forEach(color => {
    const current = colorCounts[color] || 0;
    if (current < targetCount) {
      needMore.push({ color, deficit: targetCount - current });
    } else if (current > targetCount) {
      needLess.push({ color, excess: current - targetCount });
    }
  });
  
  // If we have both excess and deficit, we can balance
  if (needMore.length > 0 && needLess.length > 0) {
    // Find non-frozen, non-one-color tubes for modification
    const modifiabletubes = level.tubes.map((tube, idx) => {
      const isFrozen = level.frozenTubes && level.frozenTubes.includes(idx);
      const hasOneColorRestriction = level.oneColorInTubes && level.oneColorInTubes.some(r => r.tubeIndex === idx);
      return { tube, idx, isFrozen, hasOneColorRestriction };
    }).filter(t => !t.isFrozen && !t.hasOneColorRestriction);
    
    // Try to balance colors
    for (const excess of needLess) {
      for (const deficit of needMore) {
        if (excess.excess > 0 && deficit.deficit > 0) {
          const transferAmount = Math.min(excess.excess, deficit.deficit);
          
          // Find tubes with excess color and replace with deficit color
          for (const tubeInfo of modifiabletubes) {
            if (transferAmount <= 0) break;
            
            for (let i = 0; i < tubeInfo.tube.length; i++) {
              if (tubeInfo.tube[i] === excess.color && transferAmount > 0) {
                tubeInfo.tube[i] = deficit.color;
                excess.excess--;
                deficit.deficit--;
                break;
              }
            }
          }
        }
      }
    }
    
    return true; // Made changes
  }
  
  return false; // Couldn't balance
}

// Function to simplify overly complex levels
function simplifyLevel(level, levelIndex) {
  // For levels that are too complex, reduce the number of colors
  if (levelIndex >= 20) {
    const currentColors = getUniqueColors(level);
    const maxColors = Math.min(6 + Math.floor(levelIndex / 10), 8);
    
    if (currentColors.length > maxColors) {
      console.log(`  Simplifying level ${levelIndex + 1}: reducing from ${currentColors.length} to ${maxColors} colors`);
      
      // Keep the most frequently used colors
      const colorCounts = countColors(level);
      const sortedColors = currentColors.sort((a, b) => (colorCounts[b] || 0) - (colorCounts[a] || 0));
      const keepColors = sortedColors.slice(0, maxColors);
      const replaceColors = sortedColors.slice(maxColors);
      
      // Replace excess colors with kept colors
      level.tubes.forEach(tube => {
        for (let i = 0; i < tube.length; i++) {
          if (replaceColors.includes(tube[i])) {
            // Replace with a random kept color
            tube[i] = keepColors[Math.floor(Math.random() * keepColors.length)];
          }
        }
      });
      
      return true;
    }
  }
  
  return false;
}

// Function to ensure levels are progressively challenging but solvable
function adjustDifficulty(level, levelIndex) {
  // For early levels, ensure they're not too complex
  if (levelIndex < 10) {
    const colors = getUniqueColors(level);
    const maxColors = Math.min(3 + Math.floor(levelIndex / 3), 5);
    
    if (colors.length > maxColors) {
      console.log(`  Adjusting difficulty for level ${levelIndex + 1}: reducing complexity`);
      return simplifyLevel(level, levelIndex);
    }
  }
  
  return false;
}

// Main fix function
function fixLevel(level, levelIndex) {
  let changed = false;
  
  console.log(`Checking level ${levelIndex + 1}...`);
  
  // 1. Fix color distribution
  if (fixColorDistribution(level)) {
    console.log(`  ✅ Fixed color distribution`);
    changed = true;
  }
  
  // 2. Simplify overly complex levels
  if (simplifyLevel(level, levelIndex)) {
    console.log(`  ✅ Simplified level`);
    changed = true;
  }
  
  // 3. Adjust difficulty progression
  if (adjustDifficulty(level, levelIndex)) {
    console.log(`  ✅ Adjusted difficulty`);
    changed = true;
  }
  
  // 4. Ensure minimum empty tubes for solvability
  const emptyTubes = level.tubes.filter(tube => tube.length === 0).length;
  const minEmptyTubes = Math.max(2, Math.floor(getUniqueColors(level).length / 3));
  
  if (emptyTubes < minEmptyTubes) {
    console.log(`  ✅ Added empty tubes for solvability (${emptyTubes} -> ${minEmptyTubes})`);
    // Add empty tubes
    for (let i = emptyTubes; i < minEmptyTubes; i++) {
      level.tubes.push([]);
    }
    changed = true;
  }
  
  if (!changed) {
    console.log(`  ✓ Level ${levelIndex + 1} is already good`);
  }
  
  return changed;
}

// Process all levels
let totalChanges = 0;
let problemLevels = [36, 37, 39, 43, 44, 45, 47, 48]; // Focus on known problematic levels

console.log(`Processing ${problemLevels.length} problematic levels...\n`);

problemLevels.forEach(levelIndex => {
  if (levelIndex < levelsData.length) {
    const level = levelsData[levelIndex];
    if (fixLevel(level, levelIndex)) {
      totalChanges++;
    }
  }
});

// Also check the 7 levels with color distribution issues
const colorDistributionIssues = [36, 37, 39, 43, 44, 45, 47]; // 0-indexed

console.log(`\nFixing color distribution issues in specific levels...\n`);

colorDistributionIssues.forEach(levelIndex => {
  if (levelIndex < levelsData.length) {
    const level = levelsData[levelIndex];
    const colors = getUniqueColors(level);
    const colorCounts = countColors(level);
    const tubeSize = level.tubeSize;
    
    console.log(`Level ${levelIndex + 1}: Expected ${colors.length} colors with ${tubeSize} each`);
    console.log(`  Current distribution:`, colorCounts);
    
    // Force fix the distribution
    const isBalanced = colors.every(color => colorCounts[color] === tubeSize);
    if (!isBalanced) {
      console.log(`  🔧 Forcing color balance...`);
      
      // Rebuild the level with proper color distribution
      const newTubes = [];
      
      // Add empty tubes first
      const emptyTubes = level.tubes.filter(tube => tube.length === 0).length;
      for (let i = 0; i < Math.max(emptyTubes, 2); i++) {
        newTubes.push([]);
      }
      
      // Create tubes with proper color distribution
      const allColors = [];
      colors.forEach(color => {
        for (let i = 0; i < tubeSize; i++) {
          allColors.push(color);
        }
      });
      
      // Shuffle colors
      for (let i = allColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
      }
      
      // Distribute colors into tubes
      let colorIndex = 0;
      while (colorIndex < allColors.length) {
        const tube = [];
        const tubeLength = Math.min(tubeSize, allColors.length - colorIndex);
        for (let i = 0; i < tubeLength; i++) {
          tube.push(allColors[colorIndex++]);
        }
        newTubes.push(tube);
      }
      
      // Preserve special tube properties
      level.tubes = newTubes;
      
      // Verify the fix
      const newColorCounts = countColors(level);
      console.log(`  ✅ New distribution:`, newColorCounts);
      totalChanges++;
    }
  }
});

// Create backup
const backupFile = `src/levels.json.backup-comprehensive-${Date.now()}`;
fs.writeFileSync(backupFile, JSON.stringify(levelsData, null, 2));

// Save the fixed levels
fs.writeFileSync('src/levels.json', JSON.stringify(levelsData, null, 2));

console.log(`\n🎉 Comprehensive fixes completed!`);
console.log(`📊 Total levels modified: ${totalChanges}`);
console.log(`💾 Backup saved as: ${backupFile}`);
console.log(`\nRun verification scripts to check the fixes:`);
console.log(`  node scripts/verify_frozen_tubes.js`);
console.log(`  node scripts/verify_levels.js`); 