// vehicles.js — traffic AI, parked cars to steal, and arcade driving for Kai.
// Traffic cruises the street grid, turns at intersections, and stops behind the
// car ahead. Parked cars (E to steal) include one gold-marked target for mission 2.
import * as THREE from 'three';
import { clamp, collideCircleBox, dist2, pick, rand, randi, turnToward } from './util.js';
import { STREET, CITY_MIN, CITY_MAX } from './city.js';

const CAR_COLORS = [0xd83a2a, 0x2a6ad8, 0xe8c23a, 0x3a9e4a, 0xe8e8e8, 0x2a2d33, 0xd86a2a, 0x7a3ad8, 0x9e2a5a];

function buildCarMesh(color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.2), paint);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.15, metalness: 0.6 }));
  cabin.position.set(0, 1.1, -0.2); cabin.castShadow = true; g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffee88, emissiveIntensity: 0.7 });
  for (const hx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    h.position.set(hx, 0.6, 2.12); g.add(h);
  }
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.2 }));
    lightBar.position.set(0, 1.5, -0.2); g.add(lightBar);
    g.userData.lightBar = lightBar;
  }
  return g;
}

export function createVehicles(scene, colliders) {
  const V = { traffic: [], parked: [], all: [] };
  function addCar(x, z, heading, parked, isPolice) {
    const color = isPolice ? 0x1a1a22 : pick(CAR_COLORS);
    const mesh = buildCarMesh(color, isPolice);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    const car = {
      mesh, x, z, heading, speed: 0, parked: !!parked, stolen: false,
      isPolice, color, target: null, cruise: rand(7, 11), dead: false, hp: 100,
    };
    V.all.push(car);
    if (parked) V.parked.push(car); else V.traffic.push(car);
    return car;
  }
  // 14 traffic cars on random streets, heading along the street.
  for (let i = 0; i < 14; i++) {
    const along = pick(STREET);
    const cross = rand(-140, 140);
    const horizontal = Math.random() < 0.5;
    const heading = horizontal ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
    const lane = (Math.random() < 0.5 ? -3.2 : 3.2);
    addCar(horizontal ? cross : along + lane, horizontal ? along + lane : cross, heading, false, false);
  }
  // 6 parked cars beside roads; the gold one is the mission-2 target.
  const spots = [
    [-72, -22, Math.PI / 2], [28, -72, 0], [78, 28, -Math.PI / 2],
    [-22, 78, Math.PI], [122, -78, Math.PI / 2], [-128, 22, 0],
  ];
  for (const [x, z, h] of spots) addCar(x, z, h, true, false);
  V.parked[2].isTarget = true;
  const gold = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 4.6), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35 }));
  gold.position.set(V.parked[2].x, 0.15, V.parked[2].z);
  scene.add(gold);
  V.targetGlow = gold;

  function nearestStreetCoord(v) {
    let best = STREET[0], bd = 1e9;
    for (const s of STREET) { const d = Math.abs(v - s); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  V.updateTraffic = (dt, peds) => {
    for (const car of V.traffic) {
      if (car.dead) continue;
      // Stop if another car is close ahead.
      let blocked = false;
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      for (const o of V.all) {
        if (o === car || o.dead) continue;
        const dx = o.x - car.x, dz = o.z - car.z;
        const ahead = dx * fx + dz * fz;
        const side = Math.abs(dx * fz - dz * fx);
        if (ahead > 0 && ahead < 8 && side < 2.2) { blocked = true; break; }
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += clamp(target - car.speed, -14 * dt, 8 * dt);
      car.x += fx * car.speed * dt;
      car.z += fz * car.speed * dt;
      // At an intersection, sometimes turn.
      const nx = nearestStreetCoord(car.x), nz = nearestStreetCoord(car.z);
      const onX = Math.abs(car.x - nx) < 1.2, onZ = Math.abs(car.z - nz) < 1.2;
      if ((onX || onZ) && Math.random() < dt * 0.5) {
        const turns = [0, Math.PI / 2, -Math.PI / 2];
        car.heading += pick(turns);
      }
      // Wrap around the city edge instead of driving into the sea.
      if (car.x < CITY_MIN - 5) car.x = CITY_MAX - 5;
      if (car.x > 205) car.x = CITY_MIN + 5;
      if (car.z < CITY_MIN - 5) car.z = CITY_MAX - 5;
      if (car.z > CITY_MAX + 5) car.z = CITY_MIN + 5;
      // Snap back onto a lane if drifting off-road.
      const laneX = nearestStreetCoord(car.x), laneZ = nearestStreetCoord(car.z);
      if (Math.abs(car.x - laneX) > 7 && Math.abs(car.z - laneZ) > 7) {
        if (Math.abs(car.x - laneX) < Math.abs(car.z - laneZ)) car.z += (laneZ - car.z) * dt * 0.5;
        else car.x += (laneX - car.x) * dt * 0.5;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  };
  // Arcade driving for the player's car. Returns speed (m/s).
  V.updateDriving = (dt, car, input, player, pedsList, onHitPed, onCrash) => {
    const ax = input.axis();
    const accel = ax.z < 0 ? 16 : (ax.z > 0 ? -12 : 0);
    car.speed += accel * dt;
    if (input.handbrake()) car.speed *= Math.pow(0.12, dt);
    else car.speed *= Math.pow(0.35, dt * 0.4);
    car.speed = clamp(car.speed, -9, 30);
    const steer = ax.x * clamp(Math.abs(car.speed) / 8, 0, 1) * 1.9;
    car.heading += steer * dt * (car.speed >= 0 ? 1 : -1) * (input.handbrake() ? 1.5 : 1);
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    let nx = car.x + fx * car.speed * dt;
    let nz = car.z + fz * car.speed * dt;
    nx = clamp(nx, CITY_MIN, 205);
    nz = clamp(nz, CITY_MIN, CITY_MAX);
    let crashed = false;
    for (const b of colliders) {
      const push = collideCircleBox(nx, nz, 1.6, b);
      if (push) { nx += push.x; nz += push.z; if (Math.abs(car.speed) > 8) crashed = true; car.speed *= 0.45; }
    }
    if (crashed && onCrash) onCrash();
    car.x = nx; car.z = nz;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    player.x = car.x; player.z = car.z;
    // Hit a pedestrian?
    if (onHitPed) {
      for (const p of pedsList) {
        if (!p.alive) continue;
        if (dist2(car.x, car.z, p.x, p.z) < 3.2 && Math.abs(car.speed) > 4) onHitPed(p);
      }
    }
    return car.speed;
  };
  V.nearestParked = (x, z, maxD) => {
    let best = null, bd = maxD * maxD;
    for (const c of V.parked) {
      if (c.stolen || c.dead) continue;
      const d = dist2(x, z, c.x, c.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  V.removeCar = (car) => {
    car.dead = true;
    scene.remove(car.mesh);
  };
  return V;
}
