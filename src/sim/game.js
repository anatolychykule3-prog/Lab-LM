// Game rules: asteroids to dodge, lives, survival time. Pure simulation: no DOM, no clocks.
import { createShip, integrate } from "./ship.js";
import { ARENA, wrap } from "./arena.js";
import { createRng } from "./rng.js";

export const GAME = {
  lives: 3,
  shipRadius: 10,
  invulnTime: 2, // seconds of protection after (re)spawn
  startAsteroids: 8,
  maxAsteroids: 22,
  spawnEvery: 8, // seconds between new asteroids
};

function makeAsteroid(rng, x, y) {
  const radius = 25 + rng() * 45;
  const speed = 25 + rng() * 60;
  const dir = rng() * Math.PI * 2;
  const n = 9 + Math.floor(rng() * 4);
  const shape = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (0.75 + rng() * 0.4);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  return {
    x, y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    angle: 0,
    spin: (rng() - 0.5) * 1.2,
    radius: radius * 0.95, // collision radius
    shape,
  };
}

// Pick a spawn point at least minDist away from the ship.
function spawnAsteroid(game, minDist) {
  const { rng, ship } = game;
  let x = 0, y = 0;
  for (let i = 0; i < 10; i++) {
    x = rng() * ARENA.width;
    y = rng() * ARENA.height;
    if (Math.hypot(x - ship.x, y - ship.y) >= minDist) break;
  }
  game.asteroids.push(makeAsteroid(rng, x, y));
}

export function createGame(seed = 1) {
  const ship = createShip(ARENA.width / 2, ARENA.height / 2);
  const game = {
    rng: createRng(seed),
    ship,
    asteroids: [],
    prev: { ship: { x: ship.x, y: ship.y, angle: ship.angle }, asteroids: [] },
    lives: GAME.lives,
    time: 0,
    invuln: GAME.invulnTime,
    spawnTimer: 0,
    over: false,
  };
  for (let i = 0; i < GAME.startAsteroids; i++) spawnAsteroid(game, 300);
  return game;
}

function respawn(game) {
  const s = game.ship;
  s.x = ARENA.width / 2;
  s.y = ARENA.height / 2;
  s.vx = 0;
  s.vy = 0;
  s.angle = -Math.PI / 2;
  game.invuln = GAME.invulnTime;
  game.prev.ship = { x: s.x, y: s.y, angle: s.angle }; // no interpolation streak across the arena
}

export function stepGame(game, input, dt) {
  const { ship } = game;

  // Snapshot for render interpolation.
  game.prev.ship = { x: ship.x, y: ship.y, angle: ship.angle };
  game.prev.asteroids = game.asteroids.map((a) => ({ x: a.x, y: a.y, angle: a.angle }));

  if (game.over) return;

  game.time += dt;
  integrate(ship, input, dt);
  wrap(ship);
  game.invuln = Math.max(0, game.invuln - dt);

  for (const a of game.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle += a.spin * dt;
    wrap(a);
  }

  game.spawnTimer += dt;
  if (game.spawnTimer >= GAME.spawnEvery) {
    game.spawnTimer -= GAME.spawnEvery;
    if (game.asteroids.length < GAME.maxAsteroids) spawnAsteroid(game, 350);
  }

  if (game.invuln === 0) {
    for (const a of game.asteroids) {
      if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.radius + GAME.shipRadius) {
        game.lives--;
        if (game.lives <= 0) game.over = true;
        else respawn(game);
        break;
      }
    }
  }
}
