import React, { useState, useRef } from "react";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

const COLORS = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65", "#4db6ac", "#ffb74d"];

// Level definitions
const LEVELS = [
  { colors: 2, tubeSize: 4, emptyTubes: 2, shuffleMoves: 10, minMoves: 2 },
  { colors: 2, tubeSize: 4, emptyTubes: 2, shuffleMoves: 15, minMoves: 3 },
  { colors: 3, tubeSize: 4, emptyTubes: 1, shuffleMoves: 30, minMoves: 5 },
  { colors: 3, tubeSize: 4, emptyTubes: 2, shuffleMoves: 40, minMoves: 7 },
  { colors: 4, tubeSize: 4, emptyTubes: 2, shuffleMoves: 50, minMoves: 10 },
  { colors: 4, tubeSize: 4, emptyTubes: 2, shuffleMoves: 60, minMoves: 13 },
  { colors: 5, tubeSize: 4, emptyTubes: 2, shuffleMoves: 70, minMoves: 12 },
  { colors: 5, tubeSize: 4, emptyTubes: 2, shuffleMoves: 80, minMoves: 18 },
  { colors: 6, tubeSize: 4, emptyTubes: 2, shuffleMoves: 90, minMoves: 16 },
  { colors: 6, tubeSize: 4, emptyTubes: 2, shuffleMoves: 100, minMoves: 23 },
  { colors: 7, tubeSize: 4, emptyTubes: 2, shuffleMoves: 120, minMoves: 26 },
  { colors: 7, tubeSize: 4, emptyTubes: 2, shuffleMoves: 150, minMoves: 30 },
  // New challenging levels
  { colors: 8, tubeSize: 4, emptyTubes: 2, shuffleMoves: 180, minMoves: 35 },
  { colors: 8, tubeSize: 4, emptyTubes: 3, shuffleMoves: 200, minMoves: 40 },
  { colors: 5, tubeSize: 5, emptyTubes: 2, shuffleMoves: 120, minMoves: 25 },
  { colors: 5, tubeSize: 5, emptyTubes: 3, shuffleMoves: 140, minMoves: 30 },
  { colors: 6, tubeSize: 5, emptyTubes: 2, shuffleMoves: 160, minMoves: 35 },
  { colors: 6, tubeSize: 5, emptyTubes: 3, shuffleMoves: 180, minMoves: 40 },
  { colors: 7, tubeSize: 5, emptyTubes: 2, shuffleMoves: 200, minMoves: 45 },
  { colors: 7, tubeSize: 5, emptyTubes: 3, shuffleMoves: 220, minMoves: 50 },
  { colors: 8, tubeSize: 5, emptyTubes: 2, shuffleMoves: 240, minMoves: 55 },
  { colors: 8, tubeSize: 5, emptyTubes: 3, shuffleMoves: 260, minMoves: 60 },
  { colors: 6, tubeSize: 6, emptyTubes: 2, shuffleMoves: 200, minMoves: 45 },
  { colors: 6, tubeSize: 6, emptyTubes: 3, shuffleMoves: 220, minMoves: 50 },
  { colors: 7, tubeSize: 6, emptyTubes: 2, shuffleMoves: 240, minMoves: 55 },
  { colors: 7, tubeSize: 6, emptyTubes: 3, shuffleMoves: 260, minMoves: 60 },
  { colors: 8, tubeSize: 6, emptyTubes: 2, shuffleMoves: 280, minMoves: 65 },
  { colors: 8, tubeSize: 6, emptyTubes: 3, shuffleMoves: 300, minMoves: 70 },
];

