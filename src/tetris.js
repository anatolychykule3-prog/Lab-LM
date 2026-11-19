import { createLoop } from "./loop.js";
import { createInput } from "./input.js";
import { createTetris, stepTetris } from "./sim/tetris.js";
import { createCanvas } from "./render/canvas.js";
import { beginTetrisWorld, drawTetris, drawTetrisHud } from "./render/drawTetris.js";

const { ctx, view } = createCanvas(document.querySelector("#game"));
const input = createInput(window);

const newSeed = () => (Math.random() * 2 ** 32) >>> 0; // randomness lives outside the sim
let game = createTetris(newSeed());
let best = 0;

function simulate(dt) {
  if (game.over && input.justPressed("Enter")) {
    game = createTetris(newSeed());
  } else {
    stepTetris(game, input, dt);
  }
  best = Math.max(best, game.score);
  input.endStep();
}

// Tetris state is discrete (cell by cell), so the renderer does not need alpha.
function render(_alpha, stats) {
  beginTetrisWorld(ctx, view);
  drawTetris(ctx, game, best);
  drawTetrisHud(ctx, view, stats);
}

createLoop({ simulate, render }).start();
