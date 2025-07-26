const fs = require('fs');

// Simulate the level unlocking functions
function getCompletedLevels() {
  const stored = localStorage.getItem('tubeSort_completed_levels');
  if (!stored) return new Set([0]); // Level 0 is always unlocked
  try {
    const completedArray = JSON.parse(stored);
    return new Set([0, ...completedArray]); // Level 0 is always unlocked
  } catch {
    return new Set([0]);
  }
}

function setCompletedLevel(level) {
  const completedLevels = getCompletedLevels();
  completedLevels.add(level);
  const completedArray = Array.from(completedLevels).filter(l => l !== 0); // Don't store level 0
  localStorage.setItem('tubeSort_completed_levels', JSON.stringify(completedArray));
  console.log(`✅ Level ${level} marked as completed`);
  console.log(`📊 Completed levels:`, Array.from(completedLevels));
}

function isLevelUnlocked(level) {
  const completedLevels = getCompletedLevels();
  // Level 0 is always unlocked
  if (level === 0) return true;
  // A level is unlocked if the previous level is completed
  const unlocked = completedLevels.has(level - 1);
  console.log(`🔍 Level ${level} unlocked: ${unlocked} (previous level ${level - 1} completed: ${completedLevels.has(level - 1)})`);
  return unlocked;
}

// Test the system
console.log('🧪 Testing Level Unlocking System (FIXED)...\n');

// Simulate localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
    console.log(`💾 Saved to localStorage: ${key} = ${value}`);
  }
};

console.log('📋 Initial state:');
console.log('Completed levels:', Array.from(getCompletedLevels()));
console.log('Level 0 unlocked:', isLevelUnlocked(0));
console.log('Level 1 unlocked:', isLevelUnlocked(1));
console.log('Level 2 unlocked:', isLevelUnlocked(2));

console.log('\n🎯 Completing Level 0...');
setCompletedLevel(0);

console.log('\n📋 After completing Level 0:');
console.log('Completed levels:', Array.from(getCompletedLevels()));
console.log('Level 0 unlocked:', isLevelUnlocked(0));
console.log('Level 1 unlocked:', isLevelUnlocked(1));
console.log('Level 2 unlocked:', isLevelUnlocked(2));

console.log('\n🎯 Completing Level 1...');
setCompletedLevel(1);

console.log('\n📋 After completing Level 1:');
console.log('Completed levels:', Array.from(getCompletedLevels()));
console.log('Level 0 unlocked:', isLevelUnlocked(0));
console.log('Level 1 unlocked:', isLevelUnlocked(1));
console.log('Level 2 unlocked:', isLevelUnlocked(2));

console.log('\n✅ Test completed!'); 