// Simple seeded random number generator
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return function() {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function shuffleSeeded<T>(array: T[], randomFn: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isSolved(tubes: string[][], tubeSize: number): boolean {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

function hasPossibleMove(tubes: string[][], tubeSize: number): boolean {
  for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
    const from = tubes[fromIdx];
    if (from.length === 0) continue;
    const color = from[from.length - 1];  // Check top color
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
      
      // Count how many of the same color are already in the target tube
      let targetColorCount = 0;
      for (let i = 0; i < to.length; i++) {
        if (to[i] === color) targetColorCount++;
      }
      
      const space = tubeSize - to.length;
      const maxPourForSpace = Math.min(count, space);
      const maxPourForColor = tubeSize - targetColorCount;
      const pourCount = Math.min(maxPourForSpace, maxPourForColor);
      
      if (pourCount > 0) {
        return true;
      }
    }
  }
  return false;
}

// Helper to deep copy tubes
function cloneTubes(tubes: string[][]): string[][] {
  return tubes.map(tube => [...tube]);
}

// Helper to serialize tubes for visited set
function serializeTubes(tubes: string[][]): string {
  return tubes.map(tube => tube.join(",")).join("|");
}

// Solver: BFS to find a solution path
function findSolution(tubes: string[][], tubeSize: number): [number, number][] | null {
  const queue: { tubes: string[][], path: [number, number][] }[] = [
    { tubes: cloneTubes(tubes), path: [] }
  ];
  const visited = new Set<string>();
  visited.add(serializeTubes(tubes));

  while (queue.length > 0) {
    const { tubes: currTubes, path } = queue.shift()!;
    // Check for win
    if (isSolved(currTubes, tubeSize)) return path;
    // Try all valid moves
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
        
        // Count how many of the same color are already in the target tube
        let targetColorCount = 0;
        for (let i = 0; i < to.length; i++) {
          if (to[i] === color) targetColorCount++;
        }
        
        const space = tubeSize - to.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);
        
        // Don't pour if it would exceed tube size for the same color
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

function generateLevelTubes(levelIdx: number): string[][] {
  const { colors, tubeSize, emptyTubes, shuffleMoves, minMoves } = LEVELS[levelIdx];
  const colorList = COLORS.slice(0, colors);
  let attempts = 0;
  const seedBase = 12345 + levelIdx * 9999; // Arbitrary constant for uniqueness
  
  while (attempts < 50) { // Increased attempts for better puzzle generation
    // Use a seeded random for this attempt
    const randomFn = seededRandom(seedBase + attempts);
    // Start from solved state
    const tubes: string[][] = colorList.map(color => Array(tubeSize).fill(color));
    for (let i = 0; i < emptyTubes; i++) tubes.push([]);
    let lastMove: [number, number] | null = null;
    
    for (let move = 0; move < shuffleMoves; move++) {
      // Find all possible moves
      const moves: [number, number, number][] = [];
      for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
        const from = tubes[fromIdx];
        if (from.length === 0) continue;
        const color = from[from.length - 1];
        // Count how many of the same color are on top
        let count = 1;
        for (let i = from.length - 2; i >= 0; i--) {
          if (from[i] === color) count++;
          else break;
        }
        for (let toIdx = 0; toIdx < tubes.length; toIdx++) {
          if (fromIdx === toIdx) continue;
          if (lastMove && lastMove[0] === toIdx && lastMove[1] === fromIdx) continue;
          const to = tubes[toIdx];
          if (to.length === tubeSize) continue;
          if (to.length === 0 || to[to.length - 1] === color) {
            // Try all possible pour counts (1 to min(count, space))
            const space = tubeSize - to.length;
            for (let pourCount = 1; pourCount <= Math.min(count, space); pourCount++) {
              moves.push([fromIdx, toIdx, pourCount]);
            }
          }
        }
      }
      if (moves.length === 0) break;
      // Pick a random move using seeded random
      const [fromIdx, toIdx, pourCount] = moves[Math.floor(randomFn() * moves.length)];
      lastMove = [fromIdx, toIdx];
      const from = tubes[fromIdx];
      const to = tubes[toIdx];
      const color = from[from.length - 1];
      tubes[fromIdx] = from.slice(0, from.length - pourCount);
      tubes[toIdx] = [...to, ...Array(pourCount).fill(color)];
    }
    
    // Ensure the puzzle is not solved, is solvable, no tube is full and all one color, and solution is long enough
    const noFullMonoTube = tubes.every(
      tube => tube.length !== tubeSize || tube.some(c => c !== tube[0])
    );
    const solution = findSolution(tubes, tubeSize);
    if (!isSolved(tubes, tubeSize) && solution && noFullMonoTube && solution.length >= minMoves) {
      return tubes.map(tube => [...tube]);
    }
    attempts++;
  }
  
  // If we couldn't generate a good puzzle, create a simple but valid fallback
  const flat: string[] = [];
  for (const color of colorList) {
    for (let i = 0; i < tubeSize; i++) flat.push(color);
  }
  // Shuffle the flat array with seeded random
  const randomFn = seededRandom(seedBase + 999);
  const shuffled = shuffleSeeded(flat, randomFn);
  const fallback: string[][] = [];
  // Distribute into tubes of size tubeSize
  for (let i = 0; i < colorList.length; i++) {
    fallback.push(shuffled.slice(i * tubeSize, (i + 1) * tubeSize));
  }
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) fallback.push([]);
  return fallback;
}

