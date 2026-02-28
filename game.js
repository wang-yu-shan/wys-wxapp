const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let width = 0;
let height = 0;
let safeTop = 0;

const TOP_GAP = 24;

const COLORS = {
  bg: '#f5f7fb',
  panel: '#ffffff',
  text: '#1f2937',
  subText: '#6b7280',
  primary: '#3b82f6',
  danger: '#ef4444',
  line: '#d1d5db',
};

class Button {
  constructor(x, y, w, h, text, onTap, color = COLORS.primary) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
    this.onTap = onTap;
    this.color = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    roundRect(ctx, this.x, this.y, this.w, this.h, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(this.h * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2 + 1);
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
  }
}

class HomeScene {
  constructor(manager) {
    this.manager = manager;
    const btnW = Math.min(width * 0.72, 360);
    const btnH = 56;
    const startY = height * 0.38;
    this.buttons = [
      new Button((width - btnW) / 2, startY, btnW, btnH, '五子棋', () => manager.switch('gobang')),
      new Button((width - btnW) / 2, startY + 84, btnW, btnH, '俄罗斯方块', () => manager.switch('tetris')),
    ];
  }

  update() {}

  draw(ctx) {
    drawBackground(ctx);
    drawCard(ctx, width * 0.08, height * 0.18, width * 0.84, height * 0.62);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('微信小游戏集合', width / 2, height * 0.26);

    ctx.fillStyle = COLORS.subText;
    ctx.font = '18px sans-serif';
    ctx.fillText('请选择一个游戏开始', width / 2, height * 0.31);

    this.buttons.forEach((btn) => btn.draw(ctx));
  }

  handleTap(x, y) {
    this.buttons.forEach((btn) => {
      if (btn.contains(x, y)) btn.onTap();
    });
  }
}

class GobangScene {
  constructor(manager) {
    this.manager = manager;
    this.boardSize = 15;
    this.grid = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
    this.current = 1;
    this.gameOver = false;
    this.message = '你执黑先行';

    this.backButton = createBackButton(() => manager.switch('home'));

    const boardPadding = 20;
    this.boardPx = Math.min(width - boardPadding * 2, height - (safeTop + 220));
    this.cell = this.boardPx / (this.boardSize - 1);
    this.boardX = (width - this.boardPx) / 2;
    this.boardY = safeTop + 104;
  }

  reset() {
    this.grid = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
    this.current = 1;
    this.gameOver = false;
    this.message = '你执黑先行';
  }

  update() {}

