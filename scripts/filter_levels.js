const fs = require('fs');
const path = require('path');

const LEVELS_PATH = path.join(__dirname, '../src/levels.json');
const BACKUP_PATH = path.join(__dirname, '../src/levels.json.bak');

// Read levels
const levels = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));

// Helper to count color occurrences in a level
function colorCounts(level) {
  const counts = {};
  for (const tube of level.tubes) {
    for (const color of tube) {
      counts[color] = (counts[color] || 0) + 1;
    }
  }
  return counts;
}

// Filter and update levels
const filtered = levels
  .filter(level => level.colors <= 10)
  .filter(level => {
    const counts = colorCounts(level);
    // All colors must appear exactly tubeSize times
    const allExact = Object.values(counts).every(count => count === level.tubeSize);
    if (!allExact) {
      console.warn(`Level removed: not all colors appear exactly tubeSize (${level.tubeSize}) times.`);
      return false;
    }
    return true;
  })
  .map(level => ({
    ...level,
    minMoves: (typeof level.minMoves === 'number' ? level.minMoves : 0) + 2
  }));

// Backup original
fs.copyFileSync(LEVELS_PATH, BACKUP_PATH);

// --- Add new valid levels until we have 50 ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateRandomLevel(levelIdx = 0) {
  // For variety, increase difficulty as levelIdx increases
  const minColors = 3 + Math.floor(levelIdx / 10);
  const maxColors = 6 + Math.floor(levelIdx / 10);
  const colors = Math.floor(Math.random() * (maxColors - minColors + 1)) + minColors;
  const tubeSize = Math.max(4, Math.min(6, 4 + Math.floor(levelIdx / 15)));
  const emptyTubes = Math.max(1, Math.min(3, 2 + Math.floor(levelIdx / 20)));
  const colorList = [
    "#e57373", "#64b5f6", "#ffd54f", "#81c784", "#ba68c8", "#ff8a65", "#4db6ac", "#ffb74d"
  ];
  const usedColors = colorList.slice(0, colors);
  let balls = [];
  for (const color of usedColors) {
    for (let i = 0; i < tubeSize; i++) balls.push(color);
  }
  const tubes = [];
  const totalTubes = colors + emptyTubes;
  for (let i = 0; i < totalTubes; i++) tubes.push([]);

  let frozenTubes = [];
  let oneColorInTubes = [];

  if (levelIdx >= 35) {
    // Force one partially filled single-color frozen tube
    const chosenColor = usedColors[Math.floor(Math.random() * usedColors.length)];
    const partialCount = Math.floor(Math.random() * (tubeSize - 2)) + 2; // 2 to tubeSize-1
    // Remove partialCount balls of chosenColor from balls
    let removed = 0;
    balls = balls.filter(ball => {
      if (ball === chosenColor && removed < partialCount) {
        removed++;
        return false;
      }
      return true;
    });
    // Place them in a random tube
    const frozenIdx = Math.floor(Math.random() * totalTubes);
    for (let i = 0; i < partialCount; i++) {
      tubes[frozenIdx].push(chosenColor);
    }
    frozenTubes = [frozenIdx];
    // Distribute the rest of the balls randomly
    shuffle(balls);
    let idx = 0;
    for (const color of balls) {
      // Skip the frozen tube
      while (idx % totalTubes === frozenIdx) idx++;
      tubes[idx % totalTubes].push(color);
      idx++;
    }
  } else {
    // Standard distribution for lower levels
    shuffle(balls);
    let idx = 0;
    for (const color of balls) {
      tubes[idx % colors].push(color);
      idx++;
    }
    shuffle(tubes);
    // Levels 21-35: only empty tubes can be frozen
    if (levelIdx >= 20 && totalTubes > 2) {
      const emptyCandidates = [];
      tubes.forEach((tube, idx) => {
        if (tube.length === 0) {
          emptyCandidates.push(idx);
        }
      });
      const numFrozen = 1 + Math.floor(Math.random() * 1);
      const eligible = shuffle(emptyCandidates);
      frozenTubes = eligible.slice(0, Math.min(numFrozen, eligible.length));
    }
  }

  // --- Add special tubes for higher levels ---
  if (levelIdx >= 35 && totalTubes > 3) {
    // Levels 36-50: 1-2 one color tubes (not overlapping with frozen)
    const numOneColor = 1 + Math.floor(Math.random() * 2);
    const candidates = Array.from({ length: totalTubes }, (_, i) => i)
      .filter(i => tubes[i].length > 0 && !frozenTubes.includes(i));
    shuffle(candidates);
    oneColorInTubes = candidates.slice(0, Math.min(numOneColor, candidates.length));
  }

  return {
    colors,
    tubeSize,
    emptyTubes,
    shuffleMoves: 20 + levelIdx * 4,
    minMoves: colors + 2 + Math.floor(levelIdx / 5),
    tubes,
    frozenTubes,
    oneColorInTubes
  };
}

// Regenerate levels after 21
const keepCount = 21;
let finalLevels = filtered.slice(0, keepCount);
let attempts = 0;
while (finalLevels.length < 50 && attempts < 500) {
  const newLevel = generateRandomLevel(finalLevels.length);
  // Validate color counts (no color appears more than tubeSize in the whole level)
  const counts = colorCounts(newLevel);
  const overfilled = Object.values(counts).some(count => count > newLevel.tubeSize);
  const allExact = Object.values(counts).every(count => count === newLevel.tubeSize);
  if (!overfilled && allExact) {
    finalLevels.push(newLevel);
  }
  attempts++;
}

fs.writeFileSync(LEVELS_PATH, JSON.stringify(finalLevels, null, 2));

console.log(`Filtered and filled levels: now have ${finalLevels.length} levels. Backup saved as src/levels.json.bak.`); 