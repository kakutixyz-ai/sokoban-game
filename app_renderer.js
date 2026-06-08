/**
 * Sokoban Game - SVG Board Renderer (app_renderer.js)
 * Implements SVG templates (Classic, Cyber, Wood) and board compilation.
 * Line limit checked: ~340 lines (target: < 500 lines)
 */

Object.assign(SokobanGame.prototype, {
  renderBoard() {
    this.boardContainer.innerHTML = '';
    
    const cell_size = 40;
    const width = this.cols * cell_size;
    const height = this.rows * cell_size;

    // 动态拼接 SVG string
    let svgHtml = `
      <svg class="sokoban-theme-${this.currentTheme}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
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
            <path d="M 12 28 C 12 23, 28 23, 28 28 L 27 37 L 13 37 Z" fill="#0d47a1"/>
            <rect x="14" y="25" width="2" height="5" fill="#1565c0"/>
            <rect x="24" y="25" width="2" height="5" fill="#1565c0"/>
            <circle cx="20" cy="18" r="7" fill="#ffd54f"/>
            <circle cx="20" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="17.5" cy="20" r="1" fill="#222"/>
            <circle cx="22.5" cy="20" r="1" fill="#222"/>
            <path d="M 12 17 C 12 8, 28 8, 28 17 Z" fill="#ffca28"/>
            <path d="M 10 17 L 30 17 A 1 1 0 0 1 30 19 L 10 19 Z" fill="#f57f17"/>
            <rect x="18" y="10" width="4" height="7" fill="#ffe082" opacity="0.4"/>
            <ellipse cx="15" cy="37" rx="3" ry="1.5" fill="#111"/>
            <ellipse cx="25" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝上 -->
          <g id="player-up-classic">
            <path d="M 12 28 C 12 23, 28 23, 28 28 L 27 37 L 13 37 Z" fill="#0d47a1"/>
            <circle cx="20" cy="18" r="7" fill="#3e2723"/>
            <path d="M 12 17 C 12 8, 28 8, 28 17 Z" fill="#ffca28"/>
            <path d="M 11 17 L 29 17 A 1 1 0 0 1 29 19 L 11 19 Z" fill="#f57f17"/>
            <rect x="18" y="10" width="4" height="7" fill="#ffe082" opacity="0.4"/>
            <ellipse cx="15" cy="37" rx="3" ry="1.5" fill="#111"/>
            <ellipse cx="25" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝左 -->
          <g id="player-left-classic">
            <path d="M 13 28 C 13 23, 25 23, 25 28 L 24 37 L 14 37 Z" fill="#0d47a1"/>
            <circle cx="18" cy="18" r="7" fill="#ffd54f"/>
            <circle cx="18" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="14.5" cy="20" r="1.2" fill="#222"/>
            <path d="M 11 17 C 11 8, 26 8, 26 17 Z" fill="#ffca28"/>
            <path d="M 7 17 H 27 V 19 H 7 Z" fill="#f57f17"/>
            <path d="M 11.5 20 L 10 21.5 L 11.5 23 Z" fill="#ffe0b2"/>
            <ellipse cx="15" cy="37" rx="3.5" ry="1.5" fill="#111"/>
            <ellipse cx="22" cy="37" rx="3" ry="1.5" fill="#111"/>
          </g>

          <!-- 朝右 -->
          <g id="player-right-classic">
            <path d="M 15 28 C 15 23, 27 23, 27 28 L 26 37 L 16 37 Z" fill="#0d47a1"/>
            <circle cx="22" cy="18" r="7" fill="#ffd54f"/>
            <circle cx="22" cy="20" r="6.5" fill="#ffe0b2"/>
            <circle cx="25.5" cy="20" r="1.2" fill="#222"/>
            <path d="M 14 17 C 14 8, 29 8, 29 17 Z" fill="#ffca28"/>
            <path d="M 13 17 H 33 V 19 H 13 Z" fill="#f57f17"/>
            <path d="M 28.5 20 L 30 21.5 L 28.5 23 Z" fill="#ffe0b2"/>
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
          svgHtml += `<use href="#wall-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
        } else if (type === '.') {
          if (hasBox) {
            svgHtml += `<use href="#box-on-goal-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
          } else {
            svgHtml += `<use href="#goal-tile-${this.currentTheme}" x="${x}" y="${y}"/>`;
          }
        } else if (hasBox) {
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
});
