// main.js — Porto Alba II bootstrap: renderer, game loop, camera, state machine,
// wanted decay, busted/respawn, autosave, and the __PA2 debug handle for testing.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createEffects } from './effects.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { clamp, dist2 } from './util.js';

const canvas = document.getElementById('game-canvas');
const lowFx = new URLSearchParams(location.search).has('lowfx');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowFx });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowFx ? 1 : 2));
renderer.shadowMap.enabled = !lowFx;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8d8);
scene.fog = new THREE.Fog(0x87b8d8, 180, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0c8, 2.2);
sun.position.set(120, 180, 60);
sun.castShadow = !lowFx;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
sun.shadow.camera.far = 500;
scene.add(sun);

const hud = createHud();
const audio = createAudio();
const input = createInput(canvas);
const effects = createEffects(scene);
const city = buildCity(scene);
const player = createPlayer(scene);
const vehicles = createVehicles(scene, city.colliders);
const peds = createPedestrians(scene);
const police = createPolice(scene);
const combat = createCombat(scene, camera, effects);

const state = {
  cash: 150, health: 100, wanted: 0, mission: 0, sideJobs: 0, totalEarned: 0,
  time: 0, started: false, paused: false, busted: false, speed: 0,
  wantedTimer: 0, saveTimer: 0, threat: false, audio,
};
state.toast = (t) => hud.showToast(t);
state.addCash = (n) => { state.cash += n; };
state.addWanted = (n, why) => {
  if (state.wanted >= 5) return;
  state.wanted = Math.min(5, state.wanted + n);
  state.wantedTimer = 0;
  if (why) state.toast(why + `  Wanted ★${state.wanted}`);
};
state.damage = (n, why) => {
  if (!state.started || state.busted || state.paused) return;
  state.health -= n;
  if (state.health <= 0) { state.health = 0; state.busted = true; state.bustedNow(why || 'Busted!'); }
};
state.bustedNow = (why) => {
  state.busted = true;
  audio.busted();
  police.clearAll();
  hud.showBusted(why + ' — Alba PD hauled you in. You lost $100 bail.');
};
const missions = createMissions(scene, state);
state.mission = 0;

// ---- interactions -------------------------------------------------------
function tryEnterExitCar() {
  if (!state.started || state.paused || state.busted) return;
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.setPos(car.x + 2.5, car.z + 1.5);
    state.toast('You got out of the car');
    return;
  }
  const car = vehicles.nearestParked(player.x, player.z, 4.5);
  if (car) {
    player.inCar = car;
    if (!car.stolen) {
      car.stolen = true;
      state.addWanted(1, 'You stole a car!');
      audio.pickup();
    } else {
      state.toast('You got in the car — WASD to drive, Space = handbrake');
    }
  }
}
input.onInteract = tryEnterExitCar;
input.onSideJob = () => { if (state.started && !state.paused && !state.busted) missions.startSideJob(); };
input.onPause = () => {
  if (!state.started || state.busted) return;
  state.paused = !state.paused;
  hud.showPause(state.paused);
};
input.onMute = () => { audio.ensure(); audio.setMuted(!audio.muted); state.toast(audio.muted ? 'Sound muted (M)' : 'Sound on (M)'); };
input.onReload = () => { if (state.started) combat.reload(); };
input.onShoot = () => { if (state.started && !state.paused && !state.busted) fireWeapon(); };
input.onKey = (code) => {
  if (code === 'KeyF' && state.started && !state.paused && !state.busted) fireWeapon();
};
function fireWeapon() {
  audio.ensure();
  const res = combat.shoot(state, player, peds, police, vehicles);
  if (res === 'empty') { state.toast('Out of ammo — press R to reload'); return; }
  audio.shot();
  state.threat = true;
  setTimeout(() => { state.threat = false; }, 2500);
  if (res === 'hit') state.addWanted(0);
}

