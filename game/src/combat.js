// combat.js — shooting: crosshair raycast, tracers, muzzle flash, sparks,
// ammo + reload, and the wanted consequences of pulling the trigger in public.
import * as THREE from 'three';
import { dist2 } from './util.js';

export function createCombat(scene, camera, effects) {
  const ray = new THREE.Raycaster();
  const combat = {
    ammo: 12, magSize: 12, reloading: 0,
    shoot(state, player, peds, police, vehicles) {
      if (combat.reloading > 0 || combat.ammo <= 0) return 'empty';
      combat.ammo--;
      const origin = new THREE.Vector3();
      player.cameraTarget(origin);
      origin.y += 0.4;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      ray.set(origin, dir);
      ray.far = 70;
      // Find the closest hittable: pedestrians, officers, police cars, parked cars.
      let best = null, bestD = 70;
      function test(x, z, y, r, kind, ref) {
        const dx = x - origin.x, dy = y - origin.y, dz = z - origin.z;
        const t = dx * dir.x + dy * dir.y + dz * dir.z;
        if (t < 0 || t > bestD) return;
        const cx = origin.x + dir.x * t, cy = origin.y + dir.y * t, cz = origin.z + dir.z * t;
        if (dist2(cx, cz, x, z) + (cy - y) * (cy - y) < r * r) { bestD = t; best = { kind, ref, t }; }
      }
      for (const p of peds) if (p.alive) test(p.x, p.z, 1.2, 1.1, 'ped', p);
      for (const o of police.officers) test(o.x, o.z, 1.2, 1.1, 'officer', o);
      for (const c of police.cars) test(c.x, c.z, 0.8, 2.4, 'policecar', c);
      for (const c of vehicles.all) if (!c.dead) test(c.x, c.z, 0.8, 2.4, 'car', c);
      const end = origin.clone().addScaledVector(dir, best ? bestD : 60);
      effects.tracer(origin.clone().addScaledVector(dir, 1.2), end);
      effects.muzzle(origin.clone().addScaledVector(dir, 1.0));
      if (best) {
        effects.burst(end.x, end.y, end.z, 12);
        if (best.kind === 'ped') {
          peds.knockDown(best.ref);
          state.addWanted(1, 'You shot a citizen!');
        } else if (best.kind === 'officer') {
          const i = police.officers.indexOf(best.ref);
          if (i >= 0) { scene.remove(best.ref.mesh); police.officers.splice(i, 1); }
          state.addWanted(1, 'You shot an officer!');
        } else if (best.kind === 'policecar') {
          best.ref.hp -= 34;
          state.addWanted(1, 'You shot a police car!');
          if (best.ref.hp <= 0) {
            effects.burst(best.ref.x, 1, best.ref.z, 30, 0xff6a2a);
            const i = police.cars.indexOf(best.ref);
            if (i >= 0) { scene.remove(best.ref.mesh); police.cars.splice(i, 1); }
            state.addCash(0);
          }
        } else if (best.kind === 'car') {
          best.ref.hp -= 20;
          if (best.ref.hp <= 0) {
            effects.burst(best.ref.x, 1, best.ref.z, 26, 0xff6a2a);
            vehicles.removeCar(best.ref);
          }
        }
        return 'hit';
      }
      return 'miss';
    },
    reload() {
      if (combat.ammo < combat.magSize && combat.reloading <= 0) {
        combat.reloading = 0.9;
        return true;
      }
      return false;
    },
    update(dt) {
      if (combat.reloading > 0) {
        combat.reloading -= dt;
        if (combat.reloading <= 0) combat.ammo = combat.magSize;
      }
    },
  };
  return combat;
}