  draw(ctx) {
    drawBackground(ctx);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('五子棋', width / 2, safeTop + 42);

    ctx.fillStyle = COLORS.subText;
    ctx.font = '18px sans-serif';
    ctx.fillText(this.message, width / 2, safeTop + 72);

    this.backButton.draw(ctx);

    ctx.fillStyle = '#f2d39b';
    roundRect(ctx, this.boardX - 14, this.boardY - 14, this.boardPx + 28, this.boardPx + 28, 14);
    ctx.fill();

    ctx.strokeStyle = '#8d6e63';
    for (let i = 0; i < this.boardSize; i++) {
      const offset = i * this.cell;
      line(ctx, this.boardX, this.boardY + offset, this.boardX + this.boardPx, this.boardY + offset);
      line(ctx, this.boardX + offset, this.boardY, this.boardX + offset, this.boardY + this.boardPx);
    }

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (!this.grid[r][c]) continue;
        const x = this.boardX + c * this.cell;
        const y = this.boardY + r * this.cell;
        const rad = this.cell * 0.42;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = this.grid[r][c] === 1 ? '#111827' : '#f9fafb';
        ctx.fill();
        ctx.strokeStyle = this.grid[r][c] === 1 ? '#111827' : '#d1d5db';
        ctx.stroke();
      }
    }

    if (this.gameOver) {
      const btnW = 180;
      const btnH = 52;
      this.restartBtn = new Button((width - btnW) / 2, height - 76, btnW, btnH, '再来一局', () => this.reset());
      this.restartBtn.draw(ctx);
    }
  }

  handleTap(x, y) {
    if (this.backButton.contains(x, y)) {
      this.backButton.onTap();
      return;
    }
    if (this.gameOver && this.restartBtn && this.restartBtn.contains(x, y)) {
      this.restartBtn.onTap();
      return;
    }
    if (this.gameOver) return;

    const c = Math.round((x - this.boardX) / this.cell);
    const r = Math.round((y - this.boardY) / this.cell);
    if (!this.valid(r, c)) return;

    const px = this.boardX + c * this.cell;
    const py = this.boardY + r * this.cell;
    if (Math.abs(px - x) > this.cell * 0.45 || Math.abs(py - y) > this.cell * 0.45) return;

    this.place(r, c, 1);
    if (this.checkWin(r, c, 1)) {
      this.gameOver = true;
      this.message = '你赢了！';
      return;
    }

    if (this.isBoardFull()) {
      this.gameOver = true;
      this.message = '平局';
      return;
    }

    const ai = this.pickAIMove();
    if (ai) {
      this.place(ai.r, ai.c, 2);
      if (this.checkWin(ai.r, ai.c, 2)) {
        this.gameOver = true;
        this.message = 'AI 获胜';
        return;
      }
    }

    if (this.isBoardFull()) {
      this.gameOver = true;
      this.message = '平局';
    }
  }

  place(r, c, val) {
    this.grid[r][c] = val;
  }

  valid(r, c) {
    return r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && this.grid[r][c] === 0;
  }

  isBoardFull() {
    return this.grid.every((row) => row.every(Boolean));
  }

  checkWin(r, c, role) {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    return dirs.some(([dr, dc]) => {
      let cnt = 1;
      cnt += this.countDir(r, c, dr, dc, role);
      cnt += this.countDir(r, c, -dr, -dc, role);
      return cnt >= 5;
    });
  }

  countDir(r, c, dr, dc, role) {
    let cnt = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize && this.grid[nr][nc] === role) {
      cnt += 1;
      nr += dr;
      nc += dc;
    }
    return cnt;
  }

  pickAIMove() {
    let best = null;
    let bestScore = -Infinity;

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.grid[r][c] !== 0) continue;
        const score = this.evaluatePoint(r, c, 2) + this.evaluatePoint(r, c, 1) * 0.9;
        if (score > bestScore) {
          bestScore = score;
          best = { r, c };
        }
      }
    }
    return best;
  }

  evaluatePoint(r, c, role) {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    let total = 0;
    dirs.forEach(([dr, dc]) => {
      const a = this.countLine(r, c, dr, dc, role);
      const b = this.countLine(r, c, -dr, -dc, role);
      const len = a.count + b.count + 1;
      const open = a.open + b.open;

      if (len >= 5) total += 100000;
      else if (len === 4 && open === 2) total += 10000;
      else if (len === 4 && open === 1) total += 2000;
      else if (len === 3 && open === 2) total += 1000;
      else if (len === 3 && open === 1) total += 200;
      else if (len === 2 && open === 2) total += 80;
      else total += len * 10;
    });

    return total;
  }

  countLine(r, c, dr, dc, role) {
    let count = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize && this.grid[nr][nc] === role) {
      count += 1;
      nr += dr;
      nc += dc;
    }
    const open = nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize && this.grid[nr][nc] === 0 ? 1 : 0;
    return { count, open };
  }
}

