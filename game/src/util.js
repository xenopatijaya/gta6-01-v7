// util.js — small math helpers shared by every Porto Alba II module.
export const TAU = Math.PI * 2;
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randi(a, b) { return Math.floor(rand(a, b + 1)); }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export function turnToward(cur, target, maxStep) {
  const d = angleDiff(cur, target);
  return cur + clamp(d, -maxStep, maxStep);
}
export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}
// Circle vs axis-aligned box push-out. Returns true when a collision happened.
export function collideCircleBox(px, pz, r, box) {
  const cx = clamp(px, box.x - box.hw, box.x + box.hw);
  const cz = clamp(pz, box.z - box.hd, box.z + box.hd);
  const dx = px - cx, dz = pz - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { x: (dx / d) * (r - d), z: (dz / d) * (r - d) };
  }
  return { x: r, z: 0 };
}
export function fmtCash(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
