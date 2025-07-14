const fs = require('fs');

// Load the levels data
const levelsData = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

// New victory condition function
function isSolved(tubes, tubeSize) {
  // Check if all tubes contain only one color (or are empty)
  const allSingleColor = tubes.every(tube => 
    tube.length === 0 || tube.every(color => color === tube[0])
  );
  
  if (!allSingleColor) {
    return false;
  }
  
  // Additional check: ensure no more useful moves are possible
  // This handles cases where tubes aren't completely full but all liquid is properly sorted
  
  // Count colors in each tube
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if any color can be consolidated further
  for (const color in colorCounts) {
    const totalCount = colorCounts[color];
    
    // Find tubes containing this color
    const tubesWithColor = tubes.filter(tube => tube.length > 0 && tube[0] === color);
    
    if (tubesWithColor.length > 1) {
      // Multiple tubes have this color - check if they can be consolidated
      const canConsolidate = tubesWithColor.some(tube => tube.length < tubeSize);
      if (canConsolidate) {
        // There's still room to consolidate this color
        return false;
      }
    }
  }
  
  return true;
}

// Old victory condition function
function isOldSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

console.log('🧪 Testing Victory Condition Logic...\n');

// Test case 1: Level 29 scenario (from screenshot)
console.log('Test 1: Level 29 scenario (partially filled but sorted)');
const level29Solved = [
  ["#64b5f6", "#64b5f6", "#64b5f6", "#64b5f6", "#64b5f6", "#64b5f6"], // Blue tube - full
  ["#e57373", "#e57373", "#e57373"], // Red tube - partial
  ["#81c784", "#81c784", "#81c784", "#81c784", "#81c784"], // Green tube - partial  
  ["#4db6ac", "#4db6ac", "#4db6ac"], // Teal tube - partial
  [], // Empty tube
  ["#ffd54f", "#ffd54f", "#ffd54f", "#ffd54f", "#ffd54f"], // Yellow tube - partial
  [], // Empty tube
  ["#ba68c8", "#ba68c8", "#ba68c8", "#ba68c8", "#ba68c8"] // Purple tube - partial
];

const tubeSize = 6;
const newResult = isSolved(level29Solved, tubeSize);
const oldResult = isOldSolved(level29Solved, tubeSize);

console.log(`  New logic: ${newResult ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Old logic: ${oldResult ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Expected: ✅ SOLVED (all colors are properly sorted)\n`);

// Test case 2: Mixed colors (should NOT be solved)
console.log('Test 2: Mixed colors (should NOT be solved)');
const mixedColors = [
  ["#64b5f6", "#e57373", "#64b5f6"], // Mixed colors
  ["#e57373", "#e57373"], 
  [], 
  []
];

const newResult2 = isSolved(mixedColors, 4);
const oldResult2 = isOldSolved(mixedColors, 4);

console.log(`  New logic: ${newResult2 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Old logic: ${oldResult2 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Expected: ❌ NOT SOLVED (has mixed colors)\n`);

// Test case 3: Can still consolidate (should NOT be solved)
console.log('Test 3: Can still consolidate (should NOT be solved)');
const canConsolidate = [
  ["#64b5f6", "#64b5f6"], // Blue - partial
  ["#64b5f6"], // Blue - partial (can be consolidated)
  ["#e57373", "#e57373"], 
  []
];

const newResult3 = isSolved(canConsolidate, 4);
const oldResult3 = isOldSolved(canConsolidate, 4);

console.log(`  New logic: ${newResult3 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Old logic: ${oldResult3 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Expected: ❌ NOT SOLVED (blue can be consolidated)\n`);

// Test case 4: Perfect solution (should be solved)
console.log('Test 4: Perfect solution (should be solved)');
const perfectSolution = [
  ["#64b5f6", "#64b5f6", "#64b5f6", "#64b5f6"], // Blue - full
  ["#e57373", "#e57373", "#e57373", "#e57373"], // Red - full
  [], 
  []
];

const newResult4 = isSolved(perfectSolution, 4);
const oldResult4 = isOldSolved(perfectSolution, 4);

console.log(`  New logic: ${newResult4 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Old logic: ${oldResult4 ? '✅ SOLVED' : '❌ NOT SOLVED'}`);
console.log(`  Expected: ✅ SOLVED (perfect solution)\n`);

console.log('=== SUMMARY ===');
console.log('The new victory condition should:');
console.log('1. ✅ Allow partial tubes if all liquid is properly sorted');
console.log('2. ❌ Reject mixed colors in any tube');
console.log('3. ❌ Reject if colors can still be consolidated');
console.log('4. ✅ Accept perfect solutions'); 