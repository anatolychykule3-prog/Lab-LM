// Side-scroller mode: the rocket flies right, the world scrolls left, gravity pulls down.
// Pure simulation: no DOM, no clocks. Randomness comes from a seeded RNG.
import { ARENA } from "./arena.js";
import { createRng } from "./rng.js";

export const RUNNER = {
  lives: 3,
  shipRadius: 10,
  invulnTime: 1.5,
  gravity: 900,
  thrust: 1900, // net upward accel while holding thrust = thrust - gravity
  maxVy: 650,
  moveSpeed: 320, // horizontal nudging with A/D
  minX: 80,
  maxX: 800,
  baseSpeed: 320, // scroll speed, grows with time
  speedGain: 6,
  maxSpeed: 760,
  coinRadius: 16,
  coinScore: 50,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Remember the previous state on the object itself, for render interpolation.
function setPrev(o) {
  o.px = o.x;
  o.py = o.y;
  o.pa = o.angle;
}

function makeShape(rng, radius) {
  const n = 9 + Math.floor(rng() * 4);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (0.75 + rng() * 0.4);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

function spawnWave(game) {
  const { rng } = game;
  const H = ARENA.height;
  const radius = 28 + rng() * 40;
  const x = ARENA.width + radius + 20;
  const asteroid = {
    x,
    y: radius + rng() * (H - 2 * radius),
    vy: (rng() - 0.5) * 120,
    angle: 0,
    spin: (rng() - 0.5) * 1.5,
    radius: radius * 0.95,
    shape: makeShape(rng, radius),
  };
  setPrev(asteroid);
  game.obstacles.push(asteroid);

  const gap = Math.max(170, 380 - game.time * 2.5) * (0.7 + rng() * 0.6);
  if (rng() < 0.5) {
    const coin = { x: x + gap / 2, y: 60 + rng() * (H - 120), angle: 0 };
    setPrev(coin);
    game.coins.push(coin);
  }
  game.nextSpawn += gap;
}

export function createRunner(seed = 1) {
  const ship = { x: 260, y: ARENA.height / 2, vy: 0, angle: 0, thrust: false };
  setPrev(ship);
  return {
    rng: createRng(seed),
    ship,
    obstacles: [],
    coins: [],
    coinsCollected: 0,
    dist: 0,
    pdist: 0,
    nextSpawn: 0,
    speed: RUNNER.baseSpeed,
    time: 0,
    score: 0,
    lives: RUNNER.lives,
    invuln: 0,
    over: false,
  };
}

export function stepRunner(game, input, dt) {
  const { ship } = game;
  const H = ARENA.height;

  setPrev(ship);
  game.pdist = game.dist;
  game.obstacles.forEach(setPrev);
  game.coins.forEach(setPrev);

  if (game.over) return;

  game.time += dt;
  game.speed = Math.min(RUNNER.maxSpeed, RUNNER.baseSpeed + RUNNER.speedGain * game.time);
  const scroll = game.speed * dt;
  game.dist += scroll;
  game.invuln = Math.max(0, game.invuln - dt);

  // Ship: gravity + thrust vertically, small nudging horizontally.
  const up = input.isDown("ArrowUp") || input.isDown("KeyW") || input.isDown("Space");
  const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
  const right = input.isDown("ArrowRight") || input.isDown("KeyD");
  ship.thrust = up;
  ship.vy = clamp(ship.vy + (RUNNER.gravity - (up ? RUNNER.thrust : 0)) * dt, -RUNNER.maxVy, RUNNER.maxVy);
  ship.y += ship.vy * dt;
  if (ship.y < RUNNER.shipRadius) {
    ship.y = RUNNER.shipRadius;
    ship.vy = 0;
  } else if (ship.y > H - RUNNER.shipRadius) {
    ship.y = H - RUNNER.shipRadius;
    ship.vy = 0;
  }
  ship.x = clamp(ship.x + ((right ? 1 : 0) - (left ? 1 : 0)) * RUNNER.moveSpeed * dt, RUNNER.minX, RUNNER.maxX);
  ship.angle = clamp(ship.vy / 900, -0.6, 0.6);

  // World scrolls left; asteroids also drift vertically and bounce off the top/bottom.
  for (const o of game.obstacles) {
    o.x -= scroll;
    o.y += o.vy * dt;
    if (o.y < o.radius) {
      o.y = o.radius;
      o.vy = -o.vy;
    } else if (o.y > H - o.radius) {
      o.y = H - o.radius;
      o.vy = -o.vy;
    }
    o.angle += o.spin * dt;
  }
  for (const c of game.coins) c.x -= scroll;
  game.obstacles = game.obstacles.filter((o) => o.x > -o.radius - 100);
  game.coins = game.coins.filter((c) => c.x > -50);

  while (game.dist >= game.nextSpawn) spawnWave(game);

  // Coins.
  game.coins = game.coins.filter((c) => {
    const hit = Math.hypot(c.x - ship.x, c.y - ship.y) < RUNNER.coinRadius + RUNNER.shipRadius;
    if (hit) game.coinsCollected++;
    return !hit;
  });

  // Asteroids.
  if (game.invuln === 0) {
    for (const o of game.obstacles) {
      if (Math.hypot(o.x - ship.x, o.y - ship.y) < o.radius + RUNNER.shipRadius) {
        game.lives--;
        game.invuln = RUNNER.invulnTime;
        if (game.lives <= 0) game.over = true;
        break;
      }
    }
  }

  game.score = Math.floor(game.dist / 10) + game.coinsCollected * RUNNER.coinScore;
}
