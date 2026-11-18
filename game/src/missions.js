// missions.js — Vera Solano's three-job chain for Kai, then repeatable side jobs.
// 1. Courier run $500 — 2. Steal the gold coupe $1,200 — 3. Heat escape $2,500.
import * as THREE from 'three';
import { GARAGE, PIER } from './city.js';
import { dist2, pick } from './util.js';
import { STREET } from './city.js';

const MISSIONS = [
  { name: 'Courier Run', pay: 500, stages: [
    { text: 'Pick up the package at Marina Corner (75, -75)', x: 75, z: -75 },
    { text: 'Deliver the package to the pier at Porto Alba beach', x: PIER.x, z: PIER.z },
  ]},
  { name: 'Grand Theft Alba', pay: 1200, stages: [
    { text: 'Steal the GOLD coupe parked near (78, 28) — press E beside it', x: 78, z: 28 },
    { text: 'Bring the gold coupe back to Vera\'s garage', x: GARAGE.x, z: GARAGE.z },
  ]},
  { name: 'Heat Escape', pay: 2500, stages: [
    { text: 'The heat is on! Lose the cops and reach the pier', x: PIER.x, z: PIER.z },
  ]},
];

export function createMissions(scene, state) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 20, 1, true), beaconMat);
  beacon.position.set(75, 13, -75);
  scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(75, 0.12, -75);
  scene.add(ring);
  const light = new THREE.PointLight(0xffd23f, 12, 30, 1.5);
  light.position.set(75, 4, -75);
  scene.add(light);

  const M = {
    index: 0, stage: 0, active: false, sideJob: null,
    beaconPos: { x: 75, z: -75 },
    current() { return MISSIONS[M.index] || null; },
    objective() {
      if (M.sideJob) return M.sideJob.text;
      const m = M.current();
      if (!m) return 'All jobs done — press J for a side delivery ($150)';
      return m.stages[M.stage].text;
    },
    setBeacon(x, z) {
      M.beaconPos = { x, z };
      beacon.position.set(x, 13, z);
      ring.position.set(x, 0.12, z);
      light.position.set(x, 4, z);
      beacon.visible = ring.visible = light.visible = true;
    },
    hideBeacon() { beacon.visible = ring.visible = light.visible = false; },
    start() {
      M.active = true;
      const m = M.current();
      if (m) { M.setBeacon(m.stages[0].x, m.stages[0].z); state.toast(`${m.name} — ${m.stages[0].text}`); }
    },
    completeMission(pay, doneText) {
      state.addCash(pay);
      state.totalEarned += pay;
      state.toast(doneText + `  +$${pay}`);
      state.audio.cash();
    },
    // Called every frame; returns nothing, fires toasts/payouts on arrival.
    update(dt, player, vehicles) {
      if (!M.active) return;
      const pulse = 1 + Math.sin(state.time * 4) * 0.18;
      beacon.scale.set(pulse, 1, pulse);
      beacon.rotation.y += dt;
      if (M.sideJob) {
        if (dist2(player.x, player.z, M.sideJob.x, M.sideJob.z) < 36) {
          M.completeMission(150, 'Side delivery done!');
          M.sideJob = null;
          M.setBeacon(M.current() ? M.current().stages[M.stage].x : PIER.x, M.current() ? M.current().stages[M.stage].z : PIER.z);
          if (!M.current()) M.hideBeacon();
        }
        return;
      }
      const m = M.current();
      if (!m) { M.hideBeacon(); return; }
      const s = m.stages[M.stage];
      // Mission 2 stage 0 needs the gold car stolen first.
      if (M.index === 1 && M.stage === 0) {
        const gold = vehicles.parked.find((c) => c.isTarget);
        if (gold && gold.stolen) { M.stage = 1; M.setBeacon(s.x, s.z); state.toast(m.stages[1].text); }
        return;
      }
      // Mission 2 stage 1: must be IN the gold car at the garage.
      if (M.index === 1 && M.stage === 1) {
        const gold = vehicles.parked.find((c) => c.isTarget);
        if (gold && player.inCar === gold && dist2(player.x, player.z, GARAGE.x, GARAGE.z) < 900) {
          M.completeMission(m.pay, 'Gold coupe delivered to Vera!');
          M.index = 2; M.stage = 0;
          state.toast('Job 3: Heat Escape — the cops are coming!');
          state.addWanted(3, 'Alba PD is on you!');
          M.setBeacon(MISSIONS[2].stages[0].x, MISSIONS[2].stages[0].z);
        }
        return;
      }
      if (dist2(player.x, player.z, s.x, s.z) < 36) {
        if (M.stage + 1 < m.stages.length) {
          M.stage++;
          M.setBeacon(m.stages[M.stage].x, m.stages[M.stage].z);
          state.toast(m.stages[M.stage].text);
        } else {
          M.completeMission(m.pay, `${m.name} complete!`);
          M.index++;
          M.stage = 0;
          if (M.current()) {
            M.setBeacon(M.current().stages[0].x, M.current().stages[0].z);
            state.toast(`${M.current().name} — ${M.current().stages[0].text}`);
          } else {
            M.hideBeacon();
            state.toast('All three jobs done! Vera owes you nothing. Press J for side work.');
          }
        }
      }
    },
    startSideJob() {
      if (M.sideJob) { state.toast('Side job already active — follow the gold beacon'); return; }
      const x = pick(STREET), z = pick(STREET);
      M.sideJob = { x, z, text: `Side delivery: drop the package at (${x}, ${z}) — $150` };
      M.setBeacon(x, z);
      state.toast(M.sideJob.text);
    },
    applySave(d) {
      M.index = d.mission || 0;
      M.stage = 0;
      if (M.current()) M.setBeacon(M.current().stages[0].x, M.current().stages[0].z);
      else M.hideBeacon();
    },
  };
  return M;
}
