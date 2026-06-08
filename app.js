/**
 * Sokoban Game - Microban 155 Levels
 * Core game logic, SVG rendering, audio synthesizer, and state persistence.
 */

// translations.js loaded prior to this script defines TRANSLATIONS dictionary

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

    // DOM 元素引用
    this.initDOMReferences();
    // 绑定事件
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

  // 刷新所有 UI 的多语言文本
  updateUILanguage() {
    // 1. 普通文本翻译 (排除包含 HTML 标签的节点)
    const elements = document.querySelectorAll('[data-i18n]:not([data-i18n-html])');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // 2. 富文本翻译 (包含 HTML 标签)
    const htmlElements = document.querySelectorAll('[data-i18n-html]');
    htmlElements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.innerHTML = this.t(key);
      }
    });

    // 3. Tooltip title 翻译
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    // 4. 浏览器标题翻译
    document.title = `${this.t('brand_title')} - Microban 155`;

    // 5. 关卡集下拉菜单翻译
    if (this.setSelect) {
      Array.from(this.setSelect.options).forEach(opt => {
        const val = opt.value;
        const key = `set_${val.toLowerCase()}`;
        opt.textContent = this.t(key);
      });
    }

    // 6. 当前角标翻译
    if (this.setBadge) {
      const key = `level_badge_${this.currentSetName}`;
      this.setBadge.textContent = this.t(key);
    }

    // 7. 当前关卡选择下拉菜单填充
    this.populateLevelSelect();
    if (this.levelSelect) {
      this.levelSelect.value = this.levelIndex;
    }

    // 8. 当前关卡标题卡片翻译
    if (this.levels[this.levelIndex]) {
      const levelData = this.levels[this.levelIndex];
      this.levelTitle.textContent = levelData.title || this.t('level_title_format', { num: levelData.level });
    }

    // 9. 主题下拉菜单翻译
    if (this.themeSelect) {
      Array.from(this.themeSelect.options).forEach(opt => {
        const val = opt.value;
        const key = `theme_${val}`;
        opt.textContent = this.t(key);
      });
    }
  }

  // 初始化 DOM 引用
  initDOMReferences() {
    this.boardContainer = document.getElementById('game-board');
    this.setSelect = document.getElementById('set-select');
    this.levelSelect = document.getElementById('level-select');
    this.levelTitle = document.getElementById('level-title');
    this.setBadge = document.getElementById('set-badge');
    
    this.stepsVal = document.getElementById('steps-count');
    this.pushesVal = document.getElementById('pushes-count');
    this.timerVal = document.getElementById('timer-val');
    
    this.bestStepsVal = document.getElementById('best-steps');
    this.bestPushesVal = document.getElementById('best-pushes');
    this.bestTimeVal = document.getElementById('best-time');
    
    this.prevBtn = document.getElementById('prev-level-btn');
    this.nextBtn = document.getElementById('next-level-btn');
    
    this.undoBtn = document.getElementById('undo-btn');
    this.redoBtn = document.getElementById('redo-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.audioBtn = document.getElementById('audio-toggle-btn');
    this.audioIconUnmuted = document.getElementById('audio-icon-unmuted');
    this.audioIconMuted = document.getElementById('audio-icon-muted');
    
    this.victoryModal = document.getElementById('victory-modal');
    this.victoryLevelName = document.getElementById('victory-level-name');
    this.victorySteps = document.getElementById('victory-steps');
    this.victoryPushes = document.getElementById('victory-pushes');
    this.victoryTime = document.getElementById('victory-time');
    
    this.victoryStepsBadge = document.getElementById('victory-steps-badge');
    this.victoryPushesBadge = document.getElementById('victory-pushes-badge');
    this.victoryTimeBadge = document.getElementById('victory-time-badge');
    
    this.modalReplayBtn = document.getElementById('modal-replay-btn');
    this.modalNextBtn = document.getElementById('modal-next-btn');

    this.langSelect = document.getElementById('lang-select');
    if (this.langSelect) {
      this.langSelect.value = this.currentLang;
    }

    this.themeSelect = document.getElementById('theme-select');
    if (this.themeSelect) {
      this.themeSelect.value = this.currentTheme;
    }

    // 初始化关卡集下拉菜单状态与角标
    if (this.setSelect) {
      this.setSelect.value = this.currentSetName;
    }
    if (this.setBadge) {
      this.setBadge.textContent = this.t('level_badge_' + this.currentSetName);
    }

    // 填充关卡选择下拉菜单
    this.populateLevelSelect();
  }

  // 动态填充关卡选择下拉菜单
  populateLevelSelect() {
    this.levelSelect.innerHTML = '';
    this.levels.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = this.t('level_format', { num: lvl.level, title: lvl.title || 'Sokoban' });
      this.levelSelect.appendChild(opt);
    });
  }

  // 绑定交互事件
  bindEvents() {
    // 语言切换
    if (this.langSelect) {
      this.langSelect.addEventListener('change', (e) => {
        this.currentLang = e.target.value;
        try {
          localStorage.setItem('sokoban_lang', this.currentLang);
        } catch (err) {}
        this.updateUILanguage();
      });
    }

    // 主题切换
    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', (e) => {
        this.currentTheme = e.target.value;
        try {
          localStorage.setItem('sokoban_theme', this.currentTheme);
        } catch (err) {}
        this.renderBoard();
      });
    }

    // 关卡集切换
    if (this.setSelect) {
      this.setSelect.addEventListener('change', (e) => {
        this.changeLevelSet(e.target.value);
      });
    }

    // 关卡切换
    this.levelSelect.addEventListener('change', (e) => {
      this.loadLevel(parseInt(e.target.value));
    });
    this.prevBtn.addEventListener('click', () => this.changeLevel(-1));
    this.nextBtn.addEventListener('click', () => this.changeLevel(1));

    // 控制栏按钮
    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());
    this.restartBtn.addEventListener('click', () => this.restartLevel());
    this.audioBtn.addEventListener('click', () => this.toggleAudio());

    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 移动端虚拟方向盘按钮
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dir = btn.getAttribute('data-dir');
        this.movePlayerInDirection(dir);
      });
    });
    
    // 移动端撤销按钮
    const mobUndo = document.getElementById('mobile-undo-btn');
    if (mobUndo) {
      mobUndo.addEventListener('click', () => this.undo());
    }

    // 弹出框按钮
    this.modalReplayBtn.addEventListener('click', () => {
      this.hideVictoryModal();
      this.restartLevel();
    });
    this.modalNextBtn.addEventListener('click', () => {
      this.hideVictoryModal();
      this.changeLevel(1);
    });

    // 屏幕滑动 (Swipe) 手势识别
    this.setupSwipeGestures();

    // 激活音效解锁监听器（应对现代浏览器安全限制）
    const unlockAudio = () => {
      this.audio.init();
      if (this.audio.audioCtx && this.audio.audioCtx.state === 'suspended') {
        this.audio.audioCtx.resume().then(() => {
          console.log("AudioContext unlocked and running!");
        }).catch(err => {
          console.warn("Failed to resume AudioContext", err);
        });
      }
      // 成功解锁/运行后，移除全局监听
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio, { passive: true });
  }

  // 切换静音
  toggleAudio() {
    this.audio.setMuted(!this.audio.isMuted);
    if (this.audio.isMuted) {
      this.audioIconUnmuted.classList.add('hidden');
      this.audioIconMuted.classList.remove('hidden');
    } else {
      this.audioIconUnmuted.classList.remove('hidden');
      this.audioIconMuted.classList.add('hidden');
      // 顺便激活音效
      this.audio.playSound('walk');
    }
  }

  // 切换关卡集
  changeLevelSet(setName) {
    if (!this.levelSets[setName]) return;
    this.currentSetName = setName;
    this.saveCurrentSetName();
    this.levels = this.levelSets[setName];
    
    // 更新 UI 元素
    if (this.setBadge) {
      this.setBadge.textContent = this.t('level_badge_' + setName);
    }
    this.populateLevelSelect();
    
    // 加载此关卡集的上次进度
    this.loadLevel(this.getSavedLevelIndex());
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
        // 自动补齐缺失的关卡包进度结构，防止报错
        for (const key in baseProgress) {
          if (!parsed[key]) {
            parsed[key] = { completed: [], bests: {} };
          }
        }
        return parsed;
      }

      // 迁移旧 progress v1
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

  // 加载关卡
  loadLevel(index) {
    if (index < 0 || index >= this.levels.length) return;
    
    this.levelIndex = index;
    this.saveCurrentLevelIndex();
    this.levelSelect.value = index;

    const levelData = this.levels[index];
    this.levelTitle.textContent = levelData.title || this.t('level_title_format', { num: levelData.level });
    
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
          this.board[r][c] = ' '; // 静态地板上放置箱子
        } else if (char === '*') {
          this.boxes[r][c] = true;
          this.board[r][c] = '.'; // 目标点上放置箱子
        } else if (char === '@') {
          tempPlayer = { r, c };
          this.board[r][c] = ' '; // 静态地板上放置玩家
        } else if (char === '+') {
          tempPlayer = { r, c };
          this.board[r][c] = '.'; // 目标点上放置玩家
        } else if (char === ' ') {
          this.board[r][c] = ' '; // 地板
        }
      }
    }

    this.player = tempPlayer;

    // 2. 泛洪填充算法 (Flood Fill) 区分地板内部和外部空白
    // 从玩家位置开始（因为玩家一定位于可达的地板范围内），将相连的非墙外部区域 'x' 转换为内部地板 ' '
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const queue = [ { r: this.player.r, c: this.player.c } ];
    visited[this.player.r][this.player.c] = true;

    while (queue.length > 0) {
      const curr = queue.shift();
      
      // 如果原本是 'x'，将其修正为地板 ' '
      if (this.board[curr.r][curr.c] === 'x') {
        this.board[curr.r][curr.c] = ' ';
      }

      // 四方向邻居
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

  // 渲染关卡地图为 SVG 矢量图
  renderBoard() {
    this.boardContainer.innerHTML = '';
    
    const cell_size = 40;
    const width = this.cols * cell_size;
    const height = this.rows * cell_size;

    // 动态拼接 SVG string
    let svgHtml = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- ==================== CLASSIC THEME ==================== -->
          <!-- 1. 墙砖瓦片 (深灰色圆角矩形，内部细分砖缝) -->
          <g id="wall-tile-classic">
            <rect x="0" y="0" width="40" height="40" rx="6" ry="6" fill="#3a3a3a" stroke="#222222" stroke-width="1.5"/>
            <!-- 水平砖缝 -->
            <line x1="0" y1="10" x2="40" y2="10" stroke="#262626" stroke-width="1.5"/>
            <line x1="0" y1="20" x2="40" y2="20" stroke="#262626" stroke-width="1.5"/>
            <line x1="0" y1="30" x2="40" y2="30" stroke="#262626" stroke-width="1.5"/>
            <!-- 垂直砖缝 -->
            <line x1="20" y1="0"  x2="20" y2="10" stroke="#262626" stroke-width="1.5"/>
            <line x1="10" y1="10" x2="10" y2="20" stroke="#262626" stroke-width="1.5"/>
            <line x1="30" y1="10" x2="30" y2="20" stroke="#262626" stroke-width="1.5"/>
            <line x1="20" y1="20" x2="20" y2="30" stroke="#262626" stroke-width="1.5"/>
            <line x1="10" y1="30" x2="10" y2="40" stroke="#262626" stroke-width="1.5"/>
            <line x1="30" y1="30" x2="30" y2="40" stroke="#262626" stroke-width="1.5"/>
            <!-- 瓦片顶部亮光边缘 -->
            <rect x="1.5" y="1.5" width="37" height="37" rx="4" ry="4" fill="none" stroke="#4e4e4e" stroke-width="1" opacity="0.6"/>
          </g>

          <!-- 2. 箱子瓦片 (蓝色，双重边框，中间交叉X) -->
          <g id="box-tile-classic">
            <rect x="2" y="2" width="36" height="36" rx="5" ry="5" fill="#3ca9ff" stroke="#0c63ad" stroke-width="2"/>
            <rect x="5" y="5" width="30" height="30" rx="3" ry="3" fill="none" stroke="#84c8ff" stroke-width="1"/>
            <!-- 对角线 X -->
            <line x1="6" y1="6" x2="34" y2="34" stroke="#0c63ad" stroke-width="2"/>
            <line x1="34" y1="6" x2="6" y2="34" stroke="#0c63ad" stroke-width="2"/>
            <!-- X 内部高亮 -->
            <line x1="7" y1="7" x2="33" y2="33" stroke="#84c8ff" stroke-width="0.8" opacity="0.5"/>
            <line x1="33" y1="7" x2="7" y2="33" stroke="#84c8ff" stroke-width="0.8" opacity="0.5"/>
          </g>

          <!-- 3. 目标红点 -->
          <g id="goal-tile-classic">
            <circle cx="20" cy="20" r="7" fill="#c93b3b" stroke="#a02d2d" stroke-width="1"/>
          </g>

          <!-- 4. 处于目标点上的箱子 (半透明暗蓝灰色，内部红点隐约可见，外覆网格交叉) -->
          <g id="box-on-goal-tile-classic">
            <!-- 底层红点 -->
            <circle cx="20" cy="20" r="7" fill="#c93b3b" stroke="#a02d2d" stroke-width="1"/>
            <!-- 上层半透明箱子 -->
            <rect x="2" y="2" width="36" height="36" rx="5" ry="5" fill="#527c9c" stroke="#233a4c" stroke-width="2" opacity="0.85"/>
            <rect x="5" y="5" width="30" height="30" rx="3" ry="3" fill="none" stroke="#799db8" stroke-width="1" opacity="0.85"/>
            <line x1="6" y1="6" x2="34" y2="34" stroke="#233a4c" stroke-width="2" opacity="0.85"/>
            <line x1="34" y1="6" x2="6" y2="34" stroke="#233a4c" stroke-width="2" opacity="0.85"/>
          </g>

          <!-- 5. 玩家 (黄色安全帽，蓝色背带裤工人) - 4 个朝向 -->
          <!-- 朝下 -->
          <g id="player-down-classic">
            <!-- 身体/衣服 -->
            <path d="M 12 28 C 12 23, 28 23, 28 28 L 27 37 L 13 37 Z" fill="#0d47a1"/>
            <rect x="14" y="25" width="2" height="5" fill="#1565c0"/>
            <rect x="24" y="25" width="2" height="5" fill="#1565c0"/>
            <!-- 头 -->
            <circle cx="20" cy="18" r="7" fill="#ffd54f"/>
            <!-- 脸 -->
            <circle cx="20" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="17.5" cy="20" r="1" fill="#222"/>
            <circle cx="22.5" cy="20" r="1" fill="#222"/>
            <!-- 黄色安全帽 -->
            <path d="M 12 17 C 12 8, 28 8, 28 17 Z" fill="#ffca28"/>
            <path d="M 10 17 L 30 17 A 1 1 0 0 1 30 19 L 10 19 Z" fill="#f57f17"/>
            <rect x="18" y="10" width="4" height="7" fill="#ffe082" opacity="0.4"/>
            <!-- 鞋 -->
            <ellipse cx="15" cy="37" rx="3" ry="1.5" fill="#111"/>
            <ellipse cx="25" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝上 -->
          <g id="player-up-classic">
            <!-- 身体/衣服 -->
            <path d="M 12 28 C 12 23, 28 23, 28 28 L 27 37 L 13 37 Z" fill="#0d47a1"/>
            <!-- 头 (背面发色) -->
            <circle cx="20" cy="18" r="7" fill="#3e2723"/>
            <!-- 黄色安全帽 -->
            <path d="M 12 17 C 12 8, 28 8, 28 17 Z" fill="#ffca28"/>
            <path d="M 11 17 L 29 17 A 1 1 0 0 1 29 19 L 11 19 Z" fill="#f57f17"/>
            <rect x="18" y="10" width="4" height="7" fill="#ffe082" opacity="0.4"/>
            <!-- 鞋 -->
            <ellipse cx="15" cy="37" rx="3" ry="1.5" fill="#111"/>
            <ellipse cx="25" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝左 -->
          <g id="player-left-classic">
            <!-- 身体/衣服 -->
            <path d="M 13 28 C 13 23, 25 23, 25 28 L 24 37 L 14 37 Z" fill="#0d47a1"/>
            <!-- 头 -->
            <circle cx="18" cy="18" r="7" fill="#ffd54f"/>
            <!-- 脸 -->
            <circle cx="18" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="14.5" cy="20" r="1.2" fill="#222"/>
            <!-- 帽沿朝左 -->
            <path d="M 11 17 C 11 8, 26 8, 26 17 Z" fill="#ffca28"/>
            <path d="M 7 17 H 27 V 19 H 7 Z" fill="#f57f17"/>
            <!-- 鼻子/侧脸起伏 -->
            <path d="M 11.5 20 L 10 21.5 L 11.5 23 Z" fill="#ffe0b2"/>
            <!-- 鞋 -->
            <ellipse cx="15" cy="37" rx="3.5" ry="1.5" fill="#111"/>
            <ellipse cx="22" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝右 -->
          <g id="player-right-classic">
            <!-- 身体/衣服 -->
            <path d="M 15 28 C 15 23, 27 23, 27 28 L 26 37 L 16 37 Z" fill="#0d47a1"/>
            <!-- 头 -->
            <circle cx="22" cy="18" r="7" fill="#ffd54f"/>
            <!-- 脸 -->
            <circle cx="22" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="25.5" cy="20" r="1.2" fill="#222"/>
            <!-- 帽沿朝右 -->
            <path d="M 14 17 C 14 8, 29 8, 29 17 Z" fill="#ffca28"/>
            <path d="M 13 17 H 33 V 19 H 13 Z" fill="#f57f17"/>
            <!-- 鼻子 -->
            <path d="M 28.5 20 L 30 21.5 L 28.5 23 Z" fill="#ffe0b2"/>
            <!-- 鞋 -->
            <ellipse cx="18" cy="37" rx="3" ry="1.5" fill="#111"/>
            <ellipse cx="25" cy="37" rx="3.5" ry="1.5" fill="#111"/>
          </g>

          <!-- ==================== CYBER THEME ==================== -->
          <!-- 1. 墙砖瓦片 (深紫色霓虹发光网格) -->
          <g id="wall-tile-cyber">
            <rect x="1" y="1" width="38" height="38" rx="5" ry="5" fill="#0c031c" stroke="#00f0ff" stroke-width="2"/>
            <rect x="5" y="5" width="30" height="30" rx="3" ry="3" fill="none" stroke="#00f0ff" stroke-width="0.8" opacity="0.4"/>
            <circle cx="20" cy="20" r="3" fill="#00f0ff" opacity="0.8"/>
          </g>
          <!-- 2. 箱子瓦片 (霓虹粉高亮，带中间交叉) -->
          <g id="box-tile-cyber">
            <rect x="2" y="2" width="36" height="36" rx="5" ry="5" fill="#180214" stroke="#ff007f" stroke-width="2"/>
            <rect x="5" y="5" width="30" height="30" rx="3" ry="3" fill="none" stroke="#ff007f" stroke-width="1" opacity="0.5"/>
            <line x1="6" y1="6" x2="34" y2="34" stroke="#ff007f" stroke-width="2"/>
            <line x1="34" y1="6" x2="6" y2="34" stroke="#ff007f" stroke-width="2"/>
            <circle cx="20" cy="20" r="4" fill="#ff007f"/>
          </g>
          <!-- 3. 目标绿点 -->
          <g id="goal-tile-cyber">
            <circle cx="20" cy="20" r="9" fill="none" stroke="#00ff66" stroke-width="1.5"/>
            <circle cx="20" cy="20" r="3" fill="#00ff66" opacity="0.8"/>
          </g>
          <!-- 4. 目标点上的箱子 -->
          <g id="box-on-goal-tile-cyber">
            <circle cx="20" cy="20" r="9" fill="none" stroke="#00ff66" stroke-width="1.5"/>
            <rect x="2" y="2" width="36" height="36" rx="5" ry="5" fill="#021408" stroke="#00ff66" stroke-width="2"/>
            <rect x="5" y="5" width="30" height="30" rx="3" ry="3" fill="none" stroke="#00ff66" stroke-width="1" opacity="0.5"/>
            <line x1="6" y1="6" x2="34" y2="34" stroke="#00ff66" stroke-width="2"/>
            <line x1="34" y1="6" x2="6" y2="34" stroke="#00ff66" stroke-width="2"/>
            <circle cx="20" cy="20" r="4" fill="#00ff66"/>
          </g>
          <!-- 5. 玩家机器人 -->
          <g id="player-down-cyber">
            <rect x="12" y="24" width="16" height="11" rx="4" ry="4" fill="#2d0a4e" stroke="#00f0ff" stroke-width="1.5"/>
            <circle cx="20" cy="16" r="8" fill="#18042c" stroke="#00f0ff" stroke-width="1.5"/>
            <rect x="15" y="13" width="10" height="5.5" rx="2.5" ry="2.5" fill="#00e5ff"/>
            <circle cx="18" cy="15.5" r="1.2" fill="#fff"/>
            <circle cx="22" cy="15.5" r="1.2" fill="#fff"/>
            <line x1="20" y1="8" x2="20" y2="5" stroke="#ff007f" stroke-width="1.5"/>
            <circle cx="20" cy="4" r="1.5" fill="#ff007f"/>
            <ellipse cx="15" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
            <ellipse cx="25" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
          </g>
          <g id="player-up-cyber">
            <rect x="12" y="24" width="16" height="11" rx="4" ry="4" fill="#2d0a4e" stroke="#00f0ff" stroke-width="1.5"/>
            <circle cx="20" cy="16" r="8" fill="#2d0a4e" stroke="#00f0ff" stroke-width="1.5"/>
            <line x1="20" y1="8" x2="20" y2="5" stroke="#ff007f" stroke-width="1.5"/>
            <circle cx="20" cy="4" r="1.5" fill="#ff007f"/>
            <ellipse cx="15" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
            <ellipse cx="25" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
          </g>
          <g id="player-left-cyber">
            <rect x="13" y="24" width="14" height="11" rx="4" ry="4" fill="#2d0a4e" stroke="#00f0ff" stroke-width="1.5"/>
            <circle cx="18" cy="16" r="8" fill="#18042c" stroke="#00f0ff" stroke-width="1.5"/>
            <rect x="11" y="13" width="9" height="5.5" rx="2.5" ry="2.5" fill="#00e5ff"/>
            <circle cx="14" cy="15.5" r="1.2" fill="#fff"/>
            <path d="M 10 16 L 8 16" stroke="#00e5ff" stroke-width="1.5"/>
            <line x1="18" y1="8" x2="18" y2="5" stroke="#ff007f" stroke-width="1.5"/>
            <circle cx="18" cy="4" r="1.5" fill="#ff007f"/>
            <ellipse cx="15" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
            <ellipse cx="22" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
          </g>
          <g id="player-right-cyber">
            <rect x="13" y="24" width="14" height="11" rx="4" ry="4" fill="#2d0a4e" stroke="#00f0ff" stroke-width="1.5"/>
            <circle cx="22" cy="16" r="8" fill="#18042c" stroke="#00f0ff" stroke-width="1.5"/>
            <rect x="20" y="13" width="9" height="5.5" rx="2.5" ry="2.5" fill="#00e5ff"/>
            <circle cx="26" cy="15.5" r="1.2" fill="#fff"/>
            <path d="M 30 16 L 32 16" stroke="#00e5ff" stroke-width="1.5"/>
            <line x1="22" y1="8" x2="22" y2="5" stroke="#ff007f" stroke-width="1.5"/>
            <circle cx="22" cy="4" r="1.5" fill="#ff007f"/>
            <ellipse cx="18" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
            <ellipse cx="25" cy="36" rx="3" ry="1.5" fill="#00f0ff"/>
          </g>

          <!-- ==================== WOOD THEME ==================== -->
          <!-- 1. 墙砖瓦片 (深色木年轮瓦片) -->
          <g id="wall-tile-wood">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/>
            <circle cx="20" cy="20" r="16" fill="none" stroke="#4e342e" stroke-width="1.5" stroke-dasharray="6 3"/>
            <circle cx="20" cy="20" r="10" fill="none" stroke="#4e342e" stroke-width="1"/>
            <circle cx="20" cy="20" r="4" fill="#4e342e"/>
            <line x1="4" y1="4" x2="36" y2="36" stroke="#3e2723" stroke-width="0.8" opacity="0.3"/>
          </g>
          <!-- 2. 箱子瓦片 (木制货仓箱) -->
          <g id="box-tile-wood">
            <rect x="2" y="2" width="36" height="36" fill="#b17a3e" stroke="#5d3209" stroke-width="2"/>
            <rect x="5" y="5" width="30" height="30" fill="none" stroke="#e0a96d" stroke-width="1"/>
            <line x1="5" y1="5" x2="35" y2="35" stroke="#5d3209" stroke-width="2"/>
            <line x1="35" y1="5" x2="5" y2="35" stroke="#5d3209" stroke-width="2"/>
            <rect x="2" y="2" width="6" height="6" fill="#5d3209"/>
            <rect x="32" y="2" width="6" height="6" fill="#5d3209"/>
            <rect x="2" y="32" width="6" height="6" fill="#5d3209"/>
            <rect x="32" y="32" width="6" height="6" fill="#5d3209"/>
          </g>
          <!-- 3. 目标黄叶 -->
          <g id="goal-tile-wood">
            <path d="M 20 12 C 23 16, 25 18, 20 28 C 15 18, 17 16, 20 12 Z" fill="#ffb300" stroke="#ff8f00" stroke-width="1"/>
            <circle cx="20" cy="22" r="2" fill="#ff8f00"/>
          </g>
          <!-- 4. 目标点上的箱子 -->
          <g id="box-on-goal-tile-wood">
            <path d="M 20 12 C 23 16, 25 18, 20 28 C 15 18, 17 16, 20 12 Z" fill="#ffb300"/>
            <rect x="2" y="2" width="36" height="36" fill="#4d7c57" stroke="#264c30" stroke-width="2" opacity="0.9"/>
            <rect x="5" y="5" width="30" height="30" fill="none" stroke="#8cbfa2" stroke-width="1" opacity="0.9"/>
            <line x1="5" y1="5" x2="35" y2="35" stroke="#264c30" stroke-width="2" opacity="0.9"/>
            <line x1="35" y1="5" x2="5" y2="35" stroke="#264c30" stroke-width="2" opacity="0.9"/>
          </g>
          <!-- 5. 森林探索者 -->
          <g id="player-down-wood">
            <path d="M 12 28 C 12 22, 28 22, 28 28 L 27 37 L 13 37 Z" fill="#2e7d32"/>
            <circle cx="20" cy="18" r="7.5" fill="#ffcc80"/>
            <circle cx="17.5" cy="18" r="0.8" fill="#222"/>
            <circle cx="22.5" cy="18" r="0.8" fill="#222"/>
            <path d="M 19 21 Q 20 22 21 21" stroke="#222" stroke-width="1" fill="none"/>
            <path d="M 12 18 C 12 7, 28 7, 28 18 Z" fill="#1b5e20"/>
            <path d="M 20 5 L 20 8" stroke="#ffcc00" stroke-width="1.5"/>
            <circle cx="20" cy="4" r="1.2" fill="#ffcc00"/>
            <ellipse cx="15" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
            <ellipse cx="25" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
          </g>
          <g id="player-up-wood">
            <path d="M 12 28 C 12 22, 28 22, 28 28 L 27 37 L 13 37 Z" fill="#2e7d32"/>
            <path d="M 12 18 C 12 7, 28 7, 28 18 Z" fill="#1b5e20"/>
            <line x1="20" y1="5" x2="20" y2="8" stroke="#ffcc00" stroke-width="1.5"/>
            <circle cx="20" cy="4" r="1.2" fill="#ffcc00"/>
            <ellipse cx="15" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
            <ellipse cx="25" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
          </g>
          <g id="player-left-wood">
            <path d="M 13 28 C 13 22, 25 22, 25 28 L 24 37 L 14 37 Z" fill="#2e7d32"/>
            <circle cx="18" cy="18" r="7.5" fill="#ffcc80"/>
            <circle cx="15" cy="18" r="0.8" fill="#222"/>
            <path d="M 11 18 C 11 7, 25 7, 25 18 Z" fill="#1b5e20"/>
            <path d="M 22 7 L 26 5" stroke="#ffcc00" stroke-width="1.5"/>
            <ellipse cx="15" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
            <ellipse cx="22" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
          </g>
          <g id="player-right-wood">
            <path d="M 15 28 C 15 22, 27 22, 27 28 L 26 37 L 16 37 Z" fill="#2e7d32"/>
            <circle cx="22" cy="18" r="7.5" fill="#ffcc80"/>
            <circle cx="25" cy="18" r="0.8" fill="#222"/>
            <path d="M 15 18 C 15 7, 29 7, 29 18 Z" fill="#1b5e20"/>
            <path d="M 18 7 L 14 5" stroke="#ffcc00" stroke-width="1.5"/>
            <ellipse cx="18" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
            <ellipse cx="25" cy="37" rx="3.2" ry="1.5" fill="#3e2723"/>
          </g>
        </defs>
    `;

    // 2. 绘制静态地板
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.board[r][c];
        const x = c * cell_size;
        const y = r * cell_size;

        if (type !== 'x') {
          let floorFill = "#f1ece1";
          let floorStroke = "#e6dfd1";
          
          if (this.currentTheme === 'cyber') {
            floorFill = "#0f051d";
            floorStroke = "#1a0b2e";
          } else if (this.currentTheme === 'wood') {
            floorFill = "#efebe9";
            floorStroke = "#d7ccc8";
          }
          
          svgHtml += `<rect x="${x}" y="${y}" width="${cell_size}" height="${cell_size}" fill="${floorFill}" stroke="${floorStroke}" stroke-width="1"/>`;
        }
      }
    }

    // 3. 绘制静态结构（墙、目标点）与动态物体（箱子、玩家）
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.board[r][c];
        const hasBox = this.boxes[r][c];
        const x = c * cell_size;
        const y = r * cell_size;

        if (type === '#') {
          // 墙
          svgHtml += `<use href="#wall-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
        } else if (type === '.') {
          // 目标
          if (hasBox) {
            svgHtml += `<use href="#box-on-goal-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
          } else {
            svgHtml += `<use href="#goal-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
          }
        } else if (hasBox) {
          // 地板上的箱子
          svgHtml += `<use href="#box-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
        }
      }
    }

    // 4. 绘制玩家
    const playerX = this.player.c * cell_size;
    const playerY = this.player.r * cell_size;
    svgHtml += `<use href="#player-${this.facing}-${this.currentTheme}" x="${playerX}" y="${playerY}"/>`;

    svgHtml += `</svg>`;

    // 插入 DOM 渲染
    this.boardContainer.innerHTML = svgHtml;
  }

  // 朝特定方向移动玩家
  movePlayer(dr, dc, dirName) {
    if (this.isSolved) return;

    this.facing = dirName; // 改变朝向

    const targetR = this.player.r + dr;
    const targetC = this.player.c + dc;

    // 检查越界
    if (targetR < 0 || targetR >= this.rows || targetC < 0 || targetC >= this.cols) return;

    const targetType = this.board[targetR][targetC];
    
    // 如果前方是墙或外部空白，则无法移动
    if (targetType === '#' || targetType === 'x') {
      this.renderBoard(); // 刷新以更新面向朝向
      return;
    }

    const hasBox = this.boxes[targetR][targetC];

    if (hasBox) {
      // 尝试推动箱子
      const pushR = targetR + dr;
      const pushC = targetC + dc;

      // 检查推动点是否越界
      if (pushR < 0 || pushR >= this.rows || pushC < 0 || pushC >= this.cols) return;

      const pushType = this.board[pushR][pushC];
      const pushHasBox = this.boxes[pushR][pushC];

      // 前方有墙、空白或者已有箱子，都不能推动
      if (pushType === '#' || pushType === 'x' || pushHasBox) {
        this.renderBoard();
        return;
      }

      // 保存历史记录（用于撤销）
      this.pushToHistory();

      // 移动箱子
      this.boxes[targetR][targetC] = false;
      this.boxes[pushR][pushC] = true;

      // 移动玩家
      this.player.r = targetR;
      this.player.c = targetC;

      this.steps++;
      this.pushes++;
      
      this.audio.playSound('push');
    } 
    else {
      // 正常行走
      this.pushToHistory();

      this.player.r = targetR;
      this.player.c = targetC;

      this.steps++;
      
      this.audio.playSound('walk');
    }

    // 重新渲染画面
    this.renderBoard();
    
    // 更新数据 UI
    this.updateStatsUI();
    
    // 清空重做栈 (因为进行了新的一步)
    this.redoStack = [];
    this.updateHistoryButtons();

    // 检测是否胜利
    this.checkVictory();
  }

  // 朝字符方向移动
  movePlayerInDirection(dir) {
    if (dir === 'up') this.movePlayer(-1, 0, 'up');
    else if (dir === 'down') this.movePlayer(1, 0, 'down');
    else if (dir === 'left') this.movePlayer(0, -1, 'left');
    else if (dir === 'right') this.movePlayer(0, 1, 'right');
  }

  // 检测胜利条件
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

  // 关卡胜利结算
  levelSolved() {
    this.isSolved = true;
    this.stopTimer();
    this.audio.playSound('victory');

    // 检查并记录最佳成绩
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

    // 写入已通关列表
    if (!this.progress[this.currentSetName].completed.includes(this.levelIndex)) {
      this.progress[this.currentSetName].completed.push(this.levelIndex);
    }
    
    this.progress[this.currentSetName].bests[this.levelIndex] = currentBest;
    this.saveProgress();

    // 更新侧边栏数据
    this.displayBestScores();

    // 弹出关卡胜利 Modal
    setTimeout(() => {
      this.showVictoryModal(isNewBestSteps, isNewBestPushes, isNewBestTime);
    }, 300);
  }

  // 弹出框控制
  showVictoryModal(newSteps, newPushes, newTime) {
    const lvl = this.levels[this.levelIndex];
    this.victoryLevelName.textContent = lvl.title || this.t('level_title_format', { num: lvl.level });
    
    this.victorySteps.textContent = this.steps;
    this.victoryPushes.textContent = this.pushes;
    this.victoryTime.textContent = this.formatTime(this.timer);

    // 最佳徽章显示
    if (newSteps) this.victoryStepsBadge.classList.remove('hidden');
    else this.victoryStepsBadge.classList.add('hidden');

    if (newPushes) this.victoryPushesBadge.classList.remove('hidden');
    else this.victoryPushesBadge.classList.add('hidden');

    if (newTime) this.victoryTimeBadge.classList.remove('hidden');
    else this.victoryTimeBadge.classList.add('hidden');

    this.victoryModal.classList.remove('hidden');
  }

  hideVictoryModal() {
    this.victoryModal.classList.add('hidden');
  }

  // 状态保存与撤销/重做
  pushToHistory() {
    // 保存一个状态副本 (深度克隆 boxes 网格)
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

    // 当前状态推入 redoStack
    const boxesCopy = this.boxes.map(row => [...row]);
    this.redoStack.push({
      player: { r: this.player.r, c: this.player.c },
      boxes: boxesCopy,
      facing: this.facing,
      steps: this.steps,
      pushes: this.pushes
    });

    // 从 history 弹出上一个状态并应用
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

    // 当前状态推回 history
    const boxesCopy = this.boxes.map(row => [...row]);
    this.history.push({
      player: { r: this.player.r, c: this.player.c },
      boxes: boxesCopy,
      facing: this.facing,
      steps: this.steps,
      pushes: this.pushes
    });

    // 从 redoStack 弹出下一个状态并应用
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

  // 重新开始当前关卡
  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  // 切关
  changeLevel(offset) {
    const nextIdx = this.levelIndex + offset;
    if (nextIdx >= 0 && nextIdx < this.levels.length) {
      this.loadLevel(nextIdx);
    }
  }

  // 历史撤销按钮禁用状态
  updateHistoryButtons() {
    this.undoBtn.disabled = this.history.length === 0;
    this.redoBtn.disabled = this.redoStack.length === 0;
  }

  // 更新左面板统计数据
  updateStatsUI() {
    this.stepsVal.textContent = this.steps;
    this.pushesVal.textContent = this.pushes;
  }

  // 侧边栏历史记录显示
  displayBestScores() {
    const best = this.progress[this.currentSetName].bests[this.levelIndex];
    if (best) {
      this.bestStepsVal.textContent = best.steps;
      this.bestPushesVal.textContent = best.pushes;
      this.bestTimeVal.textContent = this.formatTime(best.time);
    } else {
      this.bestStepsVal.textContent = '-';
      this.bestPushesVal.textContent = '-';
      this.bestTimeVal.textContent = '-';
    }
  }

  // 计时器控制
  startTimer() {
    this.stopTimer();
    this.timer = 0;
    this.timerVal.textContent = "00:00";
    
    this.timerInterval = setInterval(() => {
      this.timer++;
      this.timerVal.textContent = this.formatTime(this.timer);
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

  // 键盘按键事件处理器
  handleKeyDown(e) {
    // 阻止方向键在窗口上产生网页滚动的默认行为
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    if (this.isSolved) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.movePlayer(-1, 0, 'up');
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.movePlayer(1, 0, 'down');
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.movePlayer(0, -1, 'left');
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.movePlayer(0, 1, 'right');
        break;
      case 'KeyZ':
        // 撤销一步
        this.undo();
        break;
      case 'KeyY':
        // 重做一步
        this.redo();
        break;
      case 'KeyR':
        // 重置
        this.restartLevel();
        break;
      case 'KeyM':
        // 音效开关
        this.toggleAudio();
        break;
    }
  }

  // 手势滑动识别
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    
    this.boardContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || this.isSolved) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      // 顺便激活音效，以响应移动设备的用户点击激活政策
      this.audio.init();
    }, { passive: true });

    this.boardContainer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length !== 1 || this.isSolved) return;
      
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;
      
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const threshold = 30; // 滑动阈值（像素）

      if (Math.max(absX, absY) < threshold) return;

      if (absX > absY) {
        // 横向滑动
        if (diffX > 0) this.movePlayer(0, 1, 'right');
        else this.movePlayer(0, -1, 'left');
      } else {
        // 纵向滑动
        if (diffY > 0) this.movePlayer(1, 0, 'down');
        else this.movePlayer(-1, 0, 'up');
      }
    }, { passive: true });
  }
}

// 页面加载完成后实例化游戏对象
window.addEventListener('DOMContentLoaded', () => {
  window.sokoban = new SokobanGame();
});
