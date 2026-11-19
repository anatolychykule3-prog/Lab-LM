const GAME_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space",
]);

// Closure over key state: `down` and `pressed` are private, the returned object is the API.
export function createInput(target) {
  const down = new Set(); // currently held
  const pressed = new Set(); // went down since the last simulation step

  target.addEventListener("keydown", (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!down.has(e.code)) pressed.add(e.code); // ignore auto-repeat
    down.add(e.code);
  });
  target.addEventListener("keyup", (e) => down.delete(e.code));
  // Losing focus would otherwise leave keys "stuck".
  window.addEventListener("blur", () => down.clear());

  return {
    isDown: (code) => down.has(code),
    justPressed: (code) => pressed.has(code),
    // Call after every simulation step so edge-triggered keys fire exactly once.
    endStep: () => pressed.clear(),
  };
}