// ---- start / respawn ----------------------------------------------------
function startGame(fromSave) {
  audio.ensure();
  if (fromSave) {
    const d = loadGame();
    if (d) {
      state.cash = d.cash; state.totalEarned = d.totalEarned || 0;
      player.setPos(d.x ?? -100, d.z ?? 118);
      missions.applySave(d);
      state.mission = missions.index;
      state.toast('Save loaded — welcome back to Porto Alba');
    }
  } else {
    missions.start();
  }
  state.started = true;
  state.health = 100;
  hud.hideStart();
  hud.hideBusted();
  state.busted = false;
}
document.getElementById('btn-start').addEventListener('click', () => startGame(false));
document.getElementById('btn-continue').addEventListener('click', () => startGame(true));
document.getElementById('btn-respawn').addEventListener('click', () => {
  state.cash = Math.max(0, state.cash - 100);
  state.health = 100;
  state.wanted = 0;
  state.wantedTimer = 0;
  player.inCar = null;
  player.setPos(-100, 118);
  player.y = 0;
  police.clearAll();
  hud.hideBusted();
  state.busted = false;
  state.toast('Back on the street — Vera is waiting at the garage');
});
document.getElementById('btn-resume').addEventListener('click', () => {
  state.paused = false; hud.showPause(false);
});
document.getElementById('btn-restart').addEventListener('click', () => {
  state.paused = false; hud.showPause(false);
  player.setPos(-100, 118); state.health = 100; state.wanted = 0; police.clearAll();
});
hud.showStart(hasSave());

// ---- camera -------------------------------------------------------------
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
function updateCamera(dt) {
  if (player.inCar) player.cameraTarget(camTarget);
  else player.cameraTarget(camTarget);
  const dist = player.inCar ? 13 : 9.5;
  const height = player.inCar ? 5.2 : 4.2;
  const yaw = input.camYaw;
  const pitch = input.camPitch;
  const cx = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist;
  const cy = camTarget.y + Math.sin(pitch) * dist + height * 0.35;
  camPos.set(cx, cy, cz);
  camera.position.lerp(camPos, 1 - Math.exp(-8 * dt));
  camera.lookAt(camTarget.x, camTarget.y + 0.4, camTarget.z);
}

// ---- main loop ----------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!state.started || state.paused) {
    // Keep rendering the city behind menus.
    if (!state.started) {
      state.time += dt;
      camera.position.set(60 + Math.sin(state.time * 0.05) * 40, 55, 120);
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
    frames++;
    return;
  }
  if (state.busted) { renderer.render(scene, camera); frames++; return; }
  state.time += dt;
  combat.update(dt);
  effects.update(dt);
  // Driving vs on foot.
  if (player.inCar) {
    const car = player.inCar;
    const spd = vehicles.updateDriving(dt, car, input, player, peds, (p) => {
      peds.knockDown(p);
      state.addWanted(1, 'You ran over a pedestrian!');
      audio.crash();
    }, () => audio.crash());
    state.speed = spd;
  } else {
    player.update(dt, input, city.colliders, false);
    state.speed = player.speed;
  }
  vehicles.updateTraffic(dt, peds);
  peds.update(dt, player, state.threat);
  police.update(dt, player, state.wanted, state, effects, (o) => {
    // Officer fires at Kai.
    const from = new THREE.Vector3(o.x, 1.4, o.z);
    const to = new THREE.Vector3(player.x, 1.3, player.z);
    effects.tracer(from, to);
    effects.muzzle(from);
    audio.shot();
    if (Math.random() < 0.45) state.damage(6, 'Shot by Alba PD');
  });
  missions.update(dt, player, vehicles);
  // Wanted decay: 25 clean seconds loses one star.
  if (state.wanted > 0) {
    state.wantedTimer += dt;
    if (state.wantedTimer >= 25) { state.wanted--; state.wantedTimer = 0; if (state.wanted === 0) state.toast('You lost the heat — wanted level clear'); }
  }
  // Autosave every 12 seconds.
  state.saveTimer += dt;
  if (state.saveTimer > 12) {
    state.saveTimer = 0;
    saveGame(state, { x: player.x, z: player.z });
  }
  audio.setEngine(player.inCar ? Math.abs(player.inCar.speed) / 30 : Math.abs(player.speed) / 10, !!player.inCar);
  audio.setSiren(state.wanted > 0, state.time);
  audio.updateMusic(dt, true);
  updateCamera(dt);
  hud.update(dt, state, player, combat, missions, vehicles, police, city);
  renderer.render(scene, camera);
  frames++;
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
loop();

// Autostart for headless testing / screenshots: ?autostart=1
if (new URLSearchParams(location.search).has('autostart')) startGame(false);

// Debug / test handle (used by the local play-test only).
window.__PA2 = {
  state, player, vehicles, peds, police, missions, combat, input, city,
  ready: true, frames: () => frames,
  startGame, teleport: (x, z) => { player.inCar = null; player.setPos(x, z); },
  setWanted: (n) => { state.wanted = n; state.wantedTimer = 0; },
  setCash: (n) => { state.cash = n; },
  enterCar: (car) => { player.inCar = car; car.stolen = true; },
  saveNow: () => saveGame(state, { x: player.x, z: player.z }),
};
