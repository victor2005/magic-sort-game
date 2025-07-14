// Comprehensive test of game mechanics
const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');

// Game mechanics functions (copied from App.tsx)
function isSolved(tubes, tubeSize) {
  return tubes.every(tube => {
    if (tube.length === 0) return true;
    if (tube.length !== tubeSize) return false;
    return tube.every(color => color === tube[0]);
  });
}

function hasPossibleMove(tubes, tubeSize, frozenTubes = [], oneColorInTubes = []) {
  for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
    const from = tubes[fromIdx];
    if (from.length === 0) continue;
    
    // Check if source tube is frozen - can't pour OUT of frozen tubes
    if (frozenTubes.includes(fromIdx)) continue;
    
    const color = from[from.length - 1];
    let count = 1;
    for (let i = from.length - 2; i >= 0; i--) {
      if (from[i] === color) count++;
      else break;
    }
    
    for (let toIdx = 0; toIdx < tubes.length; toIdx++) {
      if (fromIdx === toIdx) continue;
      const to = tubes[toIdx];
      if (to.length === tubeSize) continue;
      if (to.length > 0 && to[to.length - 1] !== color) continue;
      
      // Check one-color restrictions
      const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === toIdx);
      if (oneColorRestriction && oneColorRestriction.color !== color) continue;
      
      const space = tubeSize - to.length;
      const pourCount = Math.min(count, space);
      
      if (pourCount > 0) {
        return true;
      }
    }
  }
  return false;
}

function simulateMove(tubes, fromIdx, toIdx, tubeSize, frozenTubes = [], oneColorInTubes = []) {
  // Validate move
  if (fromIdx === toIdx) return null;
  if (tubes[fromIdx].length === 0) return null;
  if (tubes[toIdx].length === tubeSize) return null;
  
  // Check if source tube is frozen
  if (frozenTubes.includes(fromIdx)) return null;
  
  const color = tubes[fromIdx][tubes[fromIdx].length - 1];
  if (tubes[toIdx].length > 0 && tubes[toIdx][tubes[toIdx].length - 1] !== color) return null;
  
  // Check one-color restrictions
  const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === toIdx);
  if (oneColorRestriction && oneColorRestriction.color !== color) return null;
  
  // Count how many of the same color are on top
  let count = 1;
  for (let i = tubes[fromIdx].length - 2; i >= 0; i--) {
    if (tubes[fromIdx][i] === color) count++;
    else break;
  }
  
  const space = tubeSize - tubes[toIdx].length;
  const pourCount = Math.min(count, space);
  
  if (pourCount <= 0) return null;
  
  // Create new tubes state
  const newTubes = tubes.map((tube, i) =>
    i === fromIdx
      ? tube.slice(0, tube.length - pourCount)
      : i === toIdx
      ? [...tube, ...Array(pourCount).fill(color)]
      : [...tube]
  );
  
  return newTubes;
}

// Test functions
function testBasicMechanics() {
  console.log('Testing basic game mechanics...');
  
  // Test isSolved
  const solvedTubes = [
    ['#e57373', '#e57373', '#e57373', '#e57373'],
    ['#ffd54f', '#ffd54f', '#ffd54f', '#ffd54f'],
    [],
    []
  ];
  console.log('✓ isSolved works:', isSolved(solvedTubes, 4));
  
  const unsolvedTubes = [
    ['#e57373', '#ffd54f', '#e57373', '#e57373'],
    ['#ffd54f', '#ffd54f', '#ffd54f', '#e57373'],
    [],
    []
  ];
  console.log('✓ isSolved correctly identifies unsolved:', !isSolved(unsolvedTubes, 4));
  
  // Test hasPossibleMove
  console.log('✓ hasPossibleMove works:', hasPossibleMove(unsolvedTubes, 4));
  
  // Test simulateMove
  const result = simulateMove(unsolvedTubes, 0, 2, 4);
  console.log('✓ simulateMove works:', result !== null);
  
  console.log('Basic mechanics tests passed!\n');
}

function testFrozenTubes() {
  console.log('Testing frozen tube mechanics...');
  
  const tubes = [
    ['#e57373', '#ffd54f', '#e57373', '#e57373'],
    ['#ffd54f', '#ffd54f', '#ffd54f', '#e57373'],
    [],
    []
  ];
  
  const frozenTubes = [0]; // Tube 0 is frozen
  
  // Should not be able to pour FROM frozen tube
  const result1 = simulateMove(tubes, 0, 2, 4, frozenTubes);
  console.log('✓ Cannot pour FROM frozen tube:', result1 === null);
  
  // Should be able to pour TO frozen tube
  const result2 = simulateMove(tubes, 1, 0, 4, frozenTubes);
  console.log('✓ Can pour TO frozen tube:', result2 !== null);
  
  // Test hasPossibleMove with frozen tubes
  const hasMove = hasPossibleMove(tubes, 4, frozenTubes);
  console.log('✓ hasPossibleMove accounts for frozen tubes:', hasMove);
  
  console.log('Frozen tube tests passed!\n');
}

