const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Load levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

console.log('=== COMPREHENSIVE LEVEL VERIFICATION ===\n');

let totalIssues = 0;
let perfectLevels = 0;

levels.forEach((level, index) => {
  const levelNumber = index + 1;
  let issues = [];
  
  // Count color segments
  const colorCounts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check 1: Color balance
  const usedColors = Object.keys(colorCounts);
  if (usedColors.length !== level.colors) {
    issues.push(`Expected ${level.colors} colors, found ${usedColors.length}`);
  }
  
  for (const color of usedColors) {
    if (colorCounts[color] !== level.tubeSize) {
      issues.push(`Color ${color}: ${colorCounts[color]} segments (expected ${level.tubeSize})`);
    }
  }
  
  // Check 2: Frozen tubes
  if (level.frozenTubes) {
    level.frozenTubes.forEach(frozenIndex => {
      if (frozenIndex < level.tubes.length) {
        const tube = level.tubes[frozenIndex];
        if (tube.length === 0) {
          // Empty frozen tube is valid
        } else {
          // Check if all segments are the same color
          const firstColor = tube[0];
          const allSame = tube.every(segment => segment === firstColor);
          if (!allSame) {
            issues.push(`Frozen tube ${frozenIndex} has mixed colors`);
          }
          
          // Check if frozen tube has correct length
          if (tube.length !== level.tubeSize) {
            issues.push(`Frozen tube ${frozenIndex} has ${tube.length} segments (expected ${level.tubeSize})`);
          }
        }
      } else {
        issues.push(`Frozen tube index ${frozenIndex} is out of bounds (only ${level.tubes.length} tubes)`);
      }
    });
  }
  
  // Check 3: One-color tubes
  if (level.oneColorInTubes) {
    level.oneColorInTubes.forEach(restriction => {
      if (restriction.tubeIndex < level.tubes.length) {
        const tube = level.tubes[restriction.tubeIndex];
        if (tube.length > 0) {
          const hasWrongColor = tube.some(color => color !== restriction.color);
          if (hasWrongColor) {
            issues.push(`One-color tube ${restriction.tubeIndex} contains wrong colors`);
          }
        }
      } else {
        issues.push(`One-color tube index ${restriction.tubeIndex} is out of bounds (only ${level.tubes.length} tubes)`);
      }
    });
  }
  
  // Check 4: Basic structure - frozenTubes are indices, not additional tubes
  // For levels with one-color tubes, we need to account for the additional tubes they create
  const oneColorTubeCount = level.oneColorInTubes ? level.oneColorInTubes.length : 0;
  const expectedTubeCount = level.colors + level.emptyTubes + oneColorTubeCount;
  
  if (level.tubes.length !== expectedTubeCount) {
    issues.push(`Tube count mismatch: expected ${expectedTubeCount}, got ${level.tubes.length}`);
  }
  
  // Check 5: Empty tubes
  const emptyTubes = level.tubes.filter(tube => tube.length === 0).length;
  if (emptyTubes < level.emptyTubes) {
    issues.push(`Not enough empty tubes: ${emptyTubes} (expected at least ${level.emptyTubes})`);
  }
  
  // Report results
  if (issues.length > 0) {
    console.log(`❌ Level ${levelNumber}:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
    totalIssues += issues.length;
  } else {
    console.log(`✅ Level ${levelNumber}: Perfect`);
    perfectLevels++;
  }
});

console.log('\n=== SUMMARY ===');
console.log(`Total levels: ${levels.length}`);
console.log(`Perfect levels: ${perfectLevels}`);
console.log(`Levels with issues: ${levels.length - perfectLevels}`);
console.log(`Total issues: ${totalIssues}`);

if (totalIssues === 0) {
  console.log('\n🎉 ALL LEVELS ARE PERFECT! 🎉');
} else {
  console.log('\n⚠️  Some levels still have issues that need fixing.');
}

// Check difficulty progression
console.log('\n=== DIFFICULTY PROGRESSION ===');
let prevColors = 0;
let prevTubeSize = 0;
let prevFrozenCount = 0;
let prevOneColorCount = 0;

levels.forEach((level, index) => {
  const levelNumber = index + 1;
  const frozenCount = level.frozenTubes?.length || 0;
  const oneColorCount = level.oneColorInTubes?.length || 0;
  
  // Check if difficulty is increasing appropriately
  if (levelNumber > 1) {
    const colorIncrease = level.colors >= prevColors;
    const sizeIncrease = level.tubeSize >= prevTubeSize;
    const specialIncrease = (frozenCount + oneColorCount) >= (prevFrozenCount + prevOneColorCount);
    
    if (levelNumber <= 28) {
      // Early levels should have gradual progression
      if (level.colors > prevColors + 1 || level.tubeSize > prevTubeSize + 1) {
        console.log(`⚠️  Level ${levelNumber}: Difficulty jump too steep`);
      }
    }
  }
  
  prevColors = level.colors;
  prevTubeSize = level.tubeSize;
  prevFrozenCount = frozenCount;
  prevOneColorCount = oneColorCount;
});

console.log(`Colors range: ${Math.min(...levels.map(l => l.colors))} - ${Math.max(...levels.map(l => l.colors))}`);
console.log(`Tube sizes range: ${Math.min(...levels.map(l => l.tubeSize))} - ${Math.max(...levels.map(l => l.tubeSize))}`);
console.log(`Frozen tubes: ${levels.filter(l => l.frozenTubes?.length > 0).length} levels have frozen tubes`);
console.log(`One-color tubes: ${levels.filter(l => l.oneColorInTubes && l.oneColorInTubes.length > 0).length} levels have one-color tubes`);

console.log('\n=== VERIFICATION COMPLETE ==='); 