/**
 * Sokoban Game - Core Engine (app_core.js)
 * Manages game state, levels loading, movement logic, history, and persistence.
 * Line limit checked: ~330 lines (target: < 500 lines)
 */

class SokobanGame {
  constructor() {
    // 关卡集数据
    this.levelSets = typeof SOKOBAN_LEVEL_SETS !== 'undefined' ? SOKOBAN_LEVEL_SETS : { "Warmup": [] };
    this.currentSetName = this.getSavedSetName();
    this.levels = this.levelSets[this.currentSetName] || [];
    this.levelIndex = 0;
    
    // 初始化多语言与主题状态
    this.currentLang = localStorage.getItem('sokoban_lang') || this.detectLanguage();
    this.currentTheme = localStorage.getItem('sokoban_theme') || 'classic';
    
    // 当前关卡动态状态
    this.board = [];          // 2D 数组，存储静态内容 ('#': 墙, '.': 目标, ' ': 地板, 'x': 外部空白)
    this.player = { r: 0, c: 0 }; // 玩家坐标
    this.boxes = [];          // 2D 数组，存储箱子是否存在 (布尔值)
    this.facing = 'left';     // 玩家朝向 ('left', 'right', 'up', 'down')
    this.rows = 0;
    this.cols = 0;
    
    // 计数器与计时器
    this.steps = 0;
    this.pushes = 0;
    this.timer = 0;
    this.timerInterval = null;
    
    // 撤销/重做栈
    this.history = [];        // 存储历史状态
    this.redoStack = [];      // 存储重做状态
    
    // 设置
    this.isMuted = false;
    this.isSolved = false;
    
    // 用户进度数据 (从 LocalStorage 读取)
    this.progress = this.loadProgress();

    // 音效合成器 (SokobanAudio 实例)
    this.audio = new SokobanAudio();

    // DOM 元素引用与事件绑定均在 app_ui.js 中实现扩展
    this.initDOMReferences();
    this.bindEvents();
    
    // 加载初始关卡
    this.loadLevel(this.getSavedLevelIndex());
    // 翻译并刷新 UI
    this.updateUILanguage();
  }

  // 获取保存的关卡集名称
  getSavedSetName() {
    try {
      const savedSet = localStorage.getItem('sokoban_current_set_name');
      if (savedSet && this.levelSets[savedSet]) {
        return savedSet;
      }
    } catch (e) {}
    return "Warmup";
  }

  saveCurrentSetName() {
    try {
      localStorage.setItem('sokoban_current_set_name', this.currentSetName);
    } catch (e) {}
  }

