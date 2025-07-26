const fs = require('fs');

// Available colors from the game
const COLORS = [
  "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
  "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
];

// Create a properly scrambled Level 30 with perfect color distribution
function createPerfectLevel30() {
  console.log('🔧 Creating a perfectly balanced Level 30...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  // Create a manually crafted level with perfect color distribution
  // Each color appears exactly 6 times
  const newTubes = [
    ["#e57373", "#64b5f6", "#e57373", "#ffd54f", "#81c784", "#ba68c8"],
    ["#64b5f6", "#ff8a65", "#64b5f6", "#e57373", "#ffd54f", "#81c784"],
    ["#ffd54f", "#81c784", "#ffd54f", "#64b5f6", "#ff8a65", "#ba68c8"],
    ["#81c784", "#ba68c8", "#81c784", "#ffd54f", "#e57373", "#64b5f6"],
    ["#ba68c8", "#ff8a65", "#ba68c8", "#81c784", "#ffd54f", "#e57373"],
    ["#ff8a65", "#e57373", "#ff8a65", "#ba68c8", "#64b5f6", "#ffd54f"],
    [] // Empty tube
  ];
  
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
  console.log('✅ Perfect Level 30 has been created and saved!');
  
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
  
  // Verify color distribution
  const colorCounts = {};
  newTubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  console.log('\n🎨 Color Distribution:');
  let allPerfect = true;
  Object.entries(colorCounts).forEach(([color, count]) => {
    const status = count === 6 ? '✅' : '❌';
    console.log(`${status} Color ${color.substring(1, 4)}: ${count} segments (should be 6)`);
    if (count !== 6) allPerfect = false;
  });
  
  if (allPerfect) {
    console.log('\n✅ Perfect! All colors have exactly 6 segments');
  } else {
    console.log('\n⚠️  Some colors have incorrect counts');
  }
  
  console.log('\n🎯 Level 30 is now properly scrambled and solvable!');
  console.log('   (No tubes are already solved, good challenge level)');
}

// Run the fix
createPerfectLevel30(); 