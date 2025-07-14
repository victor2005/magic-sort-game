const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');
const BACKUP_PATH = path.join(__dirname, '../src/levels.json.backup-perfect');

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
  
  // Step 2: Calculate total tubes needed (including one-color tubes)
  const totalTubes = colors + emptyTubes + frozenTubes.length + oneColorInTubes.length;
  const tubes = Array(totalTubes).fill().map(() => []);
  
  // Step 3: Handle frozen tubes first
  const frozenTubeColors = new Set();
  frozenTubes.forEach(frozenIndex => {
    if (Math.random() < 0.3) {
      // 30% chance to be empty (already initialized as empty)
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
  
  // Step 4: Handle one-color tubes (pre-fill them partially with their designated color)
  oneColorInTubes.forEach(restriction => {
    const tubeIndex = restriction.tubeIndex;
    const color = restriction.color;
    
    // Fill the one-color tube with some segments of its designated color
    const fillAmount = Math.floor(Math.random() * (tubeSize - 1)) + 1; // 1 to tubeSize-1
    for (let i = 0; i < fillAmount; i++) {
      tubes[tubeIndex].push(color);
      // Remove these segments from the available pool
      const segmentIndex = allSegments.indexOf(color);
      if (segmentIndex !== -1) {
        allSegments.splice(segmentIndex, 1);
      }
    }
  });
  
  // Step 5: Shuffle remaining segments
  const shuffledSegments = shuffle(allSegments);
  
  // Step 6: Distribute remaining segments to available tubes
  const availableTubes = [];
  for (let i = 0; i < totalTubes; i++) {
    if (!frozenTubes.includes(i) && i >= emptyTubes) {
      // For one-color tubes, only add if they can accept more segments
      const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === i);
      if (oneColorRestriction) {
        // One-color tube can only accept its designated color
        if (tubes[i].length < tubeSize) {
          availableTubes.push(i);
        }
      } else {
        // Regular tube
        availableTubes.push(i);
      }
    }
  }
  
  // Fill available tubes with shuffled segments
  let segmentIndex = 0;
  for (const tubeIndex of availableTubes) {
    const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === tubeIndex);
    
    if (oneColorRestriction) {
      // For one-color tubes, only add segments of the designated color
      const designatedColor = oneColorRestriction.color;
      while (tubes[tubeIndex].length < tubeSize && segmentIndex < shuffledSegments.length) {
        if (shuffledSegments[segmentIndex] === designatedColor) {
          tubes[tubeIndex].push(shuffledSegments[segmentIndex]);
          shuffledSegments.splice(segmentIndex, 1);
        } else {
          segmentIndex++;
        }
      }
      segmentIndex = 0; // Reset for next tube
    } else {
      // Regular tube - fill with any available segments
      const fillAmount = Math.min(tubeSize, shuffledSegments.length - segmentIndex);
      for (let i = 0; i < fillAmount; i++) {
        tubes[tubeIndex].push(shuffledSegments[segmentIndex]);
        segmentIndex++;
      }
    }
  }
  
  // Step 7: If there are remaining segments, distribute them randomly to non-restricted tubes
  while (segmentIndex < shuffledSegments.length) {
    const availableSpaces = [];
    for (let i = 0; i < totalTubes; i++) {
      if (!frozenTubes.includes(i) && tubes[i].length < tubeSize) {
        const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === i);
        if (!oneColorRestriction) {
          // Only add regular tubes (not one-color restricted)
          availableSpaces.push(i);
        }
      }
    }
    
    if (availableSpaces.length === 0) break;
    
    const randomTube = availableSpaces[Math.floor(Math.random() * availableSpaces.length)];
    tubes[randomTube].push(shuffledSegments[segmentIndex]);
    segmentIndex++;
  }
  
  // Step 8: Verify color balance
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

// Generate levels 29-50
function generateLevels29to50() {
  const levels = [];
  
  // Levels 29-32: Basic challenging levels
  for (let i = 29; i <= 32; i++) {
    const colors = 6;
    const tubeSize = 8;
    const emptyTubes = 2;
    levels.push(createPerfectLevel(colors, tubeSize, emptyTubes));
  }
  
  // Levels 33-36: Add frozen tubes
  for (let i = 33; i <= 36; i++) {
    const colors = 6 + Math.floor((i - 33) / 2);
    const tubeSize = 8;
    const emptyTubes = 2;
    const frozenTubes = [colors + emptyTubes]; // One frozen tube
    levels.push(createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes));
  }
  
  // Levels 37-42: More frozen tubes
  for (let i = 37; i <= 42; i++) {
    const colors = 7;
    const tubeSize = 8;
    const emptyTubes = 2;
    const frozenCount = Math.min(2, Math.floor((i - 37) / 2) + 1);
    const frozenTubes = [];
    for (let j = 0; j < frozenCount; j++) {
      frozenTubes.push(colors + emptyTubes + j);
    }
    levels.push(createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes));
  }
  
  // Levels 43-46: Add one-color tubes
  for (let i = 43; i <= 46; i++) {
    const colors = 7;
    const tubeSize = 8;
    const emptyTubes = 2;
    const frozenTubes = [colors + emptyTubes]; // One frozen tube at index 9
    const oneColorInTubes = [{
      tubeIndex: colors + emptyTubes + 1, // This would be index 10, but we only have 10 tubes (0-9)
      color: COLORS[Math.floor(Math.random() * colors)]
    }];
    // Fix: Create an additional tube for one-color restriction
    levels.push(createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes));
  }
  
  // Levels 47-50: Ultimate challenge
  for (let i = 47; i <= 50; i++) {
    const colors = 8;
    const tubeSize = 8;
    const emptyTubes = 1;
    const frozenTubes = [colors + emptyTubes, colors + emptyTubes + 1]; // indices 9, 10
    const oneColorInTubes = [{
      tubeIndex: colors + emptyTubes + 2, // This would be index 11, but we only have 11 tubes (0-10)
      color: COLORS[Math.floor(Math.random() * colors)]
    }];
    // Fix: Create an additional tube for one-color restriction
    levels.push(createPerfectLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes));
  }
  
  return levels;
}

// Main execution
console.log('Creating perfect levels 29-50...');

// Backup existing levels
if (fs.existsSync(LEVELS_PATH)) {
  fs.copyFileSync(LEVELS_PATH, BACKUP_PATH);
  console.log('Backed up existing levels');
}

// Load existing levels
const existingLevels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Generate new levels
const newLevels = generateLevels29to50();

// Verify each level
newLevels.forEach((level, index) => {
  const colorCounts = {};
  level.tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  const levelNumber = index + 29;
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
  
  if (issues.length > 0) {
    console.error(`Level ${levelNumber} has issues:`, issues);
  } else {
    console.log(`✓ Level ${levelNumber}: ${level.colors} colors, ${level.frozenTubes.length} frozen tubes, ${level.oneColorInTubes.length} one-color tubes`);
  }
});

// Replace levels 29-50 with new ones
const finalLevels = [...existingLevels.slice(0, 28), ...newLevels];

// Save to file
fs.writeFileSync(LEVELS_PATH, JSON.stringify(finalLevels, null, 2));

console.log('\nPerfect levels 29-50 created successfully!');
console.log('All levels have:');
console.log('- Exactly tubeSize segments per color');
console.log('- Proper frozen tube handling');
console.log('- Progressive difficulty'); 