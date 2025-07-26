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

// Conservative fix that only adjusts problematic colors
function fixColorDistributionConservative(level, levelIndex) {
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
  
  // Find colors that need more or less
  const needMore = [];
  const needLess = [];
  
  targetColors.forEach(color => {
    const currentCount = currentCounts[color] || 0;
    if (currentCount < expectedPerColor) {
      needMore.push({ color, deficit: expectedPerColor - currentCount });
    } else if (currentCount > expectedPerColor) {
      needLess.push({ color, excess: currentCount - expectedPerColor });
    }
  });
  
  if (needMore.length === 0 && needLess.length === 0) {
    console.log(`  ✅ Already perfect!`);
    return true;
  }
  
  console.log(`  Need more: ${needMore.map(n => `${n.color}(${n.deficit})`).join(', ')}`);
  console.log(`  Need less: ${needLess.map(n => `${n.color}(${n.excess})`).join(', ')}`);
  
  // Create a copy of tubes to work with
  const newTubes = level.tubes.map(tube => [...tube]);
  
  // Strategy: Find tubes that can be modified (not frozen, not one-color restricted)
  const modifiableTubes = [];
  for (let i = 0; i < newTubes.length; i++) {
    const isFrozen = frozenTubes.includes(i);
    const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === i);
    
    if (!isFrozen && !oneColorRestriction) {
      modifiableTubes.push(i);
    }
  }
  
  if (modifiableTubes.length === 0) {
    console.log(`  ⚠️  No modifiable tubes available`);
    return false;
  }
  
  // Try to balance colors by swapping excess colors with deficit colors
  let changesMade = 0;
  const maxAttempts = 100;
  let attempts = 0;
  
  while ((needMore.length > 0 || needLess.length > 0) && attempts < maxAttempts) {
    attempts++;
    
    // Find a tube with excess color
    let excessTube = null;
    let excessColor = null;
    let excessIndex = -1;
    
    for (const tubeIndex of modifiableTubes) {
      const tube = newTubes[tubeIndex];
      for (let i = 0; i < tube.length; i++) {
        const color = tube[i];
        const needLessEntry = needLess.find(n => n.color === color);
        if (needLessEntry && needLessEntry.excess > 0) {
          excessTube = tubeIndex;
          excessColor = color;
          excessIndex = i;
          break;
        }
      }
      if (excessTube !== null) break;
    }
    
    if (excessTube === null) break;
    
    // Find a tube that needs this color or can accept a deficit color
    let targetTube = null;
    let targetColor = null;
    
    for (const tubeIndex of modifiableTubes) {
      if (tubeIndex === excessTube) continue;
      
      const tube = newTubes[tubeIndex];
      
      // Check if this tube needs the excess color
      const needMoreEntry = needMore.find(n => n.color === excessColor);
      if (needMoreEntry && needMoreEntry.deficit > 0) {
        targetTube = tubeIndex;
        targetColor = excessColor;
        break;
      }
      
      // Check if this tube has a deficit color we can swap
      for (let i = 0; i < tube.length; i++) {
        const color = tube[i];
        const needMoreEntry = needMore.find(n => n.color === color);
        if (needMoreEntry && needMoreEntry.deficit > 0) {
          targetTube = tubeIndex;
          targetColor = color;
          break;
        }
      }
      if (targetTube !== null) break;
    }
    
    if (targetTube === null) break;
    
    // Perform the swap
    if (targetColor === excessColor) {
      // Simple transfer: move excess color to tube that needs it
      newTubes[targetTube].push(excessColor);
      newTubes[excessTube].splice(excessIndex, 1);
      
      // Update counts
      const needLessEntry = needLess.find(n => n.color === excessColor);
      const needMoreEntry = needMore.find(n => n.color === excessColor);
      
      if (needLessEntry) needLessEntry.excess--;
      if (needMoreEntry) needMoreEntry.deficit--;
      
      // Remove entries if they're now balanced
      if (needLessEntry && needLessEntry.excess === 0) {
        needLess.splice(needLess.indexOf(needLessEntry), 1);
      }
      if (needMoreEntry && needMoreEntry.deficit === 0) {
        needMore.splice(needMore.indexOf(needMoreEntry), 1);
      }
      
      changesMade++;
    } else {
      // Swap: exchange excess color with deficit color
      const targetIndex = newTubes[targetTube].indexOf(targetColor);
      if (targetIndex !== -1) {
        newTubes[excessTube][excessIndex] = targetColor;
        newTubes[targetTube][targetIndex] = excessColor;
        
        // Update counts
        const excessNeedLess = needLess.find(n => n.color === excessColor);
        const excessNeedMore = needMore.find(n => n.color === excessColor);
        const targetNeedLess = needLess.find(n => n.color === targetColor);
        const targetNeedMore = needMore.find(n => n.color === targetColor);
        
        if (excessNeedLess) excessNeedLess.excess--;
        if (excessNeedMore) excessNeedMore.deficit--;
        if (targetNeedLess) targetNeedLess.excess--;
        if (targetNeedMore) targetNeedMore.deficit--;
        
        // Remove entries if they're now balanced
        if (excessNeedLess && excessNeedLess.excess === 0) {
          needLess.splice(needLess.indexOf(excessNeedLess), 1);
        }
        if (excessNeedMore && excessNeedMore.deficit === 0) {
          needMore.splice(needMore.indexOf(excessNeedMore), 1);
        }
        if (targetNeedLess && targetNeedLess.excess === 0) {
          needLess.splice(needLess.indexOf(targetNeedLess), 1);
        }
        if (targetNeedMore && targetNeedMore.deficit === 0) {
          needMore.splice(needMore.indexOf(targetNeedMore), 1);
        }
        
        changesMade++;
      }
    }
  }
  
  // Update the level
  level.tubes = newTubes;
  
  // Verify the fix
  const newCounts = countColors(level);
  console.log(`  After fix: ${JSON.stringify(newCounts)}`);
  console.log(`  Changes made: ${changesMade}`);
  
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
console.log('Fixing frozen tube color distribution issues (conservative approach)...');

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
    
    if (fixColorDistributionConservative(level, levelIndex)) {
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