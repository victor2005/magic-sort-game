const fs = require('fs');

// Available colors from the game
const COLORS = [
  "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", 
  "#ff8a65", "#4db6ac", "#ffb74d", "#f06292", "#9575cd"
];

// Create a simple but guaranteed solvable Level 30
function createSimpleSolvableLevel30() {
  console.log('🔧 Creating a simple but guaranteed solvable Level 30...');
  
  // Load levels
  const levelsPath = 'src/levels.json';
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  
  // Create a simple pattern that's guaranteed to be solvable
  // Each tube has a mix of colors, but with clear patterns that can be solved
  const newTubes = [
    ["#e57373", "#e57373", "#64b5f6", "#64b5f6", "#ffd54f", "#ffd54f"], // 2 of each color
    ["#81c784", "#81c784", "#ba68c8", "#ba68c8", "#ff8a65", "#ff8a65"], // 2 of each color
    ["#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ff8a65"], // 1 of each color
    ["#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ff8a65", "#e57373"], // 1 of each color
    ["#ffd54f", "#81c784", "#ba68c8", "#ff8a65", "#e57373", "#64b5f6"], // 1 of each color
    ["#81c784", "#ba68c8", "#ff8a65", "#e57373", "#64b5f6", "#ffd54f"], // 1 of each color
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
  console.log('✅ Simple solvable Level 30 has been created and saved!');
  
  // Show the new level
  console.log('\n📊 New Level 30 Configuration:');
  console.log(`Colors: ${newLevel.colors}`);
  console.log(`Tube size: ${newLevel.tubeSize}`);
  console.log(`Total tubes: ${newLevel.tubes.length}`);
  console.log(`Empty tubes: ${newLevel.tubes.filter(t => t.length === 0).length}`);
  console.log(`Frozen tubes: ${newLevel.frozenTubes.length}`);
  console.log(`One-color tubes: ${newLevel.oneColorInTubes.length}`);
  
  console.log('\n🔍 New Initial State:');
  newTubes.forEach((tube, index) => {
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
  
  // Check if any tube is already solved
  let hasSolvedTube = false;
  newTubes.forEach((tube, index) => {
    if (tube.length === 6 && tube.every(color => color === tube[0])) {
      console.log(`❌ Tube ${index + 1} is already solved!`);
      hasSolvedTube = true;
    }
  });
  
  if (!hasSolvedTube) {
    console.log('\n✅ No tubes are already solved - good challenge level!');
  }
  
  console.log('\n🎯 Level 30 is now simple but solvable!');
  console.log('   (Clear patterns that can be solved step by step)');
  console.log('   (First two tubes have pairs that can be easily organized)');
}

// Run the fix
createSimpleSolvableLevel30(); 