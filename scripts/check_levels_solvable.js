const fs = require('fs');

function cloneTubes(tubes) {
  return tubes.map(tube => [...tube]);
}
function serializeTubes(tubes) {
  return tubes.map(tube => tube.join(",")).join("|");
}
function isSolved(tubes, tubeSize) {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}
function findSolution(tubes, tubeSize, maxDepth = 1000, debug = false) {
  const queue = [
    { tubes: cloneTubes(tubes), path: [] }
  ];
  const visited = new Set();
  visited.add(serializeTubes(tubes));
  let debugCount = 0;
  while (queue.length > 0) {
    const { tubes: currTubes, path } = queue.shift();
    if (debug && debugCount < 1000) {
      console.log(`[DEBUG] Visited state #${debugCount}: ${serializeTubes(currTubes)} | Path length: ${path.length}`);
      debugCount++;
    }
    if (isSolved(currTubes, tubeSize)) {
      if (debug) console.log('[DEBUG] Solution found!');
      return path;
    }
    if (path.length >= maxDepth) continue;
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
          if (debug && debugCount < 1000) {
            console.log(`[DEBUG] Move: ${fromIdx} -> ${toIdx}, pourCount: ${pourCount}`);
          }
          visited.add(key);
          queue.push({ tubes: newTubes, path: [...path, [fromIdx, toIdx]] });
        }
      }
    }
  }
  if (debug) console.log('[DEBUG] Search ended, no solution found.');
  return null;
}

function heuristic(tubes, tubeSize) {
  // Number of tubes not solved (not all one color or empty)
  return tubes.reduce((acc, tube) => {
    if (tube.length === 0) return acc;
    if (tube.length === tubeSize && tube.every(c => c === tube[0])) return acc;
    return acc + 1;
  }, 0);
}

async function astarFindSolution(tubes, tubeSize, maxDepth = 1000, debug = false) {
  const PriorityQueue = (await import('tinyqueue')).default;
  const queue = new PriorityQueue([], (a, b) => a.f - b.f);
  queue.push({ tubes: cloneTubes(tubes), path: [], g: 0, f: heuristic(tubes, tubeSize) });
  const visited = new Set();
  visited.add(serializeTubes(tubes));
  let debugCount = 0;
  while (queue.length > 0) {
    const { tubes: currTubes, path, g } = queue.pop();
    if (debug && debugCount < 1000) {
      console.log(`[A* DEBUG] Visited state #${debugCount}: ${serializeTubes(currTubes)} | Path length: ${path.length}`);
      debugCount++;
    }
    if (isSolved(currTubes, tubeSize)) {
      if (debug) console.log('[A* DEBUG] Solution found!');
      return path;
    }
    if (path.length >= maxDepth) continue;
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
          if (debug && debugCount < 1000) {
            console.log(`[A* DEBUG] Move: ${fromIdx} -> ${toIdx}, pourCount: ${pourCount}`);
          }
          visited.add(key);
          const gNew = g + 1;
          const hNew = heuristic(newTubes, tubeSize);
          queue.push({ tubes: newTubes, path: [...path, [fromIdx, toIdx]], g: gNew, f: gNew + hNew });
        }
      }
    }
  }
  if (debug) console.log('[A* DEBUG] Search ended, no solution found.');
  return null;
}

// Option to use A* or BFS
const useAstar = process.argv.includes('--astar');

async function main() {
  // Single-level check (default)
  const idx = 8;
  const levels = JSON.parse(fs.readFileSync('src/levels.json', 'utf8'));
  const level = levels[idx];
  console.log(`Level ${idx+1} tubes:`, JSON.stringify(level.tubes));
  const solution = useAstar
    ? await astarFindSolution(level.tubes, level.tubeSize, 1000, true)
    : findSolution(level.tubes, level.tubeSize, 1000, true);
  if (!solution) {
    console.log(`Level ${idx+1} is UNSOLVABLE`);
  } else {
    console.log(`Level ${idx+1} is SOLVABLE. Solution path:`);
    solution.forEach(([from, to], i) => {
      console.log(`Step ${i + 1}: pour from tube ${from} to tube ${to}`);
    });
    console.log(`Total moves: ${solution.length}`);
  }

  // All-levels check
  console.log('\nChecking all levels for solvability...');
  let unsolvable = [];
  for (let i = 0; i < levels.length; i++) {
    const sol = useAstar
      ? await astarFindSolution(levels[i].tubes, levels[i].tubeSize, 1000, false)
      : findSolution(levels[i].tubes, levels[i].tubeSize, 1000, false);
    if (!sol) unsolvable.push(i+1);
  }
  if (unsolvable.length === 0) {
    console.log('All levels are solvable!');
  } else {
    console.log('Unsolvable levels:', unsolvable.join(', '));
  }
}

if (require.main === module) {
  main();
} 