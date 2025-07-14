const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Load levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Test specific levels with special tubes
console.log('🧪 Testing Special Tube Levels...\n');

// Test level 21 (first frozen tube)
console.log('Level 21 (First frozen tube):');
const level21 = levels[20];
console.log(`  Frozen tubes: ${level21.frozenTubes}`);
console.log(`  One-color tubes: ${level21.oneColorInTubes.length}`);
console.log(`  Colors: ${level21.colors}, Size: ${level21.tubeSize}`);
console.log(`  Expected moves: ${level21.actualMoves}`);

// Test level 27 (first one-color tube)
console.log('\nLevel 27 (First one-color tube):');
const level27 = levels[26];
console.log(`  Frozen tubes: ${level27.frozenTubes.length}`);
console.log(`  One-color tubes: ${JSON.stringify(level27.oneColorInTubes)}`);
console.log(`  Colors: ${level27.colors}, Size: ${level27.tubeSize}`);
console.log(`  Expected moves: ${level27.actualMoves}`);

// Test level 50 (most complex)
console.log('\nLevel 50 (Most complex):');
const level50 = levels[49];
console.log(`  Frozen tubes: ${level50.frozenTubes.length}`);
console.log(`  One-color tubes: ${level50.oneColorInTubes.length}`);
console.log(`  Colors: ${level50.colors}, Size: ${level50.tubeSize}`);
console.log(`  Expected moves: ${level50.actualMoves}`);

// Count levels by type
let normalLevels = 0;
let frozenOnlyLevels = 0;
let oneColorOnlyLevels = 0;
let bothTypesLevels = 0;

levels.forEach(level => {
  const hasFrozen = level.frozenTubes && level.frozenTubes.length > 0;
  const hasOneColor = level.oneColorInTubes && level.oneColorInTubes.length > 0;
  
  if (hasFrozen && hasOneColor) {
    bothTypesLevels++;
  } else if (hasFrozen) {
    frozenOnlyLevels++;
  } else if (hasOneColor) {
    oneColorOnlyLevels++;
  } else {
    normalLevels++;
  }
});

console.log('\n📊 Level Distribution:');
console.log(`  Normal levels: ${normalLevels}`);
console.log(`  Frozen tubes only: ${frozenOnlyLevels}`);
console.log(`  One-color tubes only: ${oneColorOnlyLevels}`);
console.log(`  Both types: ${bothTypesLevels}`);
console.log(`  Total: ${normalLevels + frozenOnlyLevels + oneColorOnlyLevels + bothTypesLevels}`);

console.log('\n✅ Special tube analysis complete!'); 