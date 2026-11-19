import { ARENA } from "../sim/arena.js";

// Deterministic starfield (simple LCG) so it doesn't change between reloads.
const stars = (() => {
  let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: 140 }, () => ({
    x: rnd() * ARENA.width,
    y: rnd() * ARENA.height,
    r: 0.5 + rnd() * 1.3,
  }));
})();

// Clears the screen and sets up the world transform (arena scaled to fit, centered).
export function beginWorld(ctx, view) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, view.cssW, view.cssH);

  const scale = Math.min(view.cssW / ARENA.width, view.cssH / ARENA.height);
  const ox = (view.cssW - ARENA.width * scale) / 2;
  const oy = (view.cssH - ARENA.height * scale) / 2;
  ctx.setTransform(view.dpr * scale, 0, 0, view.dpr * scale, view.dpr * ox, view.dpr * oy);
}

export function drawBackground(ctx) {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  ctx.strokeStyle = "rgba(120,150,220,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ARENA.width; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = 0; y <= ARENA.height; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(120,150,220,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, ARENA.width, ARENA.height);
}

// Ship is drawn at the origin pointing right; the canvas is translated/rotated to place it.
export function drawShip(ctx, x, y, angle, thrust) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (thrust) {
    ctx.fillStyle = "#ff9a3c";
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-12 - 14 - Math.random() * 10, 0);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#7fd4ff";
  ctx.strokeStyle = "#e8f6ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawAsteroid(ctx, x, y, angle, shape) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  shape.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fillStyle = "#2a2f3f";
  ctx.fill();
  ctx.strokeStyle = "#8b93ad";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// HUD is drawn in screen space (after the world transform is reset).
export function drawHud(ctx, view, stats, game, best) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#9fe3a8";
  ctx.fillText(`steps/s:  ${stats.stepsPerSec}`, 12, 10);
  ctx.fillText(`frames/s: ${stats.fps}`, 12, 28);
  ctx.fillText(`frame ms: ${stats.frameMs.toFixed(1)}`, 12, 46);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`lives: ${game.lives}   time: ${game.time.toFixed(1)} s   best: ${best.toFixed(1)} s`, 12, 74);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("WASD / arrows: turn + thrust. Dodge the asteroids!", 12, 94);
}

export function drawGameOver(ctx, view, game) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, view.cssW, view.cssH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText("GAME OVER", view.cssW / 2, view.cssH / 2 - 40);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(`You survived ${game.time.toFixed(1)} s`, view.cssW / 2, view.cssH / 2 + 10);
  ctx.fillText("Press Enter to restart", view.cssW / 2, view.cssH / 2 + 42);
  ctx.textAlign = "left";
}
