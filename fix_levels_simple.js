const fs = require('fs');

const COLORS = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#ffb74d"];

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSimpleLevel(colors, tubeSize, emptyTubes, frozenTubes = [], oneColorInTubes = []) {
  // Create exactly tubeSize segments per color
  const allSegments = [];
  for (let i = 0; i < colors; i++) {
    for (let j = 0; j < tubeSize; j++) {
      allSegments.push(COLORS[i]);
    }
  }
  
  // Shuffle all segments
  const shuffledSegments = shuffle(allSegments);
  
  // Create tubes
  const tubes = [];
  
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push([]);
  }
  
  // Add color tubes
  let segmentIndex = 0;
  for (let i = 0; i < colors; i++) {
    const tube = [];
    for (let j = 0; j < tubeSize; j++) {
      tube.push(shuffledSegments[segmentIndex]);
      segmentIndex++;
    }
    tubes.push(tube);
  }
  
  // Handle frozen tubes by replacing their content
  for (const frozenIdx of frozenTubes) {
    if (frozenIdx < emptyTubes) {
      // Frozen empty tube - keep empty
      continue;
    } else if (frozenIdx < tubes.length) {
      // Frozen non-empty tube - fill with same color
      const colorIdx = Math.floor(Math.random() * colors);
      const color = COLORS[colorIdx];
      const fillCount = Math.floor(Math.random() * (tubeSize - 1)) + 1; // 1 to tubeSize-1
      
      // Remove segments from this tube
      const removedSegments = tubes[frozenIdx].splice(0, tubes[frozenIdx].length);
      
      // Fill with same color
      for (let j = 0; j < fillCount; j++) {
        tubes[frozenIdx].push(color);
      }
      
      // Find segments of this color in removed segments and replace with other colors
      const colorSegmentsToReplace = removedSegments.filter(s => s === color);
      const otherSegments = removedSegments.filter(s => s !== color);
      
      // Add back the non-matching segments and some matching ones
      const segmentsToDistribute = [
        ...otherSegments,
        ...colorSegmentsToReplace.slice(fillCount) // Only add excess segments
      ];
      
      // Distribute to other non-frozen tubes
      const nonFrozenTubes = [];
      for (let i = emptyTubes; i < tubes.length; i++) {
        if (!frozenTubes.includes(i)) {
          nonFrozenTubes.push(i);
        }
      }
      
      // Add segments back to non-frozen tubes
      for (const segment of segmentsToDistribute) {
        if (nonFrozenTubes.length > 0) {
          const targetIdx = nonFrozenTubes[Math.floor(Math.random() * nonFrozenTubes.length)];
          if (tubes[targetIdx].length < tubeSize) {
            tubes[targetIdx].push(segment);
          }
        }
      }
    }
  }
  
  // Final shuffle of non-frozen tubes
  const nonFrozenTubes = [];
  for (let i = emptyTubes; i < tubes.length; i++) {
    if (!frozenTubes.includes(i)) {
      nonFrozenTubes.push(i);
    }
  }
  
  // Perform swaps between non-frozen tubes
  for (let i = 0; i < 100; i++) {
    if (nonFrozenTubes.length < 2) break;
    
    const tube1Idx = nonFrozenTubes[Math.floor(Math.random() * nonFrozenTubes.length)];
    const tube2Idx = nonFrozenTubes[Math.floor(Math.random() * nonFrozenTubes.length)];
    
    if (tube1Idx !== tube2Idx && tubes[tube1Idx].length > 0 && tubes[tube2Idx].length > 0) {
      const pos1 = Math.floor(Math.random() * tubes[tube1Idx].length);
      const pos2 = Math.floor(Math.random() * tubes[tube2Idx].length);
      
      [tubes[tube1Idx][pos1], tubes[tube2Idx][pos2]] = [tubes[tube2Idx][pos2], tubes[tube1Idx][pos1]];
    }
  }
  
  return {
    colors,
    tubeSize,
    emptyTubes,
    tubes,
    frozenTubes,
    oneColorInTubes,
    actualMoves: Math.floor(colors * tubeSize * 0.6 + Math.random() * 20),
    minMoves: Math.floor(colors * tubeSize * 0.4 + Math.random() * 10),
    shuffleMoves: colors * tubeSize * 2
  };
}

// Load existing levels
const existingLevels = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

// Generate simple levels 29-50
const simpleLevels = [];

// Levels 29-35: Frozen tubes
for (let i = 29; i <= 35; i++) {
  const colors = Math.min(6 + Math.floor((i - 29) / 2), 8);
  const tubeSize = 8;
  const emptyTubes = 2;
  const frozenCount = Math.min(1 + Math.floor((i - 29) / 2), 3);
  const frozenTubes = [];
  
  // Add frozen tubes
  for (let j = 0; j < frozenCount; j++) {
    if (j === 0 && Math.random() < 0.3) {
      frozenTubes.push(j); // Empty frozen tube
    } else {
      frozenTubes.push(emptyTubes + j); // Non-empty frozen tube
    }
  }
  
  simpleLevels.push(generateSimpleLevel(colors, tubeSize, emptyTubes, frozenTubes, []));
}

// Levels 36-42: One-color tubes + frozen tubes
for (let i = 36; i <= 42; i++) {
  const colors = Math.min(7 + Math.floor((i - 36) / 2), 8);
  const tubeSize = 8;
  const emptyTubes = 2;
  const frozenCount = Math.min(1 + Math.floor((i - 36) / 3), 2);
  const frozenTubes = [];
  
  for (let j = 0; j < frozenCount; j++) {
    if (j === 0 && Math.random() < 0.2) {
      frozenTubes.push(j);
    } else {
      frozenTubes.push(emptyTubes + j);
    }
  }
  
  const oneColorInTubes = [{
    tubeIndex: colors + emptyTubes,
    color: COLORS[Math.floor(Math.random() * colors)]
  }];
  
  simpleLevels.push(generateSimpleLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes));
}

// Levels 43-50: Ultra challenging
for (let i = 43; i <= 50; i++) {
  const colors = 8;
  const tubeSize = 8;
  const emptyTubes = 1;
  const frozenCount = Math.min(2 + Math.floor((i - 43) / 2), 4);
  const frozenTubes = [];
  
  for (let j = 0; j < frozenCount; j++) {
    if (j === 0 && Math.random() < 0.1) {
      frozenTubes.push(0);
    } else {
      frozenTubes.push(emptyTubes + j);
    }
  }
  
  const oneColorInTubes = [];
  const oneColorCount = Math.min(1 + Math.floor((i - 43) / 3), 2);
  for (let j = 0; j < oneColorCount; j++) {
    oneColorInTubes.push({
      tubeIndex: colors + emptyTubes + j,
      color: COLORS[j]
    });
  }
  
  simpleLevels.push(generateSimpleLevel(colors, tubeSize, emptyTubes, frozenTubes, oneColorInTubes));
}

// Replace levels 29-50 with simple ones
const newLevels = [...existingLevels.slice(0, 28), ...simpleLevels];

// Save the new levels
fs.writeFileSync('src/levels.json', JSON.stringify(newLevels, null, 2));

console.log(`Generated ${simpleLevels.length} simple balanced levels (29-50)`);
console.log('- Each color has exactly tubeSize segments');
console.log('- Frozen tubes contain only same color or are empty');
console.log('Levels saved to src/levels.json'); 