class TetrisScene {
  constructor(manager) {
    this.manager = manager;
    this.cols = 10;
    this.rows = 20;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

    this.boardX = 24;
    this.boardY = safeTop + 106;
    this.boardW = width - this.boardX * 2;
    this.cell = Math.floor(this.boardW / this.cols);
    this.boardW = this.cell * this.cols;
    this.boardH = this.cell * this.rows;

    this.shapes = [
      { color: '#60a5fa', blocks: [[1, 1, 1, 1]] },
      { color: '#f97316', blocks: [[1, 1], [1, 1]] },
      { color: '#2dd4bf', blocks: [[0, 1, 1], [1, 1, 0]] },
      { color: '#a78bfa', blocks: [[1, 1, 0], [0, 1, 1]] },
      { color: '#fb7185', blocks: [[1, 1, 1], [0, 1, 0]] },
      { color: '#22d3ee', blocks: [[1, 1, 1], [1, 0, 0]] },
      { color: '#facc15', blocks: [[1, 1, 1], [0, 0, 1]] },
    ];

    this.score = 0;
    this.lines = 0;
    this.dropTimer = 0;
    this.dropInterval = 550;
    this.over = false;
    this.current = this.newPiece();

    this.backButton = createBackButton(() => manager.switch('home'));

    const ctlY = this.boardY + this.boardH + 18;
    const gap = 12;
    const totalW = width - 24 * 2;
    const w1 = Math.floor((totalW - gap * 3) * 0.18);
    const w2 = w1;
    const w3 = Math.floor((totalW - gap * 3) * 0.34);
    const w4 = totalW - w1 - w2 - w3 - gap * 3;
    let x = 24;
    this.btnLeft = new Button(x, ctlY, w1, 56, '←', () => this.move(-1, 0));
    x += w1 + gap;
    this.btnRight = new Button(x, ctlY, w2, 56, '→', () => this.move(1, 0));
    x += w2 + gap;
    this.btnRotate = new Button(x, ctlY, w3, 56, '旋转', () => this.rotate());
    x += w3 + gap;
    this.btnDown = new Button(x, ctlY, w4, 56, '↓', () => {
      this.dropTimer = this.dropInterval;
    });
  }

  get level() {
    return Math.min(99, Math.floor(this.score / 500) + 1);
  }

  newPiece() {
    const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    return {
      x: Math.floor(this.cols / 2) - 2,
      y: 0,
      blocks: shape.blocks.map((row) => row.slice()),
      color: shape.color,
    };
  }

