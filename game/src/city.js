// city.js — Porto Alba: a sun-soaked coastal city on a 6-street grid.
// Streets at -125..125 (step 50), blocks between them, Alba Plaza park at the
// centre, a sand beach and wooden pier on the east edge, Vera's garage SW.
import * as THREE from 'three';
import { rand, randi, pick } from './util.js';

export const STREET = [-125, -75, -25, 25, 75, 125];
export const BLOCK_C = [-100, -50, 0, 50, 100];
export const CITY_MIN = -160, CITY_MAX = 160;
export const BEACH_X = 150;
export const GARAGE = { x: -100, z: 100 };
export const PIER = { x: 172, z: 25 };

const PALETTE = [0xe8b48a, 0xf2d5a0, 0x9fc3d8, 0xd98a7a, 0xb5c9a3, 0xe6c8d8, 0x8fb8a8, 0xd9c27a];
const ROOFS = [0x7a4a3a, 0x4a6a8a, 0x5a7a5a, 0x8a7a4a, 0x6a5a7a];

export function buildCity(scene) {
  const city = { colliders: [], buildings: [], palms: [], lamps: [], plaza: { x: 0, z: 0 } };

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9aa08a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(10, -0.05, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Sand beach (east strip) and sea beyond it.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 340), new THREE.MeshStandardMaterial({ color: 0xe8d49a, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(180, 0.0, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 420), new THREE.MeshStandardMaterial({ color: 0x2a7a9e, roughness: 0.25, metalness: 0.15 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(270, -0.4, 0);
  scene.add(sea);

  // Roads: dark strips along every street, plus pale sidewalks beside them.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 1 });
  for (const s of STREET) {
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(340, 13), roadMat);
    r1.rotation.x = -Math.PI / 2; r1.position.set(0, 0.01, s); r1.receiveShadow = true; scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(13, 340), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.set(s, 0.01, 0); r2.receiveShadow = true; scene.add(r2);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(340, 17), walkMat);
    w1.rotation.x = -Math.PI / 2; w1.position.set(0, 0.005, s); scene.add(w1);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(17, 340), walkMat);
    w2.rotation.x = -Math.PI / 2; w2.position.set(s, 0.005, 0); scene.add(w2);
  }
  // Centre dashes on each road.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
  for (const s of STREET) {
    for (let t = -150; t <= 150; t += 12) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      d.rotation.x = -Math.PI / 2; d.position.set(t, 0.02, s); scene.add(d);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(s, 0.02, t); scene.add(d2);
    }
  }

  // Buildings: 1-3 towers per block, windows via emissive grid texture drawn on canvas.
  const winTex = makeWindowTexture();
  for (const bx of BLOCK_C) {
    for (const bz of BLOCK_C) {
      if (bx === 0 && bz === 0) continue; // Alba Plaza park
      if (bx === GARAGE.x && bz === GARAGE.z) continue; // garage lot
      const n = randi(1, 3);
      for (let i = 0; i < n; i++) {
        const w = rand(14, 24), d = rand(14, 24), h = rand(10, 46);
        const ox = bx + rand(-9, 9), oz = bz + rand(-9, 9);
        const col = pick(PALETTE);
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, map: winTex, emissive: 0x222222, emissiveMap: winTex, emissiveIntensity: 0.35 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(ox, h / 2, oz);
        b.castShadow = true; b.receiveShadow = true;
        scene.add(b);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1, d + 1), new THREE.MeshStandardMaterial({ color: pick(ROOFS), roughness: 1 }));
        roof.position.set(ox, h + 0.5, oz);
        scene.add(roof);
        city.buildings.push(b);
        city.colliders.push({ x: ox, z: oz, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
      }
    }
  }

  // Alba Plaza: lawn, fountain, benches, palms.
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshStandardMaterial({ color: 0x5a9e4a, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0.03, 0); lawn.receiveShadow = true; scene.add(lawn);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.2, 20), new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.6 }));
  fountain.position.set(0, 0.6, 0); fountain.castShadow = true; scene.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x3a9ec4, roughness: 0.2, metalness: 0.3 }));
  water.position.set(0, 1.25, 0); scene.add(water);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  for (const [bx, bz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.2), benchMat);
    bench.position.set(bx, 0.4, bz); bench.castShadow = true; scene.add(bench);
  }

  // Vera's garage (SW block): low workshop with a big sign.
  const garage = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 18), new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 }));
  garage.position.set(GARAGE.x, 4, GARAGE.z); garage.castShadow = true; scene.add(garage);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 0.6), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xaa7700, emissiveIntensity: 0.5 }));
  sign.position.set(GARAGE.x, 9.5, GARAGE.z - 9.4); scene.add(sign);
  city.colliders.push({ x: GARAGE.x, z: GARAGE.z, hw: 13.4, hd: 9.4 });

  // Palms along the beach and plaza.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a8a4a, roughness: 1 });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 8), trunkMat);
    trunk.position.y = 3.5; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 6), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.4, 7.2, Math.sin(a) * 1.4);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    city.palms.push(g);
  }
  for (let z = -140; z <= 140; z += 28) palm(156, z);
  palm(-16, -16); palm(16, 16); palm(-16, 16); palm(16, -16); palm(0, -18); palm(0, 18);

  // Street lamps on every corner.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffdd66, emissiveIntensity: 0.9 });
  for (const sx of STREET) {
    for (const sz of STREET) {
      if (Math.abs(sx) > 125 || Math.abs(sz) > 125) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 8), lampMat);
      pole.position.set(sx + 8, 3, sz + 8); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bulbMat);
      bulb.position.set(sx + 8, 6.2, sz + 8); scene.add(bulb);
      city.lamps.push(bulb);
    }
  }

  // Wooden pier reaching into the sea.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 8), pierMat);
  pier.position.set(PIER.x + 8, 0.6, PIER.z); pier.castShadow = true; scene.add(pier);
  for (let x = 158; x <= 196; x += 6) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 6), pierMat);
    post.position.set(x, -0.4, PIER.z - 3.6); scene.add(post);
    const post2 = post.clone(); post2.position.z = PIER.z + 3.6; scene.add(post2);
  }
  return city;
}

function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#2a3a4a';
  for (let y = 8; y < 128; y += 16) for (let x = 8; x < 64; x += 16) g.fillRect(x, y, 9, 11);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
