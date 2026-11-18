// input.js — keyboard + mouse state for Porto Alba II.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    camYaw: Math.PI,       // camera orbit yaw (radians)
    camPitch: 0.42,
    dragging: false,
    shootQueued: false,
    onKey: null,           // callback(code) for single-press actions
    onShoot: null,         // callback() when the player fires
    onInteract: null,      // callback() for E
    onSideJob: null,       // callback() for J
    onPause: null,
    onMute: null,
    onReload: null,
  };
  const down = (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (input.onKey) input.onKey(e.code);
    if (e.code === 'KeyF') input.shootQueued = true;
    if (e.code === 'KeyE' && input.onInteract) input.onInteract();
    if (e.code === 'KeyJ' && input.onSideJob) input.onSideJob();
    if (e.code === 'KeyP' && input.onPause) input.onPause();
    if (e.code === 'KeyM' && input.onMute) input.onMute();
    if (e.code === 'KeyR' && input.onReload) input.onReload();
    if (e.code === 'Space') e.preventDefault();
  };
  const up = (e) => keys.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());
  let lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    input.dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!input.dragging) return;
    input.camYaw -= (e.clientX - lastX) * 0.005;
    input.camPitch = Math.max(0.08, Math.min(1.1, input.camPitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = () => { input.dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && input.onShoot) input.onShoot();
  });
  input.axis = () => {
    let x = 0, z = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len, active: x !== 0 || z !== 0 };
  };
  input.running = () => keys.has('ShiftLeft') || keys.has('ShiftRight');
  input.handbrake = () => keys.has('Space');
  return input;
}
