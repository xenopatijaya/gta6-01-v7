// save.js — localStorage save / load for Porto Alba II.
const KEY = 'portoalba2-save-v1';
export function saveGame(state, playerPos) {
  try {
    const data = {
      cash: state.cash,
      mission: state.mission,
      sideJobs: state.sideJobs,
      totalEarned: state.totalEarned,
      x: playerPos.x,
      z: playerPos.z,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.cash !== 'number') return null;
    return d;
  } catch (e) { return null; }
}
export function hasSave() { return loadGame() !== null; }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
