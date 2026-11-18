// police.js — Alba PD: interceptor cars that chase and ram, and foot officers
// who chase and shoot once the heat is high enough.
import * as THREE from 'three';
import { clamp, dist2, rand, turnToward } from './util.js';
import { CITY_MIN, CITY_MAX } from './city.js';

export function createPolice(scene) {
  const police = { cars: [], officers: [] };
  function makeInterceptor() {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.35, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.2), paint);
    body.position.y = 0.55; body.castShadow = true; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.15, metalness: 0.6 }));
    cabin.position.set(0, 1.1, -0.2); g.add(cabin);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 1.4 }));
    bar.position.set(0, 1.5, -0.2); g.add(bar);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
    for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w);
    }
    g.userData.bar = bar;
    return g;
  }
  function spawnCar(px, pz) {
    const a = rand(0, Math.PI * 2);
    const x = clamp(px + Math.sin(a) * 55, CITY_MIN, 200);
    const z = clamp(pz + Math.cos(a) * 55, CITY_MIN, CITY_MAX);
    const mesh = makeInterceptor();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const car = { mesh, x, z, heading: a, speed: 0, hp: 60 };
    police.cars.push(car);
    return car;
  }
  function spawnOfficer(px, pz) {
    const g = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: 0x1a2a5a, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), navy);
    body.position.y = 1.15; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8 }));
    head.position.y = 1.95; g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x0a1a3a }));
    cap.position.y = 2.24; g.add(cap);
    const a = rand(0, Math.PI * 2);
    const x = clamp(px + Math.sin(a) * 25, CITY_MIN, 200);
    const z = clamp(pz + Math.cos(a) * 25, CITY_MIN, CITY_MAX);
    g.position.set(x, 0, z);
    scene.add(g);
    const off = { mesh: g, x, z, heading: a, shootCd: rand(1, 2) };
    police.officers.push(off);
    return off;
  }
  police.update = (dt, player, wanted, state, effects, onPlayerShot) => {
    const wantCars = wanted >= 1 ? Math.min(wanted, 3) : 0;
    while (police.cars.length < wantCars) spawnCar(player.x, player.z);
    while (police.cars.length > wantCars) {
      const c = police.cars.pop();
      scene.remove(c.mesh);
    }
    const wantOfficers = wanted >= 2 ? Math.min(wanted - 1, 3) : 0;
    while (police.officers.length < wantOfficers) spawnOfficer(player.x, player.z);
    while (police.officers.length > wantOfficers) {
      const o = police.officers.pop();
      scene.remove(o.mesh);
    }
    const px = player.x, pz = player.z;
    for (const c of police.cars) {
      const d = Math.hypot(px - c.x, pz - c.z);
      const wantH = Math.atan2(px - c.x, pz - c.z);
      c.heading = turnToward(c.heading, wantH, 2.2 * dt);
      const targetSpeed = d > 6 ? 13 + wanted * 1.5 : 4;
      c.speed += clamp(targetSpeed - c.speed, -20 * dt, 10 * dt);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      c.x = clamp(c.x, CITY_MIN, 205); c.z = clamp(c.z, CITY_MIN, CITY_MAX);
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      // Flash the light bar.
      const bar = c.mesh.userData.bar;
      bar.material.emissive.setHex(Math.sin(state.time * 12) > 0 ? 0xff2233 : 0x2244ff);
      bar.material.color.setHex(Math.sin(state.time * 12) > 0 ? 0xff2233 : 0x2244ff);
      // Ram the player: damage on contact.
      if (d < 3.2) {
        if (player.inCar) { player.inCar.speed *= 0.5; }
        state.damage(6 * dt * 10, 'rammed by Alba PD');
      }
    }
    for (const o of police.officers) {
      const d = Math.hypot(px - o.x, pz - o.z);
      const wantH = Math.atan2(px - o.x, pz - o.z);
      o.heading = turnToward(o.heading, wantH, 3 * dt);
      const sp = d > 4 ? 5.5 : 0;
      o.x += Math.sin(o.heading) * sp * dt;
      o.z += Math.cos(o.heading) * sp * dt;
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = o.heading;
      o.shootCd -= dt;
      if (d < 26 && o.shootCd <= 0) {
        o.shootCd = 1.4 + Math.random();
        if (onPlayerShot) onPlayerShot(o);
      }
      // Busted: an officer touching Kai on foot at high heat.
      if (d < 1.6 && !player.inCar && wanted >= 3) state.busted('Caught by Alba PD');
    }
  };
  police.clearAll = () => {
    for (const c of police.cars) scene.remove(c.mesh);
    for (const o of police.officers) scene.remove(o.mesh);
    police.cars.length = 0; police.officers.length = 0;
  };
  return police;
}
