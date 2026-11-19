import { ARENA } from "../sim/arena.js";
import { createRng } from "../sim/rng.js";

// Three parallax star layers (deterministic positions).
const rng = createRng(7);
const layers = [0.1, 0.25, 0.5].map((factor, i) => ({
  factor,
  size: 0.6 + i * 0.5,
  stars: Array.from({ length: 50 }, () => ({ x: rng() * ARENA.width, y: rng() * ARENA.height })),
}));

export function drawRunnerBackground(ctx, dist) {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (const layer of layers) {
    for (const s of layer.stars) {
      const x = (((s.x - dist * layer.factor) % ARENA.width) + ARENA.width) % ARENA.width;
      ctx.beginPath();
      ctx.arc(x, s.y, layer.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(120,150,220,0.35)";
  ctx.fillRect(0, 0, ARENA.width, 4);
  ctx.fillRect(0, ARENA.height - 4, ARENA.width, 4);
}

export function drawCoin(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd23c";
  ctx.fill();
  ctx.strokeStyle = "#fff3b0";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#b8860b";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", x, y + 1);
  ctx.textAlign = "left";
}

export function drawRunnerHud(ctx, view, stats, game, best) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#9fe3a8";
  ctx.fillText(`steps/s:  ${stats.stepsPerSec}`, 12, 10);
  ctx.fillText(`frames/s: ${stats.fps}`, 12, 28);
  ctx.fillText(`frame ms: ${stats.frameMs.toFixed(1)}`, 12, 46);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    `lives: ${game.lives}   score: ${game.score}   best: ${best}   coins: ${game.coinsCollected}`,
    12,
    74,
  );
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Hold W / Up / Space: thrust up. A/D: nudge. Dodge asteroids, grab coins.", 12, 94);
}

export function drawRunnerGameOver(ctx, view, game) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, view.cssW, view.cssH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText("GAME OVER", view.cssW / 2, view.cssH / 2 - 40);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(`Score: ${game.score}`, view.cssW / 2, view.cssH / 2 + 10);
  ctx.fillText("Press Enter to restart", view.cssW / 2, view.cssH / 2 + 42);
  ctx.textAlign = "left";
}