  update(dt) {
    if (this.over) return;
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.move(0, 1)) {
        this.merge();
        this.clearLines();
        this.current = this.newPiece();
        if (this.collide(this.current.x, this.current.y, this.current.blocks)) {
          this.over = true;
        }
      }
    }
  }

  draw(ctx) {
    drawBackground(ctx);
    this.drawHeader(ctx);
    this.drawBoard(ctx);

    if (this.current) {
      this.drawBlocks(this.current.x, this.current.y, this.current.blocks, this.current.color);
    }

    [this.btnLeft, this.btnRight, this.btnRotate, this.btnDown].forEach((btn) => this.drawBlueButton(ctx, btn));

    if (this.over) {
      ctx.fillStyle = '#00000088';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', width / 2, height / 2 - 24);
      ctx.font = '24px sans-serif';
      ctx.fillText(`得分 ${this.score}`, width / 2, height / 2 + 18);
      ctx.font = '18px sans-serif';
      ctx.fillText('点击任意位置重新开始', width / 2, height / 2 + 52);
    }
  }

  drawHeader(ctx) {
    this.drawMetalButton(ctx, this.backButton);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('俄罗斯方块', width / 2, safeTop + 52);

    const pillW = 150;
    const pillH = 52;
    const pillX = width - pillW - 18;
    const pillY = safeTop + 18;

    const g = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
    g.addColorStop(0, '#4b5563');
    g.addColorStop(1, '#1f2937');
    ctx.fillStyle = g;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    roundRect(ctx, pillX + 1, pillY + 1, pillW - 2, pillH - 2, pillH / 2 - 1);
    ctx.stroke();

    const scoreText = String(Math.min(999, this.score)).padStart(3, '0');
    const levelText = String(this.level).padStart(2, '0');
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#facc15';
    ctx.fillText(scoreText, pillX + 18, pillY + pillH / 2 + 1);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(levelText, pillX + 86, pillY + pillH / 2 + 1);
  }

  drawBoard(ctx) {
    roundRect(ctx, this.boardX, this.boardY, this.boardW, this.boardH, 26);
    ctx.save();
    ctx.clip();

    const bg = ctx.createLinearGradient(this.boardX, this.boardY, this.boardX + this.boardW, this.boardY + this.boardH);
    bg.addColorStop(0, '#031024');
    bg.addColorStop(0.55, '#081329');
    bg.addColorStop(1, '#1d152f');
    ctx.fillStyle = bg;
    ctx.fillRect(this.boardX, this.boardY, this.boardW, this.boardH);

    const glowA = ctx.createRadialGradient(this.boardX + this.boardW * 0.08, this.boardY + this.boardH * 0.82, 20, this.boardX + this.boardW * 0.08, this.boardY + this.boardH * 0.82, this.boardW * 0.55);
    glowA.addColorStop(0, 'rgba(34, 211, 238, 0.45)');
    glowA.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(this.boardX, this.boardY, this.boardW, this.boardH);

    const glowB = ctx.createRadialGradient(this.boardX + this.boardW * 0.92, this.boardY + this.boardH * 0.08, 20, this.boardX + this.boardW * 0.92, this.boardY + this.boardH * 0.08, this.boardW * 0.65);
    glowB.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
    glowB.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(this.boardX, this.boardY, this.boardW, this.boardH);

    ctx.strokeStyle = 'rgba(87, 108, 153, 0.35)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.cols; c++) {
      const x = this.boardX + c * this.cell;
      line(ctx, x, this.boardY, x, this.boardY + this.boardH);
    }
    for (let r = 0; r <= this.rows; r++) {
      const y = this.boardY + r * this.cell;
      line(ctx, this.boardX, y, this.boardX + this.boardW, y);
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.grid[r][c];
        if (val) this.drawCell(c, r, val);
      }
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    roundRect(ctx, this.boardX, this.boardY, this.boardW, this.boardH, 26);
    ctx.stroke();
  }

  drawMetalButton(ctx, btn) {
    const g = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    g.addColorStop(0, '#64748b');
    g.addColorStop(1, '#334155');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    roundRect(ctx, btn.x + 1, btn.y + 1, btn.w - 2, btn.h - 2, 15);
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  }

  drawBlueButton(ctx, btn) {
    const g = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    g.addColorStop(0, '#60a5fa');
    g.addColorStop(1, '#2563eb');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(37, 99, 235, 0.42)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const shine = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h * 0.6);
    shine.addColorStop(0, 'rgba(255,255,255,0.45)');
    shine.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = shine;
    roundRect(ctx, btn.x + 2, btn.y + 2, btn.w - 4, btn.h * 0.46, btn.h / 2);
    ctx.fill();

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    roundRect(ctx, btn.x + 1, btn.y + 1, btn.w - 2, btn.h - 2, btn.h / 2 - 1);
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.font = `bold ${btn.text === '旋转' ? 24 : 34}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  }

  handleTap(x, y) {
    if (this.backButton.contains(x, y)) {
      this.backButton.onTap();
      return;
    }
    if (this.over) {
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.score = 0;
      this.lines = 0;
      this.over = false;
      this.current = this.newPiece();
      return;
    }

    [this.btnLeft, this.btnRight, this.btnRotate, this.btnDown].forEach((btn) => {
      if (btn.contains(x, y)) btn.onTap();
    });
  }

  drawCell(c, r, color) {
    const x = this.boardX + c * this.cell + 2;
    const y = this.boardY + r * this.cell + 2;
    const w = this.cell - 4;

    const glow = ctx.createRadialGradient(x + w / 2, y + w / 2, 2, x + w / 2, y + w / 2, w * 0.9);
    glow.addColorStop(0, hexToRgba(color, 0.45));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 2, y - 2, w + 4, w + 4);

    const g = ctx.createLinearGradient(x, y, x, y + w);
    g.addColorStop(0, lightenColor(color, 0.35));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, w, 4);
    ctx.fill();

    ctx.strokeStyle = lightenColor(color, 0.52);
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, w - 1, 3.5);
    ctx.stroke();
  }

  drawBlocks(x, y, blocks, color) {
    for (let r = 0; r < blocks.length; r++) {
      for (let c = 0; c < blocks[r].length; c++) {
        if (!blocks[r][c]) continue;
        this.drawCell(x + c, y + r, color);
      }
    }
  }

  collide(nx, ny, blocks) {
    for (let r = 0; r < blocks.length; r++) {
      for (let c = 0; c < blocks[r].length; c++) {
        if (!blocks[r][c]) continue;
        const x = nx + c;
        const y = ny + r;
        if (x < 0 || x >= this.cols || y >= this.rows) return true;
        if (y >= 0 && this.grid[y][x]) return true;
      }
    }
    return false;
  }

  move(dx, dy) {
    const nx = this.current.x + dx;
    const ny = this.current.y + dy;
    if (!this.collide(nx, ny, this.current.blocks)) {
      this.current.x = nx;
      this.current.y = ny;
      return true;
    }
    return false;
  }

  rotate() {
    const src = this.current.blocks;
    const rotated = src[0].map((_, i) => src.map((row) => row[i]).reverse());
    if (!this.collide(this.current.x, this.current.y, rotated)) {
      this.current.blocks = rotated;
    }
  }

  merge() {
    this.current.blocks.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const x = this.current.x + c;
        const y = this.current.y + r;
        if (y >= 0) this.grid[y][x] = this.current.color;
      });
    });
  }

  clearLines() {
    let lines = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(Boolean)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(0));
        lines += 1;
        r += 1;
      }
    }
    if (lines) {
      this.lines += lines;
      this.score += [0, 100, 300, 700, 1500][lines];
      this.dropInterval = Math.max(130, 550 - Math.floor(this.score / 500) * 30);
    }
  }
}

class SceneManager {
  constructor() {
    this.scenes = {};
    this.current = null;
  }

  switch(name) {
    if (!this.scenes[name]) {
      if (name === 'home') this.scenes[name] = new HomeScene(this);
      if (name === 'gobang') this.scenes[name] = new GobangScene(this);
      if (name === 'tetris') this.scenes[name] = new TetrisScene(this);
    }
    this.current = this.scenes[name];
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
  }

  draw(ctx) {
    if (this.current && this.current.draw) this.current.draw(ctx);
  }

  handleTap(x, y) {
    if (this.current && this.current.handleTap) this.current.handleTap(x, y);
  }
}

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
}

function drawCard(ctx, x, y, w, h) {
  ctx.shadowColor = 'rgba(31, 41, 55, 0.08)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function createBackButton(onTap) {
  return new Button(16, safeTop + TOP_GAP, 88, 36, '← 返回', onTap, '#4b5563');
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}


function lightenColor(hex, amount) {
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * amount)));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function init() {
  const sys = wx.getSystemInfoSync();
  width = sys.windowWidth;
  height = sys.windowHeight;
  safeTop = sys.statusBarHeight || 0;
  canvas.width = width;
  canvas.height = height;

  const manager = new SceneManager();
  manager.switch('home');

  wx.onTouchStart((e) => {
    const touch = e.touches[0];
    manager.handleTap(touch.clientX, touch.clientY);
  });

  let last = Date.now();
  const loop = () => {
    const now = Date.now();
    const dt = now - last;
    last = now;

    manager.update(dt);
    manager.draw(ctx);

    requestAnimationFrame(loop);
  };

  loop();
}

init();
