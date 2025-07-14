import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import levelsData from "./levels.json";

// Type definitions for level data
interface OneColorRestriction {
  tubeIndex: number;
  color: string;
}

interface LevelData {
  colors: number;
  tubeSize: number;
  emptyTubes: number;
  tubes: string[][];
  frozenTubes: number[];
  oneColorInTubes: OneColorRestriction[];
  minMoves?: number;
  actualMoves?: number;
  shuffleMoves?: number;
}

// Load pre-generated levels
const LEVELS: LevelData[] = levelsData as LevelData[];

function isSolved(tubes: string[][], tubeSize: number): boolean {
  return tubes.every(
    (tube) => tube.length === 0 || (tube.length === tubeSize && tube.every((c) => c === tube[0]))
  );
}

function hasPossibleMove(tubes: string[][], tubeSize: number, frozenTubes: number[] = [], oneColorInTubes: OneColorRestriction[] = []): boolean {
  for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
    const from = tubes[fromIdx];
    if (from.length === 0) continue;
    
    // Check if source tube is frozen - can't pour OUT of frozen tubes
    if (frozenTubes.includes(fromIdx)) continue;
    
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
      
      // Check one-color restrictions
      const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === toIdx);
      if (oneColorRestriction && oneColorRestriction.color !== color) continue;
      
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

// Get level data directly from pre-generated levels
function getLevelData(levelIdx: number): LevelData {
  return LEVELS[levelIdx];
}

// Best scores management
function getBestScore(level: number): number | null {
  const stored = localStorage.getItem(`tubeSort_best_${level}`);
  return stored ? parseInt(stored) : null;
}

function setBestScore(level: number, moves: number): void {
  localStorage.setItem(`tubeSort_best_${level}`, moves.toString());
}

