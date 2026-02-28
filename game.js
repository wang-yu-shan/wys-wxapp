const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let width = 0;
let height = 0;

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
    this.boardPx = Math.min(width - boardPadding * 2, height - 180);
    this.cell = this.boardPx / (this.boardSize - 1);
    this.boardX = (width - this.boardPx) / 2;
    this.boardY = 80;
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
    ctx.fillText('五子棋', width / 2, 40);

    ctx.fillStyle = COLORS.subText;
    ctx.font = '18px sans-serif';
    ctx.fillText(this.message, width / 2, 66);

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
    this.cell = Math.floor(Math.min((width - 80) / this.cols, (height - 220) / this.rows));
    this.boardW = this.cell * this.cols;
    this.boardH = this.cell * this.rows;
    this.boardX = 24;
    this.boardY = 76;

    this.shapes = [
      { color: '#60a5fa', blocks: [[1, 1, 1, 1]] },
      { color: '#f97316', blocks: [[1, 1], [1, 1]] },
      { color: '#34d399', blocks: [[0, 1, 1], [1, 1, 0]] },
      { color: '#a78bfa', blocks: [[1, 1, 0], [0, 1, 1]] },
      { color: '#f43f5e', blocks: [[1, 1, 1], [0, 1, 0]] },
      { color: '#22d3ee', blocks: [[1, 1, 1], [1, 0, 0]] },
      { color: '#facc15', blocks: [[1, 1, 1], [0, 0, 1]] },
    ];

    this.score = 0;
    this.dropTimer = 0;
    this.dropInterval = 550;
    this.over = false;
    this.current = this.newPiece();

    this.backButton = createBackButton(() => manager.switch('home'));

    const ctlY = this.boardY + this.boardH + 16;
    this.btnLeft = new Button(24, ctlY, 72, 48, '←', () => this.move(-1, 0));
    this.btnRight = new Button(110, ctlY, 72, 48, '→', () => this.move(1, 0));
    this.btnRotate = new Button(196, ctlY, 96, 48, '旋转', () => this.rotate());
    this.btnDown = new Button(306, ctlY, 72, 48, '↓', () => {
      this.dropTimer = this.dropInterval;
    });
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

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('俄罗斯方块', width / 2, 40);

    this.backButton.draw(ctx);

    ctx.fillStyle = '#111827';
    roundRect(ctx, this.boardX - 6, this.boardY - 6, this.boardW + 12, this.boardH + 12, 10);
    ctx.fill();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.grid[r][c];
        if (val) {
          this.drawCell(c, r, val);
        } else {
          ctx.fillStyle = '#1f293780';
          ctx.fillRect(this.boardX + c * this.cell + 1, this.boardY + r * this.cell + 1, this.cell - 2, this.cell - 2);
        }
      }
    }

    if (this.current) {
      this.drawBlocks(this.current.x, this.current.y, this.current.blocks, this.current.color);
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${this.score}`, 24, this.boardY + this.boardH + 88);

    this.btnLeft.draw(ctx);
    this.btnRight.draw(ctx);
    this.btnRotate.draw(ctx);
    this.btnDown.draw(ctx);

    if (this.over) {
      ctx.fillStyle = '#00000088';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', width / 2, height / 2 - 20);
      ctx.font = '24px sans-serif';
      ctx.fillText(`得分 ${this.score}`, width / 2, height / 2 + 20);
    }
  }

  handleTap(x, y) {
    if (this.backButton.contains(x, y)) {
      this.backButton.onTap();
      return;
    }
    if (this.over) {
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.score = 0;
      this.over = false;
      this.current = this.newPiece();
      return;
    }

    [this.btnLeft, this.btnRight, this.btnRotate, this.btnDown].forEach((btn) => {
      if (btn.contains(x, y)) btn.onTap();
    });
  }

  drawCell(c, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(this.boardX + c * this.cell + 1, this.boardY + r * this.cell + 1, this.cell - 2, this.cell - 2);
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
  return new Button(16, 20, 88, 36, '← 返回', onTap, '#4b5563');
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

function init() {
  const sys = wx.getSystemInfoSync();
  width = sys.windowWidth;
  height = sys.windowHeight;
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
