const fs = require('fs');

// --- Solver logic ported from App.tsx ---
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}
function cloneTubes(tubes) {
  return tubes.map(tube => [...tube]);
}
function serializeTubes(tubes) {
  return tubes.map(tube => tube.join(",")).join("|");
}
function findSolution(tubes, tubeSize) {
  const queue = [
    { tubes: cloneTubes(tubes), path: [] }
  ];
  const visited = new Set();
  visited.add(serializeTubes(tubes));
  while (queue.length > 0) {
    const { tubes: currTubes, path } = queue.shift();
    if (isSolved(currTubes, tubeSize)) return path;
    for (let fromIdx = 0; fromIdx < currTubes.length; fromIdx++) {
      const from = currTubes[fromIdx];
      if (from.length === 0) continue;
      const color = from[from.length - 1];
      let count = 1;
      for (let i = from.length - 2; i >= 0; i--) {
        if (from[i] === color) count++;
        else break;
      }
      for (let toIdx = 0; toIdx < currTubes.length; toIdx++) {
        if (fromIdx === toIdx) continue;
        const to = currTubes[toIdx];
        if (to.length === tubeSize) continue;
        if (to.length > 0 && to[to.length - 1] !== color) continue;
        let targetColorCount = 0;
        for (let i = 0; i < to.length; i++) {
          if (to[i] === color) targetColorCount++;
        }
        const space = tubeSize - to.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);
        if (pourCount <= 0) continue;
        const newTubes = currTubes.map((tube, i) =>
          i === fromIdx
            ? tube.slice(0, tube.length - pourCount)
            : i === toIdx
            ? [...tube, ...Array(pourCount).fill(color)]
            : tube
        );
        const key = serializeTubes(newTubes);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ tubes: newTubes, path: [...path, [fromIdx, toIdx]] });
        }
      }
    }
  }
  return null;
}

// --- Difficulty modification helpers ---
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
function makeLevelHarder(level) {
  let changed = false;
  // 1. Reduce empty tubes (min 1)
  if (level.emptyTubes > 1 && Math.random() < 0.5) {
    level.emptyTubes--;
    changed = true;
  }
  // 2. Increase colors (max 10)
  if (level.colors < 10 && Math.random() < 0.3) {
    level.colors++;
    changed = true;
  }
  // 3. Increase tube size (max 10)
  if (level.tubeSize < 10 && Math.random() < 0.3) {
    level.tubeSize++;
    changed = true;
  }
  // 4. Add frozen tube
  if (!level.frozenTubes) level.frozenTubes = [];
  if (level.frozenTubes.length < Math.floor(level.tubes.length / 3) && Math.random() < 0.2) {
    let idx;
    do {
      idx = randomInt(0, level.tubes.length - 1);
    } while (level.frozenTubes.includes(idx));
    level.frozenTubes.push(idx);
    changed = true;
  }
  // 5. Add oneColorInTubes
  if (!level.oneColorInTubes) level.oneColorInTubes = [];
  if (level.oneColorInTubes.length < Math.floor(level.tubes.length / 3) && Math.random() < 0.2) {
    let idx;
    do {
      idx = randomInt(0, level.tubes.length - 1);
    } while (level.oneColorInTubes.includes(idx));
    level.oneColorInTubes.push(idx);
    changed = true;
  }
  // 6. Shuffle tubes (except frozen)
  if (Math.random() < 0.5) {
    const nonFrozen = level.tubes.map((tube, i) => ({ tube, i })).filter(x => !level.frozenTubes.includes(x.i));
    const shuffled = shuffle(nonFrozen.map(x => x.tube));
    nonFrozen.forEach((x, idx) => {
      level.tubes[x.i] = shuffled[idx];
    });
    changed = true;
  }
  // 7. Increase shuffleMoves and minMoves
  if (changed) {
    level.shuffleMoves = Math.ceil(level.shuffleMoves * 1.1);
    level.minMoves = Math.ceil(level.minMoves * 1.1);
  }
  return changed;
}

// --- Main script ---
const levelsPath = 'src/levels.json';
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
let changedCount = 0;
for (let i = 29; i < levels.length; i++) {
  const orig = JSON.parse(JSON.stringify(levels[i]));
  if (makeLevelHarder(levels[i])) {
    // Check solvability
    const solution = findSolution(levels[i].tubes, levels[i].tubeSize);
    if (!solution) {
      // Revert if unsolvable
      levels[i] = orig;
    } else {
      changedCount++;
    }
  }
}
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));
console.log(`Made ${changedCount} levels harder (and still solvable).`); 