const TubeSortGame: React.FC = () => {
  const [level, setLevel] = useState(0);
  const [tubes, setTubes] = useState<string[][]>(() => cloneTubes(LEVELS[0].tubes));
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [showFinalWin, setShowFinalWin] = useState(false);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScoreState] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const [history, setHistory] = useState<string[][][]>([]);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('tubeSort_theme');
    return saved === 'dark';
  });
  
  // For liquid flow animation
  const [animatingPour] = useState<null | { from: number, to: number, color: string, count: number }>(null);
  const tubesRowRef = useRef<HTMLDivElement>(null);

  // Load best score when level changes
  useEffect(() => {
    setBestScoreState(getBestScore(level));
  }, [level]);

  // Apply theme to body and save preference
  useEffect(() => {
    document.body.className = isDarkTheme ? 'dark-theme' : 'light-theme';
    localStorage.setItem('tubeSort_theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  // Keyboard shortcut for theme toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        setIsDarkTheme(!isDarkTheme);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isDarkTheme]);

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
    const levelData = getLevelData(level);
    const newTubes = cloneTubes(levelData.tubes);
    setTubes(newTubes);
    setSelected(null);
    setWon(false);
    setStuck(false);
    setHint(null);
    setShowWin(false);
    setShowFinalWin(false);
    setMoves(0);
    setNewRecord(false);
    setHistory([cloneTubes(newTubes)]);
  };

  const nextLevel = () => {
    if (level < LEVELS.length - 1) {
      setLevel(lvl => {
        const newLevel = lvl + 1;
        const levelData = getLevelData(newLevel);
        const newTubes = cloneTubes(levelData.tubes);
        setTubes(newTubes);
        setSelected(null);
        setWon(false);
        setStuck(false);
        setHint(null);
        setShowWin(false);
        setShowFinalWin(false);
        setMoves(0);
        setNewRecord(false);
        setHistory([cloneTubes(newTubes)]);
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
        const levelData = getLevelData(newLevel);
        const newTubes = cloneTubes(levelData.tubes);
        setTubes(newTubes);
        setSelected(null);
        setWon(false);
        setStuck(false);
        setHint(null);
        setShowWin(false);
        setShowFinalWin(false);
        setMoves(0);
        setNewRecord(false);
        setHistory([cloneTubes(newTubes)]);
        return newLevel;
      });
    }
  };

  const undoMove = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setTubes(cloneTubes(newHistory[newHistory.length - 1]));
      setMoves(moves - 1);
      setSelected(null);
      setStuck(false);
      setHint(null);
    }
  };

  const handleTubeClick = (idx: number) => {
    if (won || stuck) return;
    
    setHint(null);
    const currentLevel = LEVELS[level];
    const frozenTubes = currentLevel.frozenTubes || [];
    const oneColorInTubes = currentLevel.oneColorInTubes || [];
    
    if (selected === null) {
      if (tubes[idx].length > 0 && !frozenTubes.includes(idx)) {
        setSelected(idx);
      }
    } else {
      if (selected === idx) {
        setSelected(null);
      } else {
        const from = tubes[selected];
        const to = tubes[idx];
        if (from.length === 0) {
          setSelected(null);
          return;
        }
        
        // Check if target is full
        if (to.length === currentLevel.tubeSize) {
          setSelected(null);
          return;
        }
        
        const color = from[from.length - 1];
        
        // Check if colors match (or target is empty)
        if (to.length > 0 && to[to.length - 1] !== color) {
          setSelected(null);
          return;
        }
        
        // Check one-color restrictions
        const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === idx);
        if (oneColorRestriction && oneColorRestriction.color !== color) {
          setSelected(null);
          return;
        }
        
        // Count consecutive same colors from top
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
        
        const space = currentLevel.tubeSize - to.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = currentLevel.tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);
        
        if (pourCount > 0) {
          // Save current state to history
          setHistory(prev => [...prev, cloneTubes(tubes)]);
          
          // Perform the pour
          const newTubes = tubes.map((tube, i) =>
            i === selected
              ? tube.slice(0, tube.length - pourCount)
              : i === idx
              ? [...tube, ...Array(pourCount).fill(color)]
              : tube
          );
          
          setTubes(newTubes);
          setMoves(prev => prev + 1);
          
          // Check if solved
          if (isSolved(newTubes, currentLevel.tubeSize)) {
            setWon(true);
            setShowWin(true);
            
            // Check for new record
            const currentBest = getBestScore(level);
            if (!currentBest || moves + 1 < currentBest) {
              setBestScore(level, moves + 1);
              setBestScoreState(moves + 1);
              setNewRecord(true);
            }
            
            // Auto-advance to next level after 3 seconds
            setTimeout(() => {
              setShowWin(false);
              nextLevel();
            }, 3000);
          } else {
            // Check if stuck
            const stuck = !hasPossibleMove(newTubes, currentLevel.tubeSize, frozenTubes, oneColorInTubes);
            setStuck(stuck);
          }
        }
        
        setSelected(null);
      }
    }
  };

  const handleHint = () => {
    const currentLevel = LEVELS[level];
    const frozenTubes = currentLevel.frozenTubes || [];
    const oneColorInTubes = currentLevel.oneColorInTubes || [];

    let possibleMoveFound = false;
    for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
      const from = tubes[fromIdx];
      if (from.length === 0) continue;
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
        if (to.length === currentLevel.tubeSize) continue;
        if (to.length > 0 && to[to.length - 1] !== color) continue;

        const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === toIdx);
        if (oneColorRestriction && oneColorRestriction.color !== color) continue;

        let targetColorCount = 0;
        for (let i = 0; i < to.length; i++) {
          if (to[i] === color) targetColorCount++;
        }

        const space = currentLevel.tubeSize - to.length;
        const maxPourForSpace = Math.min(count, space);
        const maxPourForColor = currentLevel.tubeSize - targetColorCount;
        const pourCount = Math.min(maxPourForSpace, maxPourForColor);

        if (pourCount > 0) {
          setHint(`Try pouring from tube ${fromIdx + 1} to tube ${toIdx + 1}`);
          possibleMoveFound = true;
          break;
        }
      }
      if (possibleMoveFound) break;
    }

    if (!possibleMoveFound) {
      setHint("Try again, no possible move");
    }
  };

  // Initialize history on first render
  useEffect(() => {
    if (history.length === 0) {
      setHistory([cloneTubes(tubes)]);
    }
  }, [tubes, history.length]);

  return (
    <div className="game-container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <h1>Tube Sort Puzzle</h1>
        <button 
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          title={`Toggle theme (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+T)`}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: isDarkTheme ? '#f5f5f5' : '#333',
            color: isDarkTheme ? '#333' : '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          {isDarkTheme ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
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
      
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        gap: '20px', 
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1976d2' }}>
          Moves: {moves}
        </div>
        {bestScore && (
          <div style={{ fontSize: '0.9rem', color: '#388e3c' }}>
            Best: {bestScore}
          </div>
        )}
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
        {level >= 28 && (
          <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            {' '}• Special tubes: 🔒 Frozen, 🎯 One-color
          </span>
        )}
      </div>
      
      <div className="tubes-row" ref={tubesRowRef}>
        {tubes.map((tube, idx) => {
          const currentLevel = LEVELS[level];
          const frozenTubes = currentLevel.frozenTubes || [];
          const oneColorInTubes = currentLevel.oneColorInTubes || [];
          
          const isFrozen = frozenTubes.includes(idx);
          const oneColorRestriction = oneColorInTubes.find(r => r.tubeIndex === idx);
          const isOneColor = !!oneColorRestriction && !!oneColorRestriction.color;
          
          let tubeClass = `tube${selected === idx ? " selected" : ""}`;
          if (isFrozen) tubeClass += " frozen";
          if (isOneColor) tubeClass += " one-color";
          
          return (
            <div key={idx} className="tube-container">
              <div
                className={tubeClass}
            onClick={() => handleTubeClick(idx)}
                style={isOneColor ? {
                  borderColor: oneColorRestriction.color,
                  boxShadow: `0 0 0 2px ${oneColorRestriction.color}, 0 4px 16px ${oneColorRestriction.color}30`,
                  background: `linear-gradient(135deg, ${oneColorRestriction.color}10, ${oneColorRestriction.color}05)`
                } : {}}
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
                          style={{ 
                            background: isOneColor ? `${oneColorRestriction.color}20` : "#eee", 
                            opacity: 0.3 
                          }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
              {/* Tube labels */}
              {(isFrozen || isOneColor) && (
                <div className={`tube-label${isFrozen ? " frozen" : ""}${isOneColor ? " one-color" : ""}`}>
                  {isFrozen && isOneColor ? "🔒🎯" : isFrozen ? "🔒" : "🎯"}
                </div>
              )}
            </div>
          );
        })}
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
      
      <div style={{ marginTop: 24, display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={resetGame}>Reset</button>
        <button onClick={undoMove} disabled={history.length <= 1}>
          Undo ({history.length - 1})
        </button>
        <button onClick={handleHint}>Hint</button>
      </div>
      
      {hint && <div style={{ marginTop: 16, color: '#1976d2', fontWeight: 'bold', background: '#e3f2fd', borderRadius: 8, padding: '8px 18px', boxShadow: '0 2px 8px #bbdefb' }}>{hint}</div>}
      
      {showWin && !showFinalWin && (
        <>
          <Confetti numberOfPieces={newRecord ? 400 : 250} recycle={false} />
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
            color: newRecord ? '#ff6f00' : '#388e3c',
            textShadow: '0 2px 8px #fff',
          }}>
            🎉 {newRecord ? 'New Record!' : 'You Win!'}<br />
            <span style={{ fontSize: '1.2rem', color: '#333', fontWeight: 'normal' }}>
              Completed in {moves} moves
              {newRecord && <span style={{ color: '#ff6f00', fontWeight: 'bold' }}> - New Best!</span>}
            </span><br />
            <span style={{ fontSize: '1rem', color: '#666', fontWeight: 'normal' }}>Next level loading...</span>
          </div>
        </>
      )}
      
      {showFinalWin && (
        <>
          <Confetti numberOfPieces={500} recycle={false} />
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
            <span style={{ fontSize: '1.2rem', color: '#333', fontWeight: 'normal' }}>You finished all {LEVELS.length} levels!</span>
          </div>
        </>
      )}
    </div>
  );
};

export default TubeSortGame;