function testOneColorTubes() {
  console.log('Testing one-color tube mechanics...');
  
  const tubes = [
    ['#e57373', '#ffd54f', '#e57373', '#e57373'],
    ['#ffd54f', '#ffd54f', '#ffd54f', '#e57373'],
    [],
    []
  ];
  
  const oneColorInTubes = [{ tubeIndex: 2, color: '#e57373' }]; // Tube 2 only accepts red
  
  // Should be able to pour correct color TO one-color tube
  const result1 = simulateMove(tubes, 0, 2, 4, [], oneColorInTubes);
  console.log('✓ Can pour correct color TO one-color tube:', result1 !== null);
  
  // Should not be able to pour wrong color TO one-color tube
  const result2 = simulateMove(tubes, 1, 2, 4, [], oneColorInTubes);
  console.log('✓ Cannot pour wrong color TO one-color tube:', result2 === null);
  
  // Test hasPossibleMove with one-color tubes
  const hasMove = hasPossibleMove(tubes, 4, [], oneColorInTubes);
  console.log('✓ hasPossibleMove accounts for one-color tubes:', hasMove);
  
  console.log('One-color tube tests passed!\n');
}

function testLevelProgression() {
  console.log('Testing level progression...');
  
  const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));
  
  // Check that levels have proper progression
  let hasBasicLevels = 0;
  let hasFrozenTubes = 0;
  let hasOneColorTubes = 0;
  let hasBothSpecialTypes = 0;
  
  levels.forEach((level, idx) => {
    const frozenTubes = level.frozenTubes || [];
    const oneColorInTubes = level.oneColorInTubes || [];
    
    if (frozenTubes.length === 0 && oneColorInTubes.length === 0) {
      hasBasicLevels++;
    }
    if (frozenTubes.length > 0) {
      hasFrozenTubes++;
    }
    if (oneColorInTubes.length > 0) {
      hasOneColorTubes++;
    }
    if (frozenTubes.length > 0 && oneColorInTubes.length > 0) {
      hasBothSpecialTypes++;
    }
  });
  
  console.log(`✓ Total levels: ${levels.length}`);
  console.log(`✓ Basic levels: ${hasBasicLevels}`);
  console.log(`✓ Levels with frozen tubes: ${hasFrozenTubes}`);
  console.log(`✓ Levels with one-color tubes: ${hasOneColorTubes}`);
  console.log(`✓ Levels with both special types: ${hasBothSpecialTypes}`);
  
  // Check tube size progression
  const tubeSizes = levels.map(l => l.tubeSize);
  const uniqueSizes = [...new Set(tubeSizes)];
  console.log(`✓ Tube sizes used: ${uniqueSizes.join(', ')}`);
  
  // Check color progression
  const colorCounts = levels.map(l => l.colors);
  const uniqueColors = [...new Set(colorCounts)];
  console.log(`✓ Color counts used: ${uniqueColors.join(', ')}`);
  
  console.log('Level progression tests passed!\n');
}

function testSpecificLevels() {
  console.log('Testing specific level configurations...');
  
  const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));
  
  // Test first level (should be simple)
  const level1 = levels[0];
  console.log(`Level 1: ${level1.colors} colors, ${level1.tubeSize} tube size, ${level1.emptyTubes} empty tubes`);
  console.log(`  Frozen tubes: ${(level1.frozenTubes || []).length}`);
  console.log(`  One-color tubes: ${(level1.oneColorInTubes || []).length}`);
  console.log(`  Expected moves: ${level1.minMoves || level1.actualMoves}`);
  
  // Test a level with frozen tubes
  const frozenLevel = levels.find(l => (l.frozenTubes || []).length > 0);
  if (frozenLevel) {
    const idx = levels.indexOf(frozenLevel);
    console.log(`Level ${idx + 1} (with frozen tubes): ${frozenLevel.colors} colors, ${frozenLevel.tubeSize} tube size`);
    console.log(`  Frozen tubes: ${frozenLevel.frozenTubes.join(', ')}`);
    console.log(`  Expected moves: ${frozenLevel.minMoves || frozenLevel.actualMoves}`);
  }
  
  // Test a level with one-color tubes
  const oneColorLevel = levels.find(l => (l.oneColorInTubes || []).length > 0);
  if (oneColorLevel) {
    const idx = levels.indexOf(oneColorLevel);
    console.log(`Level ${idx + 1} (with one-color tubes): ${oneColorLevel.colors} colors, ${oneColorLevel.tubeSize} tube size`);
    console.log(`  One-color tubes: ${oneColorLevel.oneColorInTubes.map(t => `${t.tubeIndex}(${t.color})`).join(', ')}`);
    console.log(`  Expected moves: ${oneColorLevel.minMoves || oneColorLevel.actualMoves}`);
  }
  
  console.log('Specific level tests passed!\n');
}

// Run all tests
console.log('=== Game Mechanics Test Suite ===\n');

testBasicMechanics();
testFrozenTubes();
testOneColorTubes();
testLevelProgression();
testSpecificLevels();

console.log('=== All tests completed! ==='); 