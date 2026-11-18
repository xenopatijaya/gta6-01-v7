// player.js — Kai Mercer on foot: walk/run/jump, building collision, camera rig.
import * as THREE from 'three';
import { clamp, collideCircleBox, lerp } from './util.js';
import { CITY_MIN, CITY_MAX } from './city.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x2a5a8a, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a2d44, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), jacket);
  body.position.y = 1.15; body.castShadow = true; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
  head.position.y = 1.95; head.castShadow = true; group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), new THREE.MeshStandardMaterial({ color: 0xd83a2a, roughness: 0.7 }));
  cap.position.y = 2.24; group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.36), jeans);
  legL.position.set(-0.22, 0.45, 0); group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.22; group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), jacket);
  armL.position.set(-0.58, 1.15, 0); group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.58; group.add(armR);
  // Simple pistol in the right hand.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.55), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 }));
  gun.position.set(0.58, 0.85, 0.25); group.add(gun);
  group.position.set(-100, 0, 118);
  scene.add(group);

  const player = {
    group, body, head, legL, legR, armL, armR,
    x: -100, z: 118, y: 0, vy: 0, heading: 0, speed: 0,
    onGround: true, walkPhase: 0, inCar: null, health: 100,
  };
  player.setPos = (x, z) => { player.x = x; player.z = z; group.position.set(x, player.y, z); };
  player.update = (dt, input, colliders, driving) => {
    if (driving) { group.visible = false; return; }
    group.visible = true;
    const ax = input.axis();
    const camYaw = input.camYaw;
    // Movement relative to camera yaw.
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    let mx = 0, mz = 0;
    if (ax.active) {
      mx = (ax.x * cos - ax.z * sin);
      mz = (ax.x * sin + ax.z * cos);
    }
    const target = ax.active ? (input.running() ? 10 : 6) : 0;
    player.speed = lerp(player.speed, target, 1 - Math.exp(-10 * dt));
    if (player.speed > 0.2) {
      player.heading = Math.atan2(mx, mz);
      player.x += mx * player.speed * dt;
      player.z += mz * player.speed * dt;
      player.walkPhase += dt * player.speed * 1.6;
    }
    // Jump + gravity.
    if (input.keys.has('Space') && player.onGround) { player.vy = 7.5; player.onGround = false; }
    player.vy -= 22 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) { player.y = 0; player.vy = 0; player.onGround = true; }
    // Bounds + building collision.
    player.x = clamp(player.x, CITY_MIN, 205);
    player.z = clamp(player.z, CITY_MIN, CITY_MAX);
    for (const b of colliders) {
      const push = collideCircleBox(player.x, player.z, 0.6, b);
      if (push) { player.x += push.x; player.z += push.z; }
    }
    group.position.set(player.x, player.y, player.z);
    group.rotation.y = player.heading;
    const swing = Math.sin(player.walkPhase) * clamp(player.speed / 10, 0, 1) * 0.55;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
  };
  player.cameraTarget = (out) => { out.set(player.x, player.y + 1.6, player.z); return out; };
  return player;
}
