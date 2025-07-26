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

// Check if the current state is completely unsolvable (dead end)
function isStateUnsolvable(tubes: string[][], tubeSize: number, frozenTubes: number[] = [], oneColorInTubes: OneColorRestriction[] = []): boolean {
  // If there are no possible moves, it's unsolvable
  if (!hasPossibleMove(tubes, tubeSize, frozenTubes, oneColorInTubes)) {
    return true;
  }
  
  // Check for other unsolvable conditions:
  // 1. Check if any color has more segments than can fit in available tubes
  const colorCounts: { [color: string]: number } = {};
  const availableTubes = tubes.length - frozenTubes.length;
  
  // Count all segments of each color
  tubes.forEach(tube => {
    tube.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  
  // Check if any color has more segments than can fit in available tubes
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > availableTubes * tubeSize) {
      return true; // Impossible to solve
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

// Level completion tracking
function getCompletedLevels(): Set<number> {
  const stored = localStorage.getItem('tubeSort_completed_levels');
  if (!stored) return new Set([0]); // Level 0 is always unlocked
  try {
    const completedArray = JSON.parse(stored);
    return new Set([0, ...completedArray]); // Level 0 is always unlocked
  } catch {
    return new Set([0]);
  }
}

function setCompletedLevel(level: number): void {
  const completedLevels = getCompletedLevels();
  completedLevels.add(level);
  const completedArray = Array.from(completedLevels).filter(l => l !== 0); // Don't store level 0
  localStorage.setItem('tubeSort_completed_levels', JSON.stringify(completedArray));
}

function isLevelUnlocked(level: number): boolean {
  const completedLevels = getCompletedLevels();
  // Level 0 is always unlocked
  if (level === 0) return true;
  // A level is unlocked if the previous level is completed
  return completedLevels.has(level - 1);
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
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(() => getCompletedLevels());
  const [showLevelSelect, setShowLevelSelect] = useState(false);
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
      const nextLevelIndex = level + 1;
      // Only allow navigation to unlocked levels
      if (isLevelUnlocked(nextLevelIndex)) {
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
      }
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

  const selectLevel = (levelIndex: number) => {
    if (isLevelUnlocked(levelIndex)) {
      setLevel(levelIndex);
      const levelData = getLevelData(levelIndex);
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
      setShowLevelSelect(false);
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
            
            // Mark level as completed and unlock next level
            setCompletedLevel(level);
            setCompletedLevels(prev => new Set(Array.from(prev).concat(level)));
            
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

    // First, check if the current state is solvable
    const isCurrentStateSolvable = hasPossibleMove(tubes, currentLevel.tubeSize, frozenTubes, oneColorInTubes);
    const isUnsolvable = isStateUnsolvable(tubes, currentLevel.tubeSize, frozenTubes, oneColorInTubes);
    
    if (!isCurrentStateSolvable) {
      if (isUnsolvable) {
        setHint("🚫 This state is completely unsolvable! You've reached a dead end. Use Undo to go back or Reset to start over.");
      } else {
        setHint("🚫 No moves available - this state cannot be solved. Try using Undo or Reset to try a different approach.");
      }
      return;
    }

    // Find the best move by prioritizing:
    // 1. Moves that complete a tube (fill it to tubeSize with same color)
    // 2. Moves that create a longer sequence of the same color
    // 3. Moves that clear space in tubes with mixed colors
    // 4. Any valid move

    let bestMove = null;
    let bestScore = -1;

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
          // Calculate move score
          let score = 0;
          
          // Bonus for completing a tube
          if (targetColorCount + pourCount === currentLevel.tubeSize) {
            score += 1000; // Highest priority
          }
          
          // Bonus for creating longer sequences
          score += (targetColorCount + pourCount) * 10;
          
          // Bonus for clearing mixed tubes
          if (from.length > count) {
            score += 5; // Clearing mixed content
          }
          
          // Bonus for moving to empty tubes (strategic positioning)
          if (to.length === 0) {
            score += 2;
          }
          
          // Bonus for moving from tubes with mixed colors
          if (from.length > count) {
            score += 3;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMove = { fromIdx, toIdx, color, pourCount, score };
          }
        }
      }
    }

    if (bestMove) {
      const { fromIdx, toIdx, color, pourCount, score } = bestMove;
      
      // Generate helpful hint message based on the move type
      let hintMessage = `Try pouring ${pourCount} segment${pourCount > 1 ? 's' : ''} from tube ${fromIdx + 1} to tube ${toIdx + 1}`;
      
      // Add strategic reasoning
      if (score >= 1000) {
        hintMessage += " - This will complete a tube! 🎯";
      } else if (score >= 100) {
        hintMessage += " - This creates a longer sequence of the same color";
      } else if (score >= 50) {
        hintMessage += " - This helps organize the colors";
      } else {
        hintMessage += " - This is a valid move to progress";
      }
      
      // Add additional strategic advice for lower-scoring moves
      if (score < 50) {
        hintMessage += " 💡 Tip: Focus on completing tubes first, then organizing mixed colors";
      }
      
      setHint(hintMessage);
    } else {
      // This shouldn't happen if isCurrentStateSolvable is true, but just in case
      setHint("No valid moves found. Try a different approach.");
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
        <button 
          onClick={nextLevel} 
          disabled={level === LEVELS.length - 1 || !isLevelUnlocked(level + 1)}
          title={!isLevelUnlocked(level + 1) ? "Complete this level first!" : ""}
        >
          Next {!isLevelUnlocked(level + 1) && level < LEVELS.length - 1 ? "🔒" : ""}
        </button>
        <button 
          onClick={() => setShowLevelSelect(!showLevelSelect)}
          style={{ marginLeft: '12px' }}
          title="Select Level"
        >
          📋 Select Level
        </button>
      </div>
      
      <div style={{ 
        marginBottom: 16, 
        fontSize: '0.85rem', 
        color: '#888',
        fontWeight: '500'
      }}>
        Progress: {completedLevels.size} / {LEVELS.length} levels completed
      </div>
      
      {showLevelSelect && (
        <div style={{
          marginBottom: 16,
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: 12,
          border: '2px solid #e9ecef',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#495057'
          }}>
            📋 Level Selection ({completedLevels.size}/{LEVELS.length} completed)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: '8px'
          }}>
            {Array.from({ length: LEVELS.length }, (_, i) => {
              const isUnlocked = isLevelUnlocked(i);
              const isCompleted = completedLevels.has(i);
              const isCurrent = i === level;
              const bestScore = getBestScore(i);
              
              return (
                <button
                  key={i}
                  onClick={() => selectLevel(i)}
                  disabled={!isUnlocked}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: '2px solid',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    ...(isCurrent ? {
                      background: '#007bff',
                      color: 'white',
                      borderColor: '#0056b3'
                    } : isCompleted ? {
                      background: '#28a745',
                      color: 'white',
                      borderColor: '#1e7e34'
                    } : isUnlocked ? {
                      background: '#6c757d',
                      color: 'white',
                      borderColor: '#545b62'
                    } : {
                      background: '#f8f9fa',
                      color: '#6c757d',
                      borderColor: '#dee2e6'
                    })
                  }}
                  title={`Level ${i + 1}${isCompleted ? ` - Completed${bestScore ? ` (Best: ${bestScore} moves)` : ''}` : isUnlocked ? ' - Available' : ' - Locked'}${isCurrent ? ' - Current' : ''}`}
                >
                  {i + 1}
                  {isCompleted && <span style={{ fontSize: '0.6rem', display: 'block' }}>✓</span>}
                  {isCurrent && <span style={{ fontSize: '0.6rem', display: 'block' }}>▶</span>}
                  {!isUnlocked && <span style={{ fontSize: '0.6rem', display: 'block' }}>🔒</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
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
      
      {hint && (
        <div style={{ 
          marginTop: 16, 
          fontWeight: 'bold', 
          borderRadius: 12, 
          padding: '12px 20px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: '2px solid',
          fontSize: '1rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '16px auto 0',
          ...(hint.includes('🚫') ? {
            color: '#d32f2f',
            background: '#ffebee',
            borderColor: '#f44336'
          } : {
            color: '#1976d2',
            background: '#e3f2fd',
            borderColor: '#2196f3'
          })
        }}>
          💡 <strong>Hint:</strong> {hint}
        </div>
      )}
      
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