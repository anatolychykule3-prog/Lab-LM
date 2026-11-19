// DPR-aware canvas that fills the window.
export function createCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const view = { cssW: 0, cssH: 0, dpr: 1 };

  function resize() {
    view.dpr = window.devicePixelRatio || 1;
    view.cssW = window.innerWidth;
    view.cssH = window.innerHeight;
    canvas.style.width = `${view.cssW}px`;
    canvas.style.height = `${view.cssH}px`;
    canvas.width = Math.round(view.cssW * view.dpr); // resets the context transform
    canvas.height = Math.round(view.cssH * view.dpr);
  }

  window.addEventListener("resize", resize);
  resize();
  return { ctx, view };
}
