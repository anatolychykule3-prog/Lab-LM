import { createLoop } from "./loop.js";
import { createInput } from "./input.js";
import { createGame, stepGame } from "./sim/game.js";
import { ARENA } from "./sim/arena.js";
import { createCanvas } from "./render/canvas.js";
import {
  beginWorld, drawBackground, drawShip, drawAsteroid, drawHud, drawGameOver,
} from "./render/draw.js";

const { ctx, view } = createCanvas(document.querySelector("#game"));
const input = createInput(window);

const newSeed = () => (Math.random() * 2 ** 32) >>> 0; // randomness lives outside the sim
let game = createGame(newSeed());
let best = 0;

const lerp = (a, b, t) => a + (b - a) * t;

// Shortest-path angle interpolation (handles the +PI/-PI seam).
function lerpAngle(a, b, t) {
  const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + d * t;
}

// Interpolate a coordinate, but snap if the object just wrapped around the arena edge.
function lerpWrapped(a, b, t, size) {
  return Math.abs(b - a) > size / 2 ? b : lerp(a, b, t);
}

function simulate(dt) {
  if (game.over && input.justPressed("Enter")) {
    game = createGame(newSeed());
  } else {
    stepGame(game, input, dt);
  }
  best = Math.max(best, game.time);
  input.endStep();
}

function render(alpha, stats) {
  beginWorld(ctx, view);
  drawBackground(ctx);

  game.asteroids.forEach((a, i) => {
    const p = game.prev.asteroids[i] ?? a;
    drawAsteroid(
      ctx,
      lerpWrapped(p.x, a.x, alpha, ARENA.width),
      lerpWrapped(p.y, a.y, alpha, ARENA.height),
      lerp(p.angle, a.angle, alpha),
      a.shape,
    );
  });

  if (!game.over) {
    const { ship, prev } = game;
    const blink = game.invuln > 0 && Math.floor(game.invuln * 10) % 2 === 0;
    if (!blink) {
      drawShip(
        ctx,
        lerpWrapped(prev.ship.x, ship.x, alpha, ARENA.width),
        lerpWrapped(prev.ship.y, ship.y, alpha, ARENA.height),
        lerpAngle(prev.ship.angle, ship.angle, alpha),
        ship.thrust,
      );
    }
  }

  drawHud(ctx, view, stats, game, best);
  if (game.over) drawGameOver(ctx, view, game);
}

const loop = createLoop({ simulate, render });
loop.start();
