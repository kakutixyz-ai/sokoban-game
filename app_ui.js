/**
 * Sokoban Game - User Interface (app_ui.js)
 * Manages DOM events, translations, settings panels, swipes, and modal dialogs.
 */

Object.assign(SokobanGame.prototype, {
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
    this.hintModeBtn = document.getElementById('hint-mode-btn');
    this.hintNextBtn = document.getElementById('hint-next-btn');
    this.hintProgress = document.getElementById('hint-progress');
    
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

    if (this.setSelect) {
      this.setSelect.value = this.currentSetName;
    }
    if (this.setBadge) {
      this.setBadge.textContent = this.t('level_badge_' + this.currentSetName);
    }

    this.populateLevelSelect();
  },

  // 动态填充关卡选择下拉菜单
  populateLevelSelect() {
    if (!this.levelSelect) return;
    this.levelSelect.innerHTML = '';
    this.levels.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = this.t('level_format', { num: lvl.level, title: this.getLevelTitle(lvl) });
      this.levelSelect.appendChild(opt);
    });
  },

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
    if (this.levelSelect) {
      this.levelSelect.addEventListener('change', (e) => {
        this.loadLevel(parseInt(e.target.value, 10));
      });
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.changeLevel(-1));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.changeLevel(1));
    }

    // 控制栏按钮
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener('click', () => this.redo());
    }
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.restartLevel());
    }
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => this.toggleAudio());
    }
    if (this.hintModeBtn) {
      this.hintModeBtn.addEventListener('click', () => this.toggleHintMode());
    }
    if (this.hintNextBtn) {
      this.hintNextBtn.addEventListener('click', () => this.playNextHintStep());
    }

    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 移动端虚拟方向盘按钮
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
    if (this.modalReplayBtn) {
      this.modalReplayBtn.addEventListener('click', () => {
        this.hideVictoryModal();
        this.restartLevel();
      });
    }
    if (this.modalNextBtn) {
      this.modalNextBtn.addEventListener('click', () => {
        this.hideVictoryModal();
        this.changeLevel(1);
      });
    }

    // 屏幕滑动 (Swipe) 手势识别
    this.setupSwipeGestures();

    // 激活音效解锁监听器（应对现代浏览器安全限制）
    const unlockAudio = () => {
      this.audio.init();
      if (this.audio.audioCtx && this.audio.audioCtx.state === 'suspended') {
        this.audio.audioCtx.resume().catch(err => {
          console.warn("Failed to resume AudioContext", err);
        });
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio, { passive: true });
  },

  // 刷新所有 UI 的多语言文本
  updateUILanguage() {
    // 1. 普通文本翻译
    const elements = document.querySelectorAll('[data-i18n]:not([data-i18n-html])');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // 2. 富文本翻译
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
    if (this.levels[this.levelIndex] && this.levelTitle) {
      const levelData = this.levels[this.levelIndex];
      this.levelTitle.textContent = this.getLevelTitle(levelData);
    }

    // 9. 主题下拉菜单翻译
    if (this.themeSelect) {
      Array.from(this.themeSelect.options).forEach(opt => {
        const val = opt.value;
        const key = `theme_${val}`;
        opt.textContent = this.t(key);
      });
    }
  },

  // 切换静音
  toggleAudio() {
    this.audio.setMuted(!this.audio.isMuted);
    if (this.audio.isMuted) {
      this.audioIconUnmuted.classList.add('hidden');
      this.audioIconMuted.classList.remove('hidden');
    } else {
      this.audioIconUnmuted.classList.remove('hidden');
      this.audioIconMuted.classList.add('hidden');
      this.audio.playSound('walk');
    }
  },

  // 弹出框控制
  showVictoryModal(newSteps, newPushes, newTime) {
    if (!this.victoryModal) return;
    const lvl = this.levels[this.levelIndex];
    this.victoryLevelName.textContent = this.getLevelTitle(lvl);
    
    this.victorySteps.textContent = this.steps;
    this.victoryPushes.textContent = this.pushes;
    this.victoryTime.textContent = this.formatTime(this.timer);

    if (newSteps) this.victoryStepsBadge.classList.remove('hidden');
    else this.victoryStepsBadge.classList.add('hidden');

    if (newPushes) this.victoryPushesBadge.classList.remove('hidden');
    else this.victoryPushesBadge.classList.add('hidden');

    if (newTime) this.victoryTimeBadge.classList.remove('hidden');
    else this.victoryTimeBadge.classList.add('hidden');

    this.victoryModal.classList.remove('hidden');
  },

  hideVictoryModal() {
    if (this.victoryModal) {
      this.victoryModal.classList.add('hidden');
    }
  },

  // 历史撤销按钮禁用状态
  updateHistoryButtons() {
    if (this.undoBtn) {
      this.undoBtn.disabled = this.history.length === 0;
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = this.redoStack.length === 0;
    }
  },

  // 更新左面板统计数据
  updateStatsUI() {
    if (this.stepsVal) this.stepsVal.textContent = this.steps;
    if (this.pushesVal) this.pushesVal.textContent = this.pushes;
  },

  updateHintUI() {
    if (!this.hintModeBtn || !this.hintNextBtn || !this.hintProgress) return;
    const available = this.currentSetName === 'Microban' && typeof MICROBAN_SOLUTIONS !== 'undefined';
    const solution = available ? MICROBAN_SOLUTIONS[this.levelIndex] : '';
    this.hintModeBtn.disabled = !available;
    this.hintModeBtn.classList.toggle('active', this.isHintMode);
    this.hintModeBtn.querySelector('span').textContent = this.isHintMode ? '退出提示' : '提示模式';
    this.hintNextBtn.disabled = !this.isHintMode || this.isSolved || this.hintStepIndex >= solution.length;
    this.hintProgress.classList.toggle('hidden', !this.isHintMode);
    this.hintProgress.textContent = `${this.hintStepIndex} / ${solution.length}`;
  },

  // 侧边栏历史记录显示
  displayBestScores() {
    const best = this.progress[this.currentSetName].bests[this.levelIndex];
    if (best) {
      if (this.bestStepsVal) this.bestStepsVal.textContent = best.steps;
      if (this.bestPushesVal) this.bestPushesVal.textContent = best.pushes;
      if (this.bestTimeVal) this.bestTimeVal.textContent = this.formatTime(best.time);
    } else {
      if (this.bestStepsVal) this.bestStepsVal.textContent = '-';
      if (this.bestPushesVal) this.bestPushesVal.textContent = '-';
      if (this.bestTimeVal) this.bestTimeVal.textContent = '-';
    }
  },

  // 键盘按键事件处理器
  handleKeyDown(e) {
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
        this.undo();
        break;
      case 'KeyY':
        this.redo();
        break;
      case 'KeyR':
        this.restartLevel();
        break;
      case 'KeyM':
        this.toggleAudio();
        break;
      case 'KeyH':
        this.toggleHintMode();
        break;
      case 'Space':
        this.playNextHintStep();
        break;
    }
  },

  // 手势滑动识别
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    if (!this.boardContainer) return;
    
    this.boardContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || this.isSolved) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
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
        if (diffX > 0) this.movePlayer(0, 1, 'right');
        else this.movePlayer(0, -1, 'left');
      } else {
        if (diffY > 0) this.movePlayer(1, 0, 'down');
        else this.movePlayer(-1, 0, 'up');
      }
    }, { passive: true });
  }
});

// 页面加载完成后实例化游戏对象
window.addEventListener('DOMContentLoaded', () => {
  window.sokoban = new SokobanGame();
});
