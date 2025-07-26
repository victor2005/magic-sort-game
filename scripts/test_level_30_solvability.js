const fs = require('fs');

// Available colors from the game
const COLORS = [
  "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
  "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
];

// Check if tubes are solved
function isSolved(tubes, tubeSize) {
  return tubes.every(tube => 
    tube.length === 0 || (tube.length === tubeSize && tube.every(color => color === tube[0]))
  );
}

// Check if a move is valid
function isValidMove(fromTube, toTube, tubeSize, color) {
  if (toTube.length >= tubeSize) return false;
  if (toTube.length > 0 && toTube[toTube.length - 1] !== color) return false;
  
  // Count how many of the same color are already in the target tube
  let targetColorCount = 0;
  for (let i = 0; i < toTube.length; i++) {
    if (toTube[i] === color) targetColorCount++;
  }
  
  return targetColorCount < tubeSize;
}

// Get all possible moves from current state
function getPossibleMoves(tubes, tubeSize) {
  const moves = [];
  
  for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
    const fromTube = tubes[fromIdx];
    if (fromTube.length === 0) continue;
    
    const color = fromTube[fromTube.length - 1];
    let count = 1;
    for (let i = fromTube.length - 2; i >= 0; i--) {
      if (fromTube[i] === color) count++;
      else break;
    }
    
    for (let toIdx = 0; toIdx < tubes.length; toIdx++) {
      if (fromIdx === toIdx) continue;
      
      const toTube = tubes[toIdx];
      if (isValidMove(fromTube, toTube, tubeSize, color)) {
        // Calculate how many segments can be poured
        const space = tubeSize - toTube.length;
        let targetColorCount = 0;
        for (let i = 0; i < toTube.length; i++) {
          if (toTube[i] === color) targetColorCount++;
        }
        const maxPourForColor = tubeSize - targetColorCount;
        const pourCount = Math.min(count, space, maxPourForColor);
        
        if (pourCount > 0) {
          moves.push({ fromIdx, toIdx, pourCount, color });
        }
      }
    }
  }
  
  return moves;
}

// Execute a move
function executeMove(tubes, move) {
  const newTubes = tubes.map(tube => [...tube]);
  const { fromIdx, toIdx, pourCount } = move;
  
  // Remove segments from source tube
  for (let i = 0; i < pourCount; i++) {
    newTubes[fromIdx].pop();
  }
  
  // Add segments to target tube
  const color = move.color;
  for (let i = 0; i < pourCount; i++) {
    newTubes[toIdx].push(color);
  }
  
  return newTubes;
}

// Simple solver using DFS with limited depth
function solveLevel(tubes, tubeSize, maxDepth = 50) {
  const visited = new Set();
  const queue = [{ tubes: tubes.map(tube => [...tube]), moves: [], depth: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    // Check if solved
    if (isSolved(current.tubes, tubeSize)) {
      console.log('🎉 SOLUTION FOUND!');
      console.log('Moves needed:', current.moves.length);
      current.moves.forEach((move, index) => {
        console.log(`Move ${index + 1}: Pour ${move.pourCount} segment(s) from tube ${move.fromIdx + 1} to tube ${move.toIdx + 1}`);
      });
      return current.moves;
    }
    
    // Check depth limit
    if (current.depth >= maxDepth) continue;
    
    // Get possible moves
    const moves = getPossibleMoves(current.tubes, tubeSize);
    
    for (const move of moves) {
      const newTubes = executeMove(current.tubes, move);
      
      // Create state hash to avoid cycles
      const stateHash = newTubes.map(tube => tube.join(',')).join('|');
      
      if (!visited.has(stateHash)) {
        visited.add(stateHash);
        queue.push({
          tubes: newTubes,
          moves: [...current.moves, move],
          depth: current.depth + 1
        });
      }
    }
  }
  
  console.log('❌ No solution found within depth limit');
  return null;
}

// Test Level 30
function testLevel30() {
  console.log('🧪 TESTING LEVEL 30 SOLVABILITY...\n');
  
  const levels = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));
  const level = levels[29]; // Level 30 (0-indexed)
  
  console.log('📊 Level 30 Configuration:');
  console.log(`Colors: ${level.colors}`);
  console.log(`Tube size: ${level.tubeSize}`);
  console.log(`Total tubes: ${level.tubes.length}`);
  console.log(`Empty tubes: ${level.tubes.filter(t => t.length === 0).length}`);
  
  console.log('\n🔍 Initial State:');
  level.tubes.forEach((tube, index) => {
    console.log(`Tube ${index + 1}: [${tube.map(color => color.substring(1, 4)).join(', ')}]`);
  });
  
  console.log('\n🎯 Attempting to solve...');
  const startTime = Date.now();
  const solution = solveLevel(level.tubes, level.tubeSize);
  const endTime = Date.now();
  
  console.log(`\n⏱️  Solver took ${endTime - startTime}ms`);
  
  if (solution) {
    console.log('\n✅ Level 30 is SOLVABLE!');
    console.log(`Solution requires ${solution.length} moves`);
  } else {
    console.log('\n❌ Level 30 appears to be UNSOLVABLE or very difficult');
    console.log('This might need to be regenerated.');
  }
}

// Run the test
testLevel30(); 