// Tetris drawn like a power-outage schedule table ("Група №1"):
//   white cell = "Світло є" (empty), light gray = "Можливе відключення" (falling piece),
//   dark gray with navy bolt = "Світла немає" (locked block).
import { COLS, ROWS, PIECES, pieceCells, ghostCells } from "../sim/tetris.js";

export const WORLD = { w: 760, h: 900 };

const C = {
  page: "#d3d6db",
  card: "#eceef1",
  head: "#f3f4f6",
  border: "#b4b9c1",
  white: "#ffffff",
  lockedFill: "#8f949d",
  lockedIcon: "#1b2542",
  possFill: "#d5d8dd",
  possIcon: "#8a92a1",
  yellow: "#fadc1e",
  text: "#1b1f2a",
};
const FONT = '"Segoe UI", system-ui, Arial, sans-serif';
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const CELL = 32;
const LABEL_W = 52;
const HEADER_H = 52;
const TX = 40;
const TY = 118;
const BX = TX + LABEL_W;
const BY = TY + HEADER_H;
const PX = 450;
const PW = 270;

export function beginTetrisWorld(ctx, view) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, view.cssW, view.cssH);
  const scale = Math.min(view.cssW / WORLD.w, view.cssH / WORLD.h);
  const ox = (view.cssW - WORLD.w * scale) / 2;
  const oy = (view.cssH - WORLD.h * scale) / 2;
  ctx.setTransform(view.dpr * scale, 0, 0, view.dpr * scale, view.dpr * ox, view.dpr * oy);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function box(ctx, x, y, w, h, fill = C.white) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function text(ctx, str, x, y, { size = 14, bold = true, align = "center", color = C.text } = {}) {
  ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function pill(ctx, cx, cy, w, h, str, size) {
  roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  text(ctx, str, cx, cy + 1, { size });
}

function drawBolt(ctx, x, y, s, color) {
  const pts = [[0.58, 0.12], [0.3, 0.55], [0.48, 0.55], [0.4, 0.88], [0.72, 0.42], [0.52, 0.42]];
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// kind: "empty" | "active" | "locked" | "ghost"
function drawCell(ctx, x, y, s, kind) {
  const fill = { empty: C.white, active: C.possFill, locked: C.lockedFill, ghost: "#f6f7f9" }[kind];
  box(ctx, x, y, s, s, fill);
  if (kind === "locked") drawBolt(ctx, x, y, s, C.lockedIcon);
  if (kind === "active") drawBolt(ctx, x, y, s, C.possIcon);
  if (kind === "ghost") {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#7d8594";
    ctx.strokeRect(x + 3.5, y + 3.5, s - 7, s - 7);
    ctx.restore();
  }
}

function drawBoard(ctx, game) {
  // Header row: hour ranges, rotated.
  box(ctx, TX, TY, LABEL_W, HEADER_H, C.head);
  text(ctx, "Часові", TX + LABEL_W / 2, TY + 20, { size: 10 });
  text(ctx, "проміжки", TX + LABEL_W / 2, TY + 33, { size: 10 });
  for (let c = 0; c < COLS; c++) {
    const x = BX + c * CELL;
    box(ctx, x, TY, CELL, HEADER_H, C.head);
    ctx.save();
    ctx.translate(x + CELL / 2, TY + HEADER_H / 2);
    ctx.rotate(-Math.PI / 2);
    text(ctx, `${String(c).padStart(2, "0")}-${String(c + 1).padStart(2, "0")}`, 0, 0, { size: 11 });
    ctx.restore();
  }
  // Left column: days of the week.
  for (let r = 0; r < ROWS; r++) {
    box(ctx, TX, BY + r * CELL, LABEL_W, CELL, C.head);
    text(ctx, DAYS[r % 7], TX + LABEL_W / 2, BY + r * CELL + CELL / 2 + 1, { size: 13 });
  }
  // Cells.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawCell(ctx, BX + c * CELL, BY + r * CELL, CELL, game.board[r * COLS + c] ? "locked" : "empty");
    }
  }
  if (!game.over) {
    for (const [x, y] of ghostCells(game)) {
      if (y >= 0) drawCell(ctx, BX + x * CELL, BY + y * CELL, CELL, "ghost");
    }
    for (const [x, y] of pieceCells(game.piece)) {
      if (y >= 0) drawCell(ctx, BX + x * CELL, BY + y * CELL, CELL, "active");
    }
  }
}