const TubeSortGame: React.FC = () => {
  const [level, setLevel] = useState(0);
  const [tubes, setTubes] = useState<string[][]>(() => generateLevelTubes(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [showFinalWin, setShowFinalWin] = useState(false);
  // For liquid flow animation
  const [animatingPour] = useState<null | { from: number, to: number, color: string, count: number }>(null);
  const tubesRowRef = useRef<HTMLDivElement>(null);

  // Helper to get tube position for animation
  const getTubePos = (idx: number) => {
    if (!tubesRowRef.current) return { x: 0, y: 0 };
    const tubeEls = tubesRowRef.current.querySelectorAll('.tube');
    const tube = tubeEls[idx] as HTMLElement;
    if (!tube) return { x: 0, y: 0 };
    const rect = tube.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + 30 };
  };

  const resetGame = () => {
    setTubes(generateLevelTubes(level));
    setSelected(null);
    setWon(false);
    setStuck(false);
    setHint(null);
    setShowWin(false);
    setShowFinalWin(false);
  };

  const nextLevel = () => {
    if (level < LEVELS.length - 1) {
      setLevel(lvl => {
        const newLevel = lvl + 1;
        setTubes(generateLevelTubes(newLevel));
        setSelected(null);
        setWon(false);
        setStuck(false);
        setHint(null);
        setShowWin(false);
        setShowFinalWin(false);
        return newLevel;
      });
    } else {
      setShowFinalWin(true);
    }
  };

  const prevLevel = () => {
    if (level > 0) {
      setLevel(lvl => {
        const newLevel = lvl - 1;
        setTubes(generateLevelTubes(newLevel));
        setSelected(null);
        setWon(false);
        setStuck(false);
        setHint(null);
        setShowWin(false);
        setShowFinalWin(false);
        return newLevel;
      });
    }
  };

  const handleTubeClick = (idx: number) => {
    if (won || stuck) return;
    if (selected === null) {
      if (tubes[idx].length === 0) return;
      setSelected(idx);
    } else if (selected === idx) {
      setSelected(null);
    } else {
      const from = tubes[selected];
      const to = tubes[idx];
      if (from.length === 0) return;
      if (to.length === LEVELS[level].tubeSize) return;
      const color = from[from.length - 1];
      if (to.length > 0 && to[to.length - 1] !== color) return;
      
      // Count how many of the same color are on top of the source tube
      let count = 1;
      for (let i = from.length - 2; i >= 0; i--) {
        if (from[i] === color) count++;
        else break;
      }
      
      // Count how many of the same color are already in the target tube
      let targetColorCount = 0;
      for (let i = 0; i < to.length; i++) {
        if (to[i] === color) targetColorCount++;
      }
      
      // Calculate how many we can pour without exceeding tube size
      const space = LEVELS[level].tubeSize - to.length;
      const maxPourForSpace = Math.min(count, space);
      const maxPourForColor = LEVELS[level].tubeSize - targetColorCount;
      const pourCount = Math.min(maxPourForSpace, maxPourForColor);
      
      // Don't pour if it would exceed tube size for the same color
      if (pourCount <= 0) return;
      
      const newTubes = tubes.map((tube, i) =>
        i === selected
          ? tube.slice(0, tube.length - pourCount)
          : i === idx
          ? [...tube, ...Array(pourCount).fill(color)]
          : tube
      );
      setTubes(newTubes);
      setSelected(null);
      if (isSolved(newTubes, LEVELS[level].tubeSize)) {
        setWon(true);
        setShowWin(true);
        setTimeout(() => {
          setShowWin(false);
          nextLevel();
        }, 2000);
      } else if (!hasPossibleMove(newTubes, LEVELS[level].tubeSize)) {
        setStuck(true);
      }
    }
  };

  const handleHint = () => {
    const solution = findSolution(tubes, LEVELS[level].tubeSize);
    if (solution && solution.length > 0) {
      const [fromIdx, toIdx] = solution[0];
      setHint(`Try pouring from tube ${fromIdx + 1} to tube ${toIdx + 1}`);
    } else {
      setHint("Try again, no possible move");
    }
  };

  return (
    <div className="game-container">
      <h1>Tube Sort Puzzle</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={prevLevel} disabled={level === 0}>Previous</button>
        <span style={{ margin: '0 16px', fontWeight: 'bold' }}>Level {level + 1}</span>
        <button onClick={nextLevel} disabled={level === LEVELS.length - 1}>Next</button>
      </div>
      <div style={{ 
        marginBottom: 16, 
        fontSize: '0.85rem', 
        color: '#888',
        fontWeight: '500'
      }}>
        Progress: {level + 1} / {LEVELS.length} levels
      </div>
      <p>Pour the colored liquid so each tube contains only one color!</p>
      <div style={{ 
        marginBottom: 16, 
        padding: '8px 16px', 
        background: '#f5f5f5', 
        borderRadius: 8, 
        fontSize: '0.9rem',
        color: '#666'
      }}>
        Level {level + 1}: {LEVELS[level].colors} colors, {LEVELS[level].tubeSize} segments per tube, {LEVELS[level].emptyTubes} empty tube{LEVELS[level].emptyTubes !== 1 ? 's' : ''}
      </div>
      <div className="tubes-row" ref={tubesRowRef}>
        {tubes.map((tube, idx) => (
          <div
            key={idx}
            className={`tube${selected === idx ? " selected" : ""}`}
            onClick={() => handleTubeClick(idx)}
          >
            <div className="tube-inner">
              <AnimatePresence initial={false}>
                {[...Array(LEVELS[level].tubeSize)].map((_, i) => {
                  const color = tube[i];
                  // Hide the moving segment only in the source tube during animation
                  if (
                    animatingPour &&
                    idx === animatingPour.from &&
                    i >= tube.length - animatingPour.count
                  ) {
                    return <div key={i} style={{ height: 20 }} />;
                  }
                  return color ? (
                    <motion.div
                      key={i}
                      className="liquid-segment"
                      style={{ background: color, opacity: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    />
                  ) : (
                    <div
                      key={i}
                      className="liquid-segment"
                      style={{ background: "#eee", opacity: 0.3 }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
        {/* Floating animated segment */}
        {animatingPour && (() => {
          const fromPos = getTubePos(animatingPour.from);
          const toPos = getTubePos(animatingPour.to);
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          return (
            <motion.div
              className="liquid-segment"
              style={{
                position: 'fixed',
                left: fromPos.x,
                top: fromPos.y,
                width: 44,
                zIndex: 3000,
                background: animatingPour.color,
                borderRadius: 10,
                border: '1.5px solid #fff',
                boxShadow: '0 8px 32px 4px rgba(25,118,210,0.18), 0 2px 8px rgba(0,0,0,0.18)'
              }}
              initial={{ x: 0, y: 0, scaleY: 1, opacity: 1 }}
              animate={{ x: dx, y: dy, scaleY: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {Array.from({ length: animatingPour.count }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '100%',
                    height: 20,
                    marginBottom: 1,
                    background: animatingPour.color,
                    borderRadius: 8,
                    border: '1.5px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                  }}
                />
              ))}
            </motion.div>
          );
        })()}
      </div>
      <button onClick={resetGame} style={{ marginTop: 24 }}>Reset</button>
      <button onClick={handleHint} style={{ marginTop: 24, marginLeft: 12 }}>Hint</button>
      {hint && <div style={{ marginTop: 16, color: '#1976d2', fontWeight: 'bold', background: '#e3f2fd', borderRadius: 8, padding: '8px 18px', boxShadow: '0 2px 8px #bbdefb' }}>{hint}</div>}
      {showWin && !showFinalWin && (
        <>
          <Confetti numberOfPieces={250} recycle={false} />
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.95)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#388e3c',
            textShadow: '0 2px 8px #fff',
          }}>
            🎉 You Win!<br />
            <span style={{ fontSize: '1.2rem', color: '#333', fontWeight: 'normal' }}>Next level loading...</span>
          </div>
        </>
      )}
      {showFinalWin && (
        <>
          <Confetti numberOfPieces={400} recycle={false} />
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.97)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1976d2',
            textShadow: '0 2px 8px #fff',
          }}>
            🏆 Congratulations!<br />
            <span style={{ fontSize: '1.2rem', color: '#333', fontWeight: 'normal' }}>You finished all levels!</span>
          </div>
        </>
      )}
    </div>
  );
};

export default TubeSortGame;