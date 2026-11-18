// effects.js — sparks, tracers, muzzle flash and floating damage puffs.
import * as THREE from 'three';
export function createEffects(scene) {
  const sparks = [];
  const tracers = [];
  const flash = new THREE.PointLight(0xffcc66, 0, 14, 1.6);
  scene.add(flash);
  const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const effects = { sparks, tracers, flash };
  effects.burst = (x, y, z, n, color) => {
    for (let i = 0; i < (n || 10); i++) {
      const m = new THREE.Mesh(sparkGeo, color ? new THREE.MeshBasicMaterial({ color }) : sparkMat);
      m.position.set(x, y, z);
      scene.add(m);
      sparks.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 9, vy: Math.random() * 7 + 2, vz: (Math.random() - 0.5) * 9,
        life: 0.45 + Math.random() * 0.25,
      });
    }
  };
  effects.tracer = (from, to) => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 }));
    scene.add(line);
    tracers.push({ line, life: 0.09 });
  };
  effects.muzzle = (pos) => {
    flash.position.copy(pos);
    flash.intensity = 26;
  };
  effects.update = (dt) => {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { scene.remove(s.mesh); s.mesh.material.dispose(); sparks.splice(i, 1); continue; }
      s.vy -= 22 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      if (s.mesh.position.y < 0.05) s.mesh.position.y = 0.05;
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); tracers.splice(i, 1); }
    }
    flash.intensity = Math.max(0, flash.intensity - dt * 260);
  };
  return effects;
}