function drawSide(ctx, game, best) {
  let y = TY;

  // Next piece.
  box(ctx, PX, y, PW, 36, C.head);
  text(ctx, "Далі", PX + PW / 2, y + 19, { size: 16 });
  y += 36;
  box(ctx, PX, y, PW, 140);
  const ns = 30;
  const gx = PX + (PW - 4 * ns) / 2;
  const gy = y + (140 - 4 * ns) / 2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) drawCell(ctx, gx + c * ns, gy + r * ns, ns, "empty");
  const next = PIECES[game.queue[0]];
  const xs = next.cells.map((p) => p[0]);
  const ys = next.cells.map((p) => p[1]);
  const offX = Math.floor((4 - (Math.max(...xs) - Math.min(...xs) + 1)) / 2) - Math.min(...xs);
  const offY = Math.floor((4 - (Math.max(...ys) - Math.min(...ys) + 1)) / 2) - Math.min(...ys);
  for (const [cx, cy] of next.cells) drawCell(ctx, gx + (cx + offX) * ns, gy + (cy + offY) * ns, ns, "active");
  y += 140 + 16;

  // Stats.
  const rows = [
    ["Рахунок", game.score],
    ["Рекорд", best],
    ["Лінії", game.lines],
    ["Рівень", game.level],
  ];
  for (const [label, value] of rows) {
    box(ctx, PX, y, 120, 40, C.head);
    text(ctx, label, PX + 12, y + 21, { size: 15, align: "left" });
    box(ctx, PX + 120, y, PW - 120, 40);
    text(ctx, String(value), PX + PW - 12, y + 21, { size: 20, align: "right" });
    y += 40;
  }
  y += 16;

  // Controls.
  box(ctx, PX, y, PW, 36, C.head);
  text(ctx, "Керування", PX + PW / 2, y + 19, { size: 16 });
  y += 36;
  const keys = [
    ["← →", "Рух"],
    ["↑ / X", "Поворот"],
    ["Z", "Поворот назад"],
    ["↓", "Швидко вниз"],
    ["Пробіл", "Скинути вниз"],
    ["P", "Пауза"],
  ];
  for (const [k, action] of keys) {
    box(ctx, PX, y, 100, 28, C.head);
    text(ctx, k, PX + 50, y + 15, { size: 13 });
    box(ctx, PX + 100, y, PW - 100, 28);
    text(ctx, action, PX + 112, y + 15, { size: 13, bold: false, align: "left" });
    y += 28;
  }
}

function drawLegend(ctx) {
  const items = [
    [60, "empty", "Світло є"],
    [245, "active", "Можливе відключення"],
    [530, "locked", "Світла немає"],
  ];
  for (const [x, kind, label] of items) {
    drawCell(ctx, x, 836, 30, kind);
    text(ctx, label, x + 40, 852, { size: 15, bold: false, align: "left" });
  }
}

function drawOverlay(ctx, title, lines) {
  ctx.fillStyle = "rgba(236,238,241,0.88)";
  ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
  const cx = BX + (COLS * CELL) / 2;
  const cy = BY + 270;
  pill(ctx, cx, cy, 270, 64, title, 28);
  lines.forEach((l, i) => text(ctx, l, cx, cy + 60 + i * 28, { size: 17 }));
}

export function drawTetris(ctx, game, best) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = C.card;
  roundRectPath(ctx, 10, 10, WORLD.w - 20, WORLD.h - 20, 22);
  ctx.fill();
  ctx.restore();

  pill(ctx, WORLD.w / 2, 62, 230, 56, "Група №1", 32);
  drawBoard(ctx, game);
  drawSide(ctx, game, best);
  drawLegend(ctx);

  if (game.over) drawOverlay(ctx, "Світла немає!", [`Рахунок: ${game.score}`, "Enter — спочатку"]);
  else if (game.paused) drawOverlay(ctx, "Пауза", ["P — продовжити"]);
}

export function drawTetrisHud(ctx, view, stats) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#4a5160";
  ctx.fillText(`steps/s:  ${stats.stepsPerSec}`, 10, 8);
  ctx.fillText(`frames/s: ${stats.fps}`, 10, 24);
  ctx.fillText(`frame ms: ${stats.frameMs.toFixed(1)}`, 10, 40);
}
