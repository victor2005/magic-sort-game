const fs = require('fs');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function pickRandomIndices(count, max, exclude = []) {
  const indices = [];
  const available = Array.from({length: max}, (_, i) => i).filter(i => !exclude.includes(i));
  shuffle(available);
  for (let i = 0; i < Math.min(count, available.length); i++) {
    indices.push(available[i]);
  }
  return indices;
}
function tubeHasAtLeastNDistinctColors(tube, n) {
  return new Set(tube).size >= n;
}
function tubeHasNoLargeMonoBlocks(tube, maxBlock = 2) {
  if (tube.length === 0) return true;
  let last = tube[0], count = 1;
  for (let i = 1; i < tube.length; i++) {
    if (tube[i] === last) {
      count++;
      if (count > maxBlock) return false;
    } else {
      last = tube[i];
      count = 1;
    }
  }
  return true;
}
function isHard(state) {
  let nonEmptyTubes = state.filter(tube => tube.length > 0);
  let allDiverse = nonEmptyTubes.every(tube => tubeHasAtLeastNDistinctColors(tube, 3));
  let noLargeBlocks = nonEmptyTubes.every(tube => tubeHasNoLargeMonoBlocks(tube, 2));
  return allDiverse && noLargeBlocks;
}

// Extract level 21 as template
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
const keepCount = 29; // Keep 0-28, replace 29+
const newCount = levels.length - keepCount;
const template = levels[21];
const templateTubes = template.tubes.map(tube => [...tube]);
const templateColors = template.colors;
const templateTubeSize = template.tubeSize;
const templateEmptyTubes = template.emptyTubes;
const colorList = [
  '#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#ff8a65', '#4db6ac', '#a1887f', '#f06292', '#90a4ae', '#ffb74d', '#90caf9', '#f8bbd0', '#b0bec5'
];

function generateLevel21Style({levelIdx, extraColors, extraTubes}) {
  // 1. Copy template tubes
  let tubes = templateTubes.map(tube => [...tube]);
  // 2. Add extra tubes (empty)
  for (let i = 0; i < extraTubes; i++) tubes.push([]);
  // 3. Add new colors, distribute segments into tubes in a mixed way
  let usedColors = colorList.slice(0, templateColors + extraColors);
  let tubeSize = templateTubeSize;
  // For each new color, distribute its segments across tubes
  for (let c = templateColors; c < templateColors + extraColors; c++) {
    let color = colorList[c % colorList.length];
    // Distribute segments: put 1 in each tube, then shuffle
    let indices = Array.from({length: tubes.length}, (_, i) => i);
    shuffle(indices);
    for (let j = 0; j < tubeSize; j++) {
      tubes[indices[j % indices.length]].push(color);
    }
  }
  // 4. Shuffle tubes slightly for variety
  shuffle(tubes);
  // 5. Add empty tubes
  let emptyTubes = templateEmptyTubes;
  for (let i = 0; i < emptyTubes; i++) tubes.push([]);
  // 6. Optionally add frozen/one-color tubes
  const tubeCount = tubes.length;
  let frozenTubes = [];
  let oneColorInTubes = [];
  if (Math.random() < 0.5) {
    frozenTubes = pickRandomIndices(randomInt(1, 2), tubeCount);
    // Enforce frozen tube rule: empty or mono-color, not full
    for (const idx of frozenTubes) {
      if (tubes[idx].length === 0) continue;
      const color = tubes[idx][0];
      const fillCount = randomInt(1, tubeSize - 1);
      tubes[idx] = Array(fillCount).fill(color);
    }
  }
  if (Math.random() < 0.5) {
    oneColorInTubes = pickRandomIndices(randomInt(1, 2), tubeCount, frozenTubes);
  }
  // 7. Shuffle inside tubes for more mixing
  for (let t of tubes) shuffle(t);
  // 8. Return level object
  return {
    colors: templateColors + extraColors,
    tubeSize,
    emptyTubes,
    shuffleMoves: 0,
    minMoves: 0,
    tubes,
    frozenTubes,
    oneColorInTubes
  };
}

const newLevels = [];
for (let i = 0; i < newCount; i++) {
  const levelIdx = keepCount + i;
  // Increase difficulty: every 2 levels, add a color and tube
  const extraColors = Math.floor((levelIdx - 29) / 2) + 1;
  const extraTubes = extraColors;
  let level = generateLevel21Style({levelIdx, extraColors, extraTubes});
  newLevels.push(level);
  console.log(`Generated level ${levelIdx}: colors=${level.colors}, tubeSize=${level.tubeSize}, tubes=${level.tubes.length}, emptyTubes=${level.emptyTubes}`);
}
const outLevels = levels.slice(0, keepCount).concat(newLevels);
fs.writeFileSync(levelsPath, JSON.stringify(outLevels, null, 2));
console.log(`Replaced ${newCount} levels after 28 with level-21-style, increasingly challenging levels.`); 