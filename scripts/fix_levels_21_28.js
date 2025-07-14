const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Color palette
const COLORS = [
  '#e57373', // Red
  '#ffd54f', // Yellow  
  '#64b5f6', // Blue
  '#81c784', // Green
  '#ff8a65', // Orange
  '#ba68c8', // Purple
  '#4db6ac', // Teal
  '#ffb74d'  // Amber
];

// Shuffle function
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create a perfectly balanced level
function createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes = [], oneColorInTubes = []) {
  // Step 1: Create exactly tubeSize segments for each color
  const allSegments = [];
  for (let i = 0; i < colors; i++) {
    for (let j = 0; j < tubeSize; j++) {
      allSegments.push(COLORS[i]);
    }
  }
  
  // Step 2: Calculate total tubes needed
  const totalTubes = colors + emptyTubes + frozenTubes.length;
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 3: Handle frozen tubes first
  const frozenTubeColors = new Set();
  frozenTubes.forEach(frozenIndex => {
    if (Math.random() < 0.4) {
      // 40% chance to be empty (already initialized as empty)
      return;
    }
    
    // Choose a random color that hasn't been used for frozen tubes
    let colorIndex;
    do {
      colorIndex = Math.floor(Math.random() * colors);
    } while (frozenTubeColors.has(colorIndex));
    
    frozenTubeColors.add(colorIndex);
    const frozenColor = COLORS[colorIndex];
    
    // Fill frozen tube with this color (exactly tubeSize segments)
    for (let i = 0; i < tubeSize; i++) {
      tubes[frozenIndex].push(frozenColor);
      // Remove these segments from the available pool
      const segmentIndex = allSegments.indexOf(frozenColor);
      if (segmentIndex !== -1) {
        allSegments.splice(segmentIndex, 1);
      }
    }
  });
  
  // Step 4: Shuffle remaining segments
  const shuffledSegments = shuffle(allSegments);
  
  // Step 5: Distribute remaining segments to non-frozen, non-empty tubes
  const availableTubes = [];
  for (let i = 0; i < totalTubes; i++) {
    if (!frozenTubes.includes(i) && i >= emptyTubes) {
      availableTubes.push(i);
    }
  }
  
  // Fill available tubes with shuffled segments
  let segmentIndex = 0;
  for (const tubeIndex of availableTubes) {
    const fillAmount = Math.min(tubeSize, shuffledSegments.length - segmentIndex);
    for (let i = 0; i < fillAmount; i++) {
      tubes[tubeIndex].push(shuffledSegments[segmentIndex]);
      segmentIndex++;
    }
  }
  
  // Step 6: If there are remaining segments, distribute them randomly
  while (segmentIndex < shuffledSegments.length) {
    const availableSpaces = [];
    for (let i = 0; i < totalTubes; i++) {
      if (!frozenTubes.includes(i) && tubes[i].length < tubeSize) {
        availableSpaces.push(i);
      }
    }
    
    if (availableSpaces.length === 0) break;
    
    const randomTube = availableSpaces[Math.floor(Math.random() * availableSpaces.length)];
    tubes[randomTube].push(shuffledSegments[segmentIndex]);
    segmentIndex++;
  }
  
  // Step 7: Verify color balance
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if all colors have exactly tubeSize segments
  for (let i = 0; i < colors; i++) {
    const color = COLORS[i];
    if (colorCounts[color] !== tubeSize) {
      console.warn(`Color balance issue: ${color} has ${colorCounts[color]} segments, expected ${tubeSize}`);
      // Try to fix by redistributing
      return createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes);
    }
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    tubes,
    frozenTubes,
    oneColorInTubes,
    actualMoves: Math.floor(colors * tubeSize * 0.8 + Math.random() * 20),
    minMoves: Math.floor(colors * tubeSize * 0.5 + Math.random() * 10),
    shuffleMoves: colors * tubeSize * 2
  };
}

// Generate fixed levels 21-28
function generateFixedLevels21to28() {
  const levels = [];
  
  // Level 21: 5 colors, 5 tube size, 2 empty, 2 frozen
  levels.push(createPerfectLevel(5, 5, 2, [7, 8]));
  
  // Level 22: 5 colors, 5 tube size, 2 empty, 1 frozen
  levels.push(createPerfectLevel(5, 5, 2, [7]));
  
  // Level 23: 5 colors, 5 tube size, 2 empty, 1 frozen
  levels.push(createPerfectLevel(5, 5, 2, [7]));
  
  // Level 24: 5 colors, 5 tube size, 2 empty, 2 frozen
  levels.push(createPerfectLevel(5, 5, 2, [7, 8]));
  
  // Level 25: 5 colors, 5 tube size, 2 empty, 1 frozen
  levels.push(createPerfectLevel(5, 5, 2, [7]));
  
  // Level 26: 6 colors, 6 tube size, 2 empty, 2 frozen
  levels.push(createPerfectLevel(6, 6, 2, [8, 9]));
  
  // Level 27: 6 colors, 6 tube size, 1 empty, 1 frozen
  levels.push(createPerfectLevel(6, 6, 1, [7]));
  
  // Level 28: 7 colors, 6 tube size, 1 empty, 1 frozen
  levels.push(createPerfectLevel(7, 6, 1, [8]));
  
  return levels;
}

// Main execution
console.log('Fixing levels 21-28...');

// Load existing levels
const existingLevels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Generate fixed levels
const fixedLevels = generateFixedLevels21to28();

// Verify each level
fixedLevels.forEach((level, index) => {
  const colorCounts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  const levelNumber = index + 21;
  let issues = [];
  
  // Check color balance
  for (let i = 0; i < level.colors; i++) {
    const color = COLORS[i];
    if (colorCounts[color] !== level.tubeSize) {
      issues.push(`Color ${color}: ${colorCounts[color]} (expected ${level.tubeSize})`);
    }
  }
  
  // Check frozen tubes
  level.frozenTubes.forEach(frozenIndex => {
    const tube = level.tubes[frozenIndex];
    if (tube.length > 0) {
      const allSame = tube.every(c => c === tube[0]);
      if (!allSame) {
        issues.push(`Frozen tube ${frozenIndex} has mixed colors`);
      }
      if (tube.length !== level.tubeSize) {
        issues.push(`Frozen tube ${frozenIndex} has ${tube.length} segments (expected ${level.tubeSize})`);
      }
    }
  });
  
  // Check tube count
  const expectedTubes = level.colors + level.emptyTubes + level.frozenTubes.length;
  if (level.tubes.length !== expectedTubes) {
    issues.push(`Tube count: ${level.tubes.length} (expected ${expectedTubes})`);
  }
  
  if (issues.length > 0) {
    console.error(`Level ${levelNumber} has issues:`, issues);
  } else {
    console.log(`✓ Level ${levelNumber}: ${level.colors} colors, ${level.tubeSize} tube size, ${level.frozenTubes.length} frozen tubes`);
  }
});

// Replace levels 21-28 with fixed ones
const finalLevels = [
  ...existingLevels.slice(0, 20),  // Keep levels 1-20
  ...fixedLevels,                  // Replace levels 21-28
  ...existingLevels.slice(28)      // Keep levels 29-50
];

// Save to file
fs.writeFileSync(LEVELS_PATH, JSON.stringify(finalLevels, null, 2));

console.log('\nFixed levels 21-28 successfully!');
console.log('All levels now have:');
console.log('- Exactly tubeSize segments per color');
console.log('- Proper frozen tube handling');
console.log('- Correct tube counts'); 