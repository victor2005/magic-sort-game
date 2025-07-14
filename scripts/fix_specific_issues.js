const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');
const BACKUP_PATH = path.join(__dirname, '../src/levels.json.backup-specific');

// Load existing levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Backup existing levels
fs.copyFileSync(LEVELS_PATH, BACKUP_PATH);
console.log('✅ Backed up existing levels\n');

// Count colors in a level
function countColors(level) {
  const counts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      counts[color] = (counts[color] || 0) + 1;
    });
  });
  return counts;
}

// Check if a tube has mixed colors
function hasMixedColors(tube) {
  if (tube.length <= 1) return false;
  const firstColor = tube[0];
  return tube.some(color => color !== firstColor);
}

let issuesFixed = 0;

levels.forEach((level, levelIndex) => {
  const issues = [];
  
  // Check 1: Color balance
  const colorCounts = countColors(level);
  const expectedPerColor = level.tubeSize;
  const colorBalanceIssues = [];
  
  Object.keys(colorCounts).forEach(color => {
    if (colorCounts[color] !== expectedPerColor) {
      colorBalanceIssues.push(`${color}: ${colorCounts[color]} (expected ${expectedPerColor})`);
    }
  });
  
  if (colorBalanceIssues.length > 0) {
    issues.push(`Color balance issues: ${colorBalanceIssues.join(', ')}`);
  }
  
  // Check 2: Frozen tubes with mixed colors
  const frozenTubes = level.frozenTubes || [];
  const frozenIssues = [];
  
  frozenTubes.forEach(frozenIndex => {
    if (frozenIndex < level.tubes.length) {
      const tube = level.tubes[frozenIndex];
      if (tube.length > 0 && hasMixedColors(tube)) {
        frozenIssues.push(`Frozen tube ${frozenIndex} has mixed colors`);
      }
    }
  });
  
  if (frozenIssues.length > 0) {
    issues.push(`Frozen tube issues: ${frozenIssues.join(', ')}`);
  }
  
  // Check 3: One-color tubes that are already complete
  const oneColorInTubes = level.oneColorInTubes || [];
  const oneColorIssues = [];
  
  oneColorInTubes.forEach(restriction => {
    if (restriction.tubeIndex < level.tubes.length) {
      const tube = level.tubes[restriction.tubeIndex];
      if (tube.length === level.tubeSize && tube.every(color => color === restriction.color)) {
        oneColorIssues.push(`One-color tube ${restriction.tubeIndex} is already complete`);
      }
    }
  });
  
  if (oneColorIssues.length > 0) {
    issues.push(`One-color tube issues: ${oneColorIssues.join(', ')}`);
  }
  
  // Report and fix issues
  if (issues.length > 0) {
    console.log(`\n❌ Level ${levelIndex + 1} has issues:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
    
    // Fix 1: Color balance issues - remove excess segments
    if (colorBalanceIssues.length > 0) {
      Object.keys(colorCounts).forEach(color => {
        const currentCount = colorCounts[color];
        if (currentCount > expectedPerColor) {
          const excess = currentCount - expectedPerColor;
          let removed = 0;
          
          // Remove excess segments from non-frozen tubes
          for (let tubeIndex = 0; tubeIndex < level.tubes.length && removed < excess; tubeIndex++) {
            if (!frozenTubes.includes(tubeIndex)) {
              const tube = level.tubes[tubeIndex];
              for (let segmentIndex = tube.length - 1; segmentIndex >= 0 && removed < excess; segmentIndex--) {
                if (tube[segmentIndex] === color) {
                  tube.splice(segmentIndex, 1);
                  removed++;
                }
              }
            }
          }
          console.log(`   ✅ Removed ${removed} excess ${color} segments`);
        }
      });
    }
    
    // Fix 2: Frozen tubes with mixed colors - make them single color
    frozenTubes.forEach(frozenIndex => {
      if (frozenIndex < level.tubes.length) {
        const tube = level.tubes[frozenIndex];
        if (tube.length > 0 && hasMixedColors(tube)) {
          const firstColor = tube[0];
          // Keep only the first color, remove others
          for (let i = tube.length - 1; i >= 0; i--) {
            if (tube[i] !== firstColor) {
              tube.splice(i, 1);
            }
          }
          console.log(`   ✅ Fixed frozen tube ${frozenIndex} to single color: ${firstColor}`);
        }
      }
    });
    
    // Fix 3: One-color tubes that are already complete - remove some segments
    oneColorInTubes.forEach(restriction => {
      if (restriction.tubeIndex < level.tubes.length) {
        const tube = level.tubes[restriction.tubeIndex];
        if (tube.length === level.tubeSize && tube.every(color => color === restriction.color)) {
          // Remove 1-3 segments to make it not complete
          const removeCount = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < removeCount && tube.length > 0; i++) {
            tube.pop();
          }
          console.log(`   ✅ Removed ${removeCount} segments from complete one-color tube ${restriction.tubeIndex}`);
        }
      }
    });
    
    issuesFixed++;
  } else {
    console.log(`✅ Level ${levelIndex + 1}: No issues found`);
  }
});

// Save fixed levels
fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));

console.log('\n=== FIX COMPLETE ===');
console.log(`✅ Fixed ${issuesFixed} levels with issues`);
console.log('✅ Color balance: Removed excess segments');
console.log('✅ Frozen tubes: Made single-color only');
console.log('✅ One-color tubes: Removed segments from complete ones');
console.log(`✅ Fixed levels saved to ${LEVELS_PATH}`);
console.log(`✅ Backup saved to ${BACKUP_PATH}`); 