  // 语言检测
  detectLanguage() {
    const navLang = navigator.language || navigator.userLanguage;
    if (!navLang) return "zh-CN";
    const lang = navLang.toLowerCase();
    if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk") || lang.startsWith("zh-mo")) {
      return "zh-TW";
    }
    if (lang.startsWith("zh")) {
      return "zh-CN";
    }
    if (lang.startsWith("es")) {
      return "es";
    }
    if (lang.startsWith("ja")) {
      return "ja";
    }
    if (lang.startsWith("ko")) {
      return "ko";
    }
    return "en";
  }

  // 翻译函数
  t(key, variables = {}) {
    const lang = this.currentLang || "zh-CN";
    let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS["zh-CN"]?.[key] || key;
    for (const varKey in variables) {
      text = text.replace(`{${varKey}}`, variables[varKey]);
    }
    return text;
  }

  // 本地进度存储
  loadProgress() {
    try {
      const baseProgress = {
        "Warmup": { completed: [], bests: {} },
        "Simplified": { completed: [], bests: {} },
        "Microban": { completed: [], bests: {} },
        "Minicosmos": { completed: [], bests: {} }
      };

      const saved = localStorage.getItem('sokoban_progress_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const key in baseProgress) {
          if (!parsed[key]) {
            parsed[key] = { completed: [], bests: {} };
          }
        }
        return parsed;
      }

      const oldSaved = localStorage.getItem('sokoban_progress_v1');
      if (oldSaved) {
        const oldData = JSON.parse(oldSaved);
        if (oldData.completed && oldData.bests) {
          baseProgress["Microban"].completed = oldData.completed;
          baseProgress["Microban"].bests = oldData.bests;
        }
      }
      return baseProgress;
    } catch (e) {
      console.error("Failed to load progress from localStorage", e);
      return {
        "Warmup": { completed: [], bests: {} },
        "Simplified": { completed: [], bests: {} },
        "Microban": { completed: [], bests: {} },
        "Minicosmos": { completed: [], bests: {} }
      };
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('sokoban_progress_v2', JSON.stringify(this.progress));
    } catch (e) {
      console.error("Failed to save progress to localStorage", e);
    }
  }

  getSavedLevelIndex() {
    try {
      const savedIdx = localStorage.getItem('sokoban_current_level_idx_' + this.currentSetName);
      if (savedIdx !== null) {
        const val = parseInt(savedIdx);
        if (val >= 0 && val < this.levels.length) {
          return val;
        }
      }
    } catch (e) {}
    return 0;
  }

  saveCurrentLevelIndex() {
    try {
      localStorage.setItem('sokoban_current_level_idx_' + this.currentSetName, this.levelIndex);
    } catch (e) {}
  }

  getLevelTitle(levelData) {
    if (!levelData) return '';
    
    // 1. 如果是 Warmup 关卡，尝试翻译关卡名字
    if (this.currentSetName === 'Warmup') {
      const translationKey = `level_warmup_${levelData.level}`;
      const translated = this.t(translationKey);
      if (translated && translated !== translationKey) {
        return translated;
      }
    }
    
    // 2. 如果是 Simplified 关卡，将 " (已简化)" 翻译成对应语言
    if (this.currentSetName === 'Simplified' && levelData.title) {
      const suffix = this.t('simplified_suffix');
      return levelData.title.replace(' (已简化)', suffix);
    }
    
    return levelData.title || this.t('level_title_format', { num: levelData.level });
  }

  // 加载关卡
  loadLevel(index) {
    if (index < 0 || index >= this.levels.length) return;
    
    this.levelIndex = index;
    this.saveCurrentLevelIndex();
    if (this.levelSelect) {
      this.levelSelect.value = index;
    }

    const levelData = this.levels[index];
    if (this.levelTitle) {
      this.levelTitle.textContent = this.getLevelTitle(levelData);
    }
    
    // 初始化数值
    this.steps = 0;
    this.pushes = 0;
    this.isSolved = false;
    this.facing = 'left';
    this.history = [];
    this.redoStack = [];
    this.updateStatsUI();
    this.updateHistoryButtons();
    
    // 加载最佳纪录显示
    this.displayBestScores();

    // 解析地图网格
    const mapStrings = levelData.map;
    this.rows = mapStrings.length;
    this.cols = Math.max(...mapStrings.map(s => s.length));

    // 1. 初始化空背景和初始玩家、箱子位置
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill('x')); // 'x' 代表外部空白
    this.boxes = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    
    let tempPlayer = { r: 0, c: 0 };
    
    for (let r = 0; r < this.rows; r++) {
      const rowStr = mapStrings[r];
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (char === '#') {
          this.board[r][c] = '#';
        } else if (char === '.') {
          this.board[r][c] = '.';
        } else if (char === '$') {
          this.boxes[r][c] = true;
          this.board[r][c] = ' ';
        } else if (char === '*') {
          this.boxes[r][c] = true;
          this.board[r][c] = '.';
        } else if (char === '@') {
          tempPlayer = { r, c };
          this.board[r][c] = ' ';
        } else if (char === '+') {
          tempPlayer = { r, c };
          this.board[r][c] = '.';
        } else if (char === ' ') {
          this.board[r][c] = ' ';
        }
      }
    }

    this.player = tempPlayer;

    // 2. 泛洪填充算法 (Flood Fill) 区分地板内部和外部空白
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const queue = [ { r: this.player.r, c: this.player.c } ];
    visited[this.player.r][this.player.c] = true;

    while (queue.length > 0) {
      const curr = queue.shift();
      if (this.board[curr.r][curr.c] === 'x') {
        this.board[curr.r][curr.c] = ' ';
      }

      const neighbors = [
        { r: curr.r - 1, c: curr.c },
        { r: curr.r + 1, c: curr.c },
        { r: curr.r, c: curr.c - 1 },
        { r: curr.r, c: curr.c + 1 }
      ];

      for (const next of neighbors) {
        if (next.r >= 0 && next.r < this.rows && next.c >= 0 && next.c < this.cols) {
          if (!visited[next.r][next.c] && this.board[next.r][next.c] !== '#') {
            visited[next.r][next.c] = true;
            queue.push(next);
          }
        }
      }
    }

    // 重新渲染画布
    this.renderBoard();
    
    // 重置并启动计时器
    this.startTimer();
  }

  // 移动玩家主逻辑
  movePlayer(dr, dc, dirName) {
    if (this.isSolved) return;

    this.facing = dirName;

    const targetR = this.player.r + dr;
    const targetC = this.player.c + dc;

    if (targetR < 0 || targetR >= this.rows || targetC < 0 || targetC >= this.cols) return;

    const targetType = this.board[targetR][targetC];
    
    if (targetType === '#' || targetType === 'x') {
      this.renderBoard();
      return;
    }

    const hasBox = this.boxes[targetR][targetC];

    if (hasBox) {
      const pushR = targetR + dr;
      const pushC = targetC + dc;

      if (pushR < 0 || pushR >= this.rows || pushC < 0 || pushC >= this.cols) return;

      const pushType = this.board[pushR][pushC];
      const pushHasBox = this.boxes[pushR][pushC];

      if (pushType === '#' || pushType === 'x' || pushHasBox) {
        this.renderBoard();
        return;
      }

      this.pushToHistory();

      this.boxes[targetR][targetC] = false;
      this.boxes[pushR][pushC] = true;

      this.player.r = targetR;
      this.player.c = targetC;

      this.steps++;
      this.pushes++;
      
      this.audio.playSound('push');
    } 
    else {
      this.pushToHistory();

      this.player.r = targetR;
      this.player.c = targetC;

      this.steps++;
      
      this.audio.playSound('walk');
    }

    this.renderBoard();
    this.updateStatsUI();
    this.redoStack = [];
    this.updateHistoryButtons();
    this.checkVictory();
  }

  movePlayerInDirection(dir) {
    if (dir === 'up') this.movePlayer(-1, 0, 'up');
    else if (dir === 'down') this.movePlayer(1, 0, 'down');
    else if (dir === 'left') this.movePlayer(0, -1, 'left');
    else if (dir === 'right') this.movePlayer(0, 1, 'right');
  }

  checkVictory() {
    let allOnGoal = true;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === '.' && !this.boxes[r][c]) {
          allOnGoal = false;
          break;
        }
      }
      if (!allOnGoal) break;
    }

    if (allOnGoal) {
      this.levelSolved();
    }
  }

  levelSolved() {
    this.isSolved = true;
    this.stopTimer();
    this.audio.playSound('victory');

    const currentBest = this.progress[this.currentSetName].bests[this.levelIndex] || {};
    let isNewBestSteps = false;
    let isNewBestPushes = false;
    let isNewBestTime = false;

    if (!currentBest.steps || this.steps < currentBest.steps) {
      currentBest.steps = this.steps;
      isNewBestSteps = true;
    }
    if (!currentBest.pushes || this.pushes < currentBest.pushes) {
      currentBest.pushes = this.pushes;
      isNewBestPushes = true;
    }
    if (!currentBest.time || this.timer < currentBest.time) {
      currentBest.time = this.timer;
      isNewBestTime = true;
    }

    if (!this.progress[this.currentSetName].completed.includes(this.levelIndex)) {
      this.progress[this.currentSetName].completed.push(this.levelIndex);
    }
    
    this.progress[this.currentSetName].bests[this.levelIndex] = currentBest;
    this.saveProgress();

    this.displayBestScores();

    setTimeout(() => {
      this.showVictoryModal(isNewBestSteps, isNewBestPushes, isNewBestTime);
    }, 300);
  }

  pushToHistory() {
    const boxesCopy = this.boxes.map(row => [...row]);
    this.history.push({
      player: { r: this.player.r, c: this.player.c },
      boxes: boxesCopy,
      facing: this.facing,
      steps: this.steps,
      pushes: this.pushes
    });
  }

  undo() {
    if (this.history.length === 0 || this.isSolved) return;

    const boxesCopy = this.boxes.map(row => [...row]);
    this.redoStack.push({
      player: { r: this.player.r, c: this.player.c },
      boxes: boxesCopy,
      facing: this.facing,
      steps: this.steps,
      pushes: this.pushes
    });

    const prev = this.history.pop();
    this.player = prev.player;
    this.boxes = prev.boxes;
    this.facing = prev.facing;
    this.steps = prev.steps;
    this.pushes = prev.pushes;

    this.audio.playSound('undo');
    this.renderBoard();
    this.updateStatsUI();
    this.updateHistoryButtons();
  }

  redo() {
    if (this.redoStack.length === 0 || this.isSolved) return;

    const boxesCopy = this.boxes.map(row => [...row]);
    this.history.push({
      player: { r: this.player.r, c: this.player.c },
      boxes: boxesCopy,
      facing: this.facing,
      steps: this.steps,
      pushes: this.pushes
    });

    const next = this.redoStack.pop();
    this.player = next.player;
    this.boxes = next.boxes;
    this.facing = next.facing;
    this.steps = next.steps;
    this.pushes = next.pushes;

    this.audio.playSound('walk');
    this.renderBoard();
    this.updateStatsUI();
    this.updateHistoryButtons();
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  changeLevel(offset) {
    const nextIdx = this.levelIndex + offset;
    if (nextIdx >= 0 && nextIdx < this.levels.length) {
      this.loadLevel(nextIdx);
    }
  }

  // 切换关卡集
  changeLevelSet(setName) {
    if (!this.levelSets[setName]) return;
    this.currentSetName = setName;
    this.saveCurrentSetName();
    this.levels = this.levelSets[setName];
    
    if (this.setBadge) {
      this.setBadge.textContent = this.t('level_badge_' + setName);
    }
    this.populateLevelSelect();
    
    this.loadLevel(this.getSavedLevelIndex());
  }

  // 计时器控制
  startTimer() {
    this.stopTimer();
    this.timer = 0;
    if (this.timerVal) {
      this.timerVal.textContent = "00:00";
    }
    
    this.timerInterval = setInterval(() => {
      this.timer++;
      if (this.timerVal) {
        this.timerVal.textContent = this.formatTime(this.timer);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
