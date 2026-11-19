// Tetris rules. Pure simulation: no DOM, no clocks. Randomness from a seeded RNG (7-bag).
import { createRng } from "./rng.js";

export const COLS = 10;
export const ROWS = 20;

export const TETRIS = {
  das: 0.17, // delay before auto-repeat (s)
  arr: 0.05, // auto-repeat interval (s)
  lockDelay: 0.5,
  maxLockResets: 15,
  softDropFactor: 20,
};

// Cells of each piece in its spawn rotation, inside a size x size box.
export const PIECES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
export const TYPES = Object.keys(PIECES);

// Absolute board cells of a piece {type, rot, x, y}.
export function pieceCells(piece) {
  const { size, cells } = PIECES[piece.type];
  return cells.map(([cx, cy]) => {
    let x = cx;
    let y = cy;
    for (let i = 0; i < piece.rot; i++) [x, y] = [size - 1 - y, x]; // rotate clockwise
    return [x + piece.x, y + piece.y];
  });
}

function collides(board, cells) {
  for (const [x, y] of cells) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y * COLS + x] !== 0) return true;
  }
  return false;
}

// Removes full rows, returns how many were removed.
export function clearLines(board) {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    let full = true;
    for (let x = 0; x < COLS; x++) {
      if (board[y * COLS + x] === 0) {
        full = false;
        break;
      }
    }
    if (full) {
      board.copyWithin(COLS, 0, y * COLS); // everything above moves down one row
      board.fill(0, 0, COLS);
      cleared++;
      y++; // re-check this row index
    }
  }
  return cleared;
}

export function gravityInterval(level) {
  return Math.max(0.02, Math.pow(0.8 - (level - 1) * 0.007, level - 1));
}

function refill(game) {
  while (game.queue.length < 7) {
    const bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(game.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    game.queue.push(...bag);
  }
}

function spawn(game) {
  const type = game.queue.shift();
  refill(game);
  game.piece = { type, rot: 0, x: type === "O" ? 4 : 3, y: type === "I" ? -1 : 0 };
  game.dropTimer = 0;
  game.lockTimer = 0;
  game.lockResets = 0;
  if (collides(game.board, pieceCells(game.piece))) game.over = true;
}

export function createTetris(seed = 1) {
  const game = {
    rng: createRng(seed),
    board: new Uint8Array(COLS * ROWS), // 0 = empty, otherwise piece index + 1
    piece: null,
    queue: [],
    score: 0,
    lines: 0,
    level: 1,
    time: 0,
    over: false,
    paused: false,
    dropTimer: 0,
    lockTimer: 0,
    lockResets: 0,
    dasDir: 0,
    dasTimer: 0,
  };
  refill(game);
  spawn(game);
  return game;
}

export function ghostCells(game) {
  const { board, piece } = game;
  let dy = 0;
  while (!collides(board, pieceCells({ ...piece, y: piece.y + dy + 1 }))) dy++;
  return pieceCells({ ...piece, y: piece.y + dy });
}

function isGrounded(game) {
  return collides(game.board, pieceCells({ ...game.piece, y: game.piece.y + 1 }));
}

// A move/rotation while resting on the stack postpones locking (a limited number of times).
function onMoved(game) {
  if (game.lockTimer > 0 && game.lockResets < TETRIS.maxLockResets) {
    game.lockTimer = 0;
    game.lockResets++;
  }
}

function tryMove(game, dx, dy) {
  const next = { ...game.piece, x: game.piece.x + dx, y: game.piece.y + dy };
  if (collides(game.board, pieceCells(next))) return false;
  game.piece = next;
  return true;
}

const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

function tryRotate(game, dir) {
  const rot = (game.piece.rot + dir + 4) % 4;
  for (const [kx, ky] of KICKS) {
    const next = { ...game.piece, rot, x: game.piece.x + kx, y: game.piece.y + ky };
    if (!collides(game.board, pieceCells(next))) {
      game.piece = next;
      onMoved(game);
      return;
    }
  }
}

const SCORES = [0, 100, 300, 500, 800];

function lockPiece(game) {
  const id = TYPES.indexOf(game.piece.type) + 1;
  for (const [x, y] of pieceCells(game.piece)) {
    if (y < 0) {
      game.over = true; // locked above the board
      return;
    }
    game.board[y * COLS + x] = id;
  }
  const cleared = clearLines(game.board);
  if (cleared > 0) {
    game.score += SCORES[cleared] * game.level;
    game.lines += cleared;
    game.level = 1 + Math.floor(game.lines / 10);
  }
  spawn(game);
}

function hardDrop(game) {
  let d = 0;
  while (tryMove(game, 0, 1)) d++;
  game.score += 2 * d;
  lockPiece(game);
}

function horizontal(game, input, dt) {
  const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
  const right = input.isDown("ArrowRight") || input.isDown("KeyD");
  const dir = right && !left ? 1 : left && !right ? -1 : 0;
  if (dir === 0) {
    game.dasDir = 0;
    game.dasTimer = 0;
    return;
  }
  if (dir !== game.dasDir) {
    game.dasDir = dir;
    game.dasTimer = 0;
    if (tryMove(game, dir, 0)) onMoved(game);
    return;
  }
  game.dasTimer += dt;
  if (game.dasTimer >= TETRIS.das) {
    game.dasTimer -= TETRIS.arr;
    if (tryMove(game, dir, 0)) onMoved(game);
  }
}

export function stepTetris(game, input, dt) {
  if (game.over) return;
  if (input.justPressed("KeyP")) game.paused = !game.paused;
  if (game.paused) return;
  game.time += dt;

  horizontal(game, input, dt);

  if (input.justPressed("ArrowUp") || input.justPressed("KeyW") || input.justPressed("KeyX")) {
    tryRotate(game, 1);
  }
  if (input.justPressed("KeyZ")) tryRotate(game, -1);
  if (input.justPressed("Space")) {
    hardDrop(game);
    return;
  }

  const soft = input.isDown("ArrowDown") || input.isDown("KeyS");
  const interval = gravityInterval(game.level);
  game.dropTimer += dt * (soft ? TETRIS.softDropFactor : 1);
  while (game.dropTimer >= interval) {
    game.dropTimer -= interval;
    if (tryMove(game, 0, 1)) {
      if (soft) game.score += 1;
    } else {
      game.dropTimer = 0;
      break;
    }
  }

  if (isGrounded(game)) {
    game.lockTimer += dt;
    if (game.lockTimer >= TETRIS.lockDelay) lockPiece(game);
  } else {
    game.lockTimer = 0;
  }
}
