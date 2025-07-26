# 🎮 Magic Sort Puzzle Game

A challenging and addictive tube sorting puzzle game built with React and TypeScript. Sort colored liquids into tubes so each tube contains only one color!

## 🌐 **Play Now!**
**🎯 Live Game: https://victor2005.github.io/magic-sort-game**

## ✨ **Latest Features (v2.0)**

### 🧠 **Intelligent Hint System**
- **Smart move suggestions** with strategic reasoning
- **Dead end detection** - warns when state is unsolvable
- **Move prioritization** - suggests completing tubes first
- **Visual feedback** with emojis and color-coded hints
- **Helpful tips** for lower-scoring moves

### 🎯 **100 Levels of Progressive Difficulty**
- **Levels 1-3**: Simple beginner levels (3-4 colors, no special tubes)
- **Levels 4-27**: Standard puzzle levels
- **Levels 28+**: Advanced levels with special mechanics
- **Levels 40+**: One-color tubes with mixed colors for extra challenge
- **Levels 41+**: Frozen tubes that can't be poured out

### 🔧 **Game Balance Improvements**
- ✅ **Fixed unsolvable Level 30** with proper color distribution
- ✅ **Eliminated frozen tube conflicts** (no duplicate colors)
- ✅ **Minimal empty tubes** (1 per level) for better challenge
- ✅ **Perfect color distribution** across all levels
- ✅ **Progressive difficulty curve** for all skill levels

### 🎮 **Enhanced User Experience**
- 🌙 **Dark/Light theme toggle** (Ctrl/Cmd+T)
- 📊 **Progress tracking** and best scores
- 🔄 **Undo functionality** with move history
- 🎉 **Victory animations** and new record celebrations
- 💡 **Contextual hints** that adapt to game state

## 🎯 **How to Play**

1. **Objective**: Sort colored liquids so each tube contains only one color
2. **Rules**: 
   - Pour liquids between tubes
   - Only pour onto matching colors or empty tubes
   - Each tube can hold up to the specified capacity
   - Some tubes are "frozen" (can't pour out) or "one-color" (restricted)

3. **Special Tubes**:
   - 🔒 **Frozen Tubes**: Can't pour liquid out, but can receive liquid
   - 🎯 **One-Color Tubes**: Can only receive a specific color

## 🚀 **Technical Features**

- **React 19** with TypeScript
- **Framer Motion** for smooth animations
- **React Confetti** for victory celebrations
- **Local Storage** for saving progress and best scores
- **Responsive Design** for all devices
- **GitHub Pages** deployment

## 🎨 **Game Mechanics**

### **Color Distribution**
- Each color appears exactly `tubeSize` times across all tubes
- Perfect mathematical balance ensures all levels are solvable
- Progressive difficulty with increasing colors and tube sizes

### **Level Design**
- **Early levels**: Simple, perfect for learning
- **Mid levels**: Introduce special tube mechanics
- **Advanced levels**: Complex puzzles with multiple constraints
- **Master levels**: Ultimate challenge with 4 frozen tubes

### **Hint System Intelligence**
- Detects unsolvable states and dead ends
- Prioritizes moves that complete tubes
- Provides strategic reasoning for suggestions
- Adapts to current game state

## 🏆 **Achievements**

- Complete all 100 levels
- Beat your best scores
- Master the advanced mechanics
- Solve the most challenging puzzles

## 🔧 **Development**

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## 📈 **Recent Updates**

### v2.0 (Latest)
- 🧠 Enhanced intelligent hint system
- 🎯 Fixed unsolvable Level 30
- 🔧 Expanded to 100 levels with progressive difficulty
- 🌙 Dark/Light theme toggle
- 📊 Improved user experience and feedback

### v1.0
- 🎮 Basic tube sorting gameplay
- 🔒 Frozen tube mechanics
- 🎯 One-color tube restrictions
- 📱 Responsive design

## 🤝 **Contributing**

Feel free to contribute by:
- Reporting bugs
- Suggesting new features
- Creating new levels
- Improving the hint system

## 📄 **License**

This project is open source and available under the MIT License.

---

**🎮 Ready to challenge your mind? Play now at: https://victor2005.github.io/magic-sort-game**
