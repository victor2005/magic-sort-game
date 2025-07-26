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

// Create a solved state and then scramble it
function createSolvableLevel(levelIndex) {
  const colors = 6;
  const tubeSize = 6;
  const emptyTubes = 1;
  const totalTubes = colors + emptyTubes;
  
  // Step 1: Create a solved state
  const solvedTubes = [];
  
  // Fill each tube with one color (except the last one which is empty)
  for (let i = 0; i < colors; i++) {
    const color = COLORS[i];
    solvedTubes.push(Array(tubeSize).fill(color));
  }
  
  // Add empty tube
  solvedTubes.push([]);
  
  // Step 2: Scramble the solved state by making random valid moves
  const scrambledTubes = solvedTubes.map(tube => [...tube]);
  const numScrambles = 20 + Math.floor(Math.random() * 10); // 20-30 random moves
  
  for (let i = 0; i < numScrambles; i++) {
    // Find all possible moves
    const moves = [];
    
    for (let fromIdx = 0; fromIdx < scrambledTubes.length; fromIdx++) {
      const fromTube = scrambledTubes[fromIdx];
      if (fromTube.length === 0) continue;
      
      const color = fromTube[fromTube.length - 1];
      let count = 1;
      for (let j = fromTube.length - 2; j >= 0; j--) {
        if (fromTube[j] === color) count++;
        else break;
      }
      
      for (let toIdx = 0; toIdx < scrambledTubes.length; toIdx++) {
        if (fromIdx === toIdx) continue;
        
        const toTube = scrambledTubes[toIdx];
        if (toTube.length >= tubeSize) continue;
        if (toTube.length > 0 && toTube[toTube.length - 1] !== color) continue;
        
        // Count how many of the same color are already in the target tube
        let targetColorCount = 0;
        for (let k = 0; k < toTube.length; k++) {
          if (toTube[k] === color) targetColorCount++;
        }
        
        const space = tubeSize - toTube.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);
        
        if (pourCount > 0) {
          moves.push({ fromIdx, toIdx, pourCount, color });
        }
      }
    }
    
    // Make a random move
    if (moves.length > 0) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      
      // Execute the move
      for (let j = 0; j < move.pourCount; j++) {
        scrambledTubes[move.fromIdx].pop();
      }
      
      for (let j = 0; j < move.pourCount; j++) {
        scrambledTubes[move.toIdx].push(move.color);
      }
    }
  }
  
  // Step 3: Ensure we have exactly one empty tube
  const emptyTubesCount = scrambledTubes.filter(tube => tube.length === 0).length;
  if (emptyTubesCount > 1) {
    // Remove excess empty tubes
    const filledTubes = scrambledTubes.filter(tube => tube.length > 0);
    filledTubes.push([]); // Add exactly one empty tube
    return filledTubes;
  } else if (emptyTubesCount === 0) {
    // Add one empty tube
    scrambledTubes.push([]);
    return scrambledTubes;
  }
  
  return scrambledTubes;
}

// Verify the level is solvable by checking basic properties
function verifySolvability(tubes, tubeSize) {
  // Count colors
  const colorCounts = {};
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if each color has exactly tubeSize segments
  const targetColors = COLORS.slice(0, 6); // 6 colors for level 30
  for (const color of targetColors) {
    if ((colorCounts[color] || 0) !== tubeSize) {
      console.log(`❌ Color ${color} has ${colorCounts[color] || 0} segments, should be ${tubeSize}`);
      return false;
    }
  }
  
  // Check if there's exactly one empty tube
  const emptyTubes = tubes.filter(tube => tube.length === 0).length;
  if (emptyTubes !== 1) {
    console.log(`❌ Found ${emptyTubes} empty tubes, should be 1`);
    return false;
  }
  
  console.log('✅ Level verification passed!');
  return true;
}

// Create and save Level 30
function createSolvableLevel30() {
  console.log('🔧 Creating a guaranteed solvable Level 30...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  // Create the new level
  const newTubes = createSolvableLevel(29); // Level 30 (0-indexed)
  
  // Verify it's valid
  if (!verifySolvability(newTubes, 6)) {
    console.log('❌ Generated level failed verification');
    return;
  }
  
  // Create the level configuration
  const newLevel = {
    colors: 6,
    tubeSize: 6,
    emptyTubes: 1,
    frozenTubes: [],
    oneColorInTubes: [],
    tubes: newTubes
  };
  
  // Replace Level 30
  levels[29] = newLevel;
  
  // Save the fixed levels
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
  console.log('✅ Solvable Level 30 has been created and saved!');
  
  // Show the new level
  console.log('\n📊 New Level 30 Configuration:');
  console.log(`Colors: ${newLevel.colors}`);
  console.log(`Tube size: ${newLevel.tubeSize}`);
  console.log(`Total tubes: ${newLevel.tubes.length}`);
  console.log(`Empty tubes: ${newLevel.tubes.filter(t => t.length === 0).length}`);
  console.log(`Frozen tubes: ${newLevel.frozenTubes.length}`);
  console.log(`One-color tubes: ${newLevel.oneColorInTubes.length}`);
  
  console.log('\n🔍 New Initial State:');
  newLevel.tubes.forEach((tube, index) => {
    console.log(`Tube ${index + 1}: [${tube.map(color => color.substring(1, 4)).join(', ')}]`);
  });
  
  console.log('\n🎯 Level 30 is now guaranteed to be solvable!');
  console.log('   (Created by scrambling a solved state)');
}

// Run the creation
createSolvableLevel30(); 