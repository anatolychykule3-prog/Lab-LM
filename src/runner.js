import { createLoop } from "./loop.js";
import { createInput } from "./input.js";
import { createRunner, stepRunner } from "./sim/runner.js";
import { createCanvas } from "./render/canvas.js";
import { beginWorld, drawShip, drawAsteroid } from "./render/draw.js";
import {
  drawRunnerBackground, drawCoin, drawRunnerHud, drawRunnerGameOver,
} from "./render/drawRunner.js";

const { ctx, view } = createCanvas(document.querySelector("#game"));
const input = createInput(window);

const newSeed = () => (Math.random() * 2 ** 32) >>> 0; // randomness lives outside the sim
let game = createRunner(newSeed());
let best = 0;

const lerp = (a, b, t) => a + (b - a) * t;

function simulate(dt) {
  if (game.over && input.justPressed("Enter")) {
    game = createRunner(newSeed());
  } else {
    stepRunner(game, input, dt);
  }
  best = Math.max(best, game.score);
  input.endStep();
}

function render(alpha, stats) {
  beginWorld(ctx, view);
  drawRunnerBackground(ctx, lerp(game.pdist, game.dist, alpha));

  for (const c of game.coins) drawCoin(ctx, lerp(c.px, c.x, alpha), lerp(c.py, c.y, alpha));
  for (const o of game.obstacles) {
    drawAsteroid(ctx, lerp(o.px, o.x, alpha), lerp(o.py, o.y, alpha), lerp(o.pa, o.angle, alpha), o.shape);
  }

  if (!game.over) {
    const s = game.ship;
    const blink = game.invuln > 0 && Math.floor(game.invuln * 10) % 2 === 0;
    if (!blink) {
      drawShip(ctx, lerp(s.px, s.x, alpha), lerp(s.py, s.y, alpha), lerp(s.pa, s.angle, alpha), s.thrust);
    }
  }

  drawRunnerHud(ctx, view, stats, game, best);
  if (game.over) drawRunnerGameOver(ctx, view, game);
}

createLoop({ simulate, render }).start();
