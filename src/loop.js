// Fixed-timestep loop: simulate() runs at exactly 1/step Hz,
// render(alpha) runs once per display frame (requestAnimationFrame).
export function createLoop({ step = 1 / 60, simulate, render }) {
  const MAX_FRAME = 0.25; // clamp: never spiral after a hitch / background tab
  let accumulator = 0;
  let last = null;
  let rafId = null;
  let stepCount = 0;
  let frameCount = 0;
  let statsTime = 0;

  // Live numbers for the HUD.
  const stats = { stepsPerSec: 0, fps: 0, frameMs: 0 };

  function frame(now) {
    if (last === null) {
      last = now;
      statsTime = now;
    }
    const frameMs = Math.max(0, now - last);
    last = now;
    accumulator += Math.min(frameMs / 1000, MAX_FRAME);

    while (accumulator >= step) {
      simulate(step);
      accumulator -= step;
      stepCount++;
    }

    frameCount++;
    stats.frameMs = frameMs;
    if (now - statsTime >= 1000) {
      const seconds = (now - statsTime) / 1000;
      stats.stepsPerSec = Math.round(stepCount / seconds);
      stats.fps = Math.round(frameCount / seconds);
      stepCount = 0;
      frameCount = 0;
      statsTime = now;
    }

    render(accumulator / step, stats); // alpha in [0, 1)
    rafId = requestAnimationFrame(frame);
  }

  return {
    stats,
    start() {
      if (rafId !== null) return;
      last = null;
      accumulator = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
