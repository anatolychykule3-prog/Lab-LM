export const ARENA = { width: 1600, height: 900 };

function wrapValue(v, max) {
  return ((v % max) + max) % max;
}

export function wrap(ship) {
  ship.x = wrapValue(ship.x, ARENA.width);
  ship.y = wrapValue(ship.y, ARENA.height);
}
