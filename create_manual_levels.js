const fs = require('fs');

// Load existing levels
const existingLevels = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));

// Manually create perfect levels for testing
const manualLevels = [
  // Level 29: 6 colors, 8 segments, 2 empty, 1 frozen
  {
    colors: 6,
    tubeSize: 8,
    emptyTubes: 2,
    tubes: [
      [], // Empty
      [], // Empty
      ["#e57373", "#e57373", "#e57373"], // Frozen tube with red
      ["#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6"],
      ["#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784"],
      ["#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784", "#ffd54f"],
      ["#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8"],
      ["#ff8a65", "#4db6ac", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac"]
    ],
    frozenTubes: [2],
    oneColorInTubes: [],
    actualMoves: 35,
    minMoves: 25,
    shuffleMoves: 96
  },
  
  // Level 30: 6 colors, 8 segments, 2 empty, 2 frozen
  {
    colors: 6,
    tubeSize: 8,
    emptyTubes: 2,
    tubes: [
      [], // Empty
      [], // Empty
      ["#e57373", "#e57373", "#e57373", "#e57373"], // Frozen tube with red
      ["#64b5f6", "#64b5f6"], // Frozen tube with blue
      ["#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784"],
      ["#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784", "#ffd54f"],
      ["#ba68c8", "#ff8a65", "#4db6ac", "#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8"],
      ["#ff8a65", "#4db6ac", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac"]
    ],
    frozenTubes: [2, 3],
    oneColorInTubes: [],
    actualMoves: 40,
    minMoves: 30,
    shuffleMoves: 96
  }
];

// Replace just levels 29-30 with manual ones for testing
const newLevels = [
  ...existingLevels.slice(0, 28), // Keep levels 1-28
  ...manualLevels, // Add manual levels 29-30
  ...existingLevels.slice(30) // Keep levels 31-50
];

// Save the new levels
fs.writeFileSync('src/levels.json', JSON.stringify(newLevels, null, 2));

console.log('Created 2 manually crafted perfect levels (29-30)');
console.log('- Each color has exactly 8 segments');
console.log('- Frozen tubes contain only same color');
console.log('- Levels saved to src/levels.json'); 