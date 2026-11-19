// Pure simulation: no DOM, no canvas, no clocks. State + input + dt -> new state.
export const SHIP = {
  turnSpeed: 4.2, // rad/s
  thrustAccel: 420, // units/s^2
  drag: 0.9, // 1/s, exponential velocity decay
  maxSpeed: 520, // units/s
};

export function createShip(x, y) {
  return { x, y, vx: 0, vy: 0, angle: -Math.PI / 2, thrust: false };
}

export function integrate(ship, input, dt) {
  const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
  const right = input.isDown("ArrowRight") || input.isDown("KeyD");
  ship.thrust = input.isDown("ArrowUp") || input.isDown("KeyW");

  ship.angle += ((right ? 1 : 0) - (left ? 1 : 0)) * SHIP.turnSpeed * dt;
  // Keep the angle in [-PI, PI) so it never grows unbounded.
  ship.angle = ((((ship.angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

  if (ship.thrust) {
    ship.vx += Math.cos(ship.angle) * SHIP.thrustAccel * dt;
    ship.vy += Math.sin(ship.angle) * SHIP.thrustAccel * dt;
  }

  const k = Math.exp(-SHIP.drag * dt);
  ship.vx *= k;
  ship.vy *= k;

  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx *= SHIP.maxSpeed / speed;
    ship.vy *= SHIP.maxSpeed / speed;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}
