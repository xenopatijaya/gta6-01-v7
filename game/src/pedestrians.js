// pedestrians.js — 26 Alba citizens: stroll the sidewalks, cross at intersections,
// and run from gunfire or a speeding car.
import * as THREE from 'three';
import { clamp, dist2, pick, rand, randi } from './util.js';
import { STREET, CITY_MIN, CITY_MAX } from './city.js';

const SHIRTS = [0xd83a2a, 0x2a6ad8, 0xe8c23a, 0x3a9e4a, 0xe8e8e8, 0x7a3ad8, 0xd86a2a, 0x2a9e8a];

export function createPedestrians(scene) {
  const peds = [];
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.95, 0.4);
  const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
  const legGeo = new THREE.BoxGeometry(0.28, 0.8, 0.32);
  for (let i = 0; i < 26; i++) {
    const shirt = new THREE.MeshStandardMaterial({ color: pick(SHIRTS), roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: pick([0xd8a077, 0xb87a55, 0x8a5a3a, 0xe8b89a]), roughness: 0.8 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, shirt); body.position.y = 1.1; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(headGeo, skin); head.position.y = 1.85; g.add(head);
    const legL = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x2a2d44, roughness: 0.9 }));
    legL.position.set(-0.18, 0.4, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    const x = rand(-145, 145), z = rand(-145, 145);
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      mesh: g, legL, legR, x, z, heading: rand(0, Math.PI * 2),
      speed: rand(1.2, 2.2), alive: true, fleeing: 0, phase: rand(0, 6),
      targetX: x, targetZ: z, down: 0,
    });
  }
  function pickTarget(p) {
    // Walk along a sidewalk to a nearby street corner, then cross.
    const sx = pick(STREET), sz = pick(STREET);
    p.targetX = clamp(sx + rand(-8, 8), CITY_MIN, CITY_MAX);
    p.targetZ = clamp(sz + rand(-8, 8), CITY_MIN, CITY_MAX);
  }
  for (const p of peds) pickTarget(p);
  peds.update = (dt, player, threat) => {
    for (const p of peds) {
      if (!p.alive) {
        if (p.down > 0) { p.down -= dt; if (p.down <= 0) { p.alive = true; p.mesh.visible = true; p.x = rand(-145, 145); p.z = rand(-145, 145); pickTarget(p); } }
        continue;
      }
      // Flee from gunfire / fast cars near the player.
      if (threat && dist2(p.x, p.z, player.x, player.z) < 900) p.fleeing = 1.6;
      let tx = p.targetX, tz = p.targetZ, sp = p.speed;
      if (p.fleeing > 0) {
        p.fleeing -= dt;
        const dx = p.x - player.x, dz = p.z - player.z;
        const d = Math.hypot(dx, dz) || 1;
        tx = p.x + (dx / d) * 20; tz = p.z + (dz / d) * 20; sp = 6.5;
      }
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) { if (p.fleeing <= 0) pickTarget(p); }
      else {
        const want = Math.atan2(dx, dz);
        let diff = want - p.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.heading += clamp(diff, -3 * dt, 3 * dt);
        p.x += Math.sin(p.heading) * sp * dt;
        p.z += Math.cos(p.heading) * sp * dt;
        p.x = clamp(p.x, CITY_MIN, 200); p.z = clamp(p.z, CITY_MIN, CITY_MAX);
        p.phase += dt * sp * 3;
      }
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      const sw = Math.sin(p.phase) * 0.5;
      p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
    }
  };
  peds.knockDown = (p) => {
    p.alive = false; p.down = 6;
    p.mesh.rotation.z = Math.PI / 2;
    p.mesh.position.y = 0.3;
    setTimeout(() => { if (!p.alive) { p.mesh.rotation.z = 0; p.mesh.position.y = 0; } }, 100);
  };
  return peds;
}
