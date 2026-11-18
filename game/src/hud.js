// hud.js — HUD, wanted stars, health, minimap, toasts, pause and busted screens.
import { fmtCash } from './util.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    cash: $('hud-cash'), stars: $('hud-stars'), health: $('hud-health-fill'),
    healthText: $('hud-health-text'), ammo: $('hud-ammo'), speed: $('hud-speed'),
    objective: $('hud-objective'), toast: $('hud-toast'), map: $('minimap'),
    crosshair: $('crosshair'), start: $('start-screen'), pause: $('pause-screen'),
    busted: $('busted-screen'), bustedText: $('busted-text'),
    missionLabel: $('hud-mission'),
  };
  const ctx = el.map.getContext('2d');
  let toastTimer = 0;
  const hud = {
    showToast(text) {
      el.toast.textContent = text;
      el.toast.style.opacity = '1';
      toastTimer = 4;
    },
    update(dt, state, player, combat, missions, vehicles, police, city) {
      el.cash.textContent = fmtCash(state.cash);
      el.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
      el.stars.style.color = state.wanted > 0 ? '#ff4444' : '#888888';
      el.health.style.width = Math.max(0, state.health) + '%';
      el.healthText.textContent = Math.ceil(Math.max(0, state.health)) + ' HP';
      el.ammo.textContent = combat.reloading > 0 ? 'RELOADING…' : `AMMO ${combat.ammo} / ${combat.magSize}`;
      const spd = player.inCar ? Math.abs(player.inCar.speed) * 3.6 : Math.abs(player.speed) * 3.6;
      el.speed.textContent = Math.round(spd) + ' km/h' + (player.inCar ? '  •  DRIVING' : '');
      const m = missions.current();
      el.missionLabel.textContent = m ? `JOB ${state.mission + 1}/3 — ${m.name}` : (missions.sideJob ? 'SIDE JOB' : 'FREE ROAM');
      el.objective.textContent = '▸ ' + missions.objective();
      el.crosshair.style.display = player.inCar ? 'none' : 'block';
      if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) el.toast.style.opacity = '0'; }
      hud.drawMap(state, player, vehicles, police, missions, city);
    },
    drawMap(state, player, vehicles, police, missions, city) {
      const W = 180, H = 180;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#10141c';
      ctx.fillRect(0, 0, W, H);
      const sx = (x) => ((x + 165) / 375) * W;
      const sz = (z) => ((z + 165) / 330) * H;
      // Beach + sea.
      ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx(150), 0, W - sx(150), H);
      ctx.fillStyle = '#2a7a9e'; ctx.fillRect(sx(205), 0, W - sx(205), H);
      // Plaza.
      ctx.fillStyle = '#3a7a3a'; ctx.fillRect(sx(-22), sz(-22), sx(22) - sx(-22), sz(22) - sz(-22));
      // Roads.
      ctx.strokeStyle = '#4a4d55'; ctx.lineWidth = 5;
      for (const s of [-125, -75, -25, 25, 75, 125]) {
        ctx.beginPath(); ctx.moveTo(sx(-165), sz(s)); ctx.lineTo(sx(210), sz(s)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx(s), sz(-165)); ctx.lineTo(sx(s), sz(165)); ctx.stroke();
      }
      // Buildings.
      ctx.fillStyle = '#6a6a72';
      for (const b of city.colliders) ctx.fillRect(sx(b.x - b.hw), sz(b.z - b.hd), (b.hw * 2 / 375) * W, (b.hd * 2 / 330) * H);
      // Mission beacon (pulsing gold).
      if (missions.beaconPos) {
        const r = 5 + Math.sin(state.time * 5) * 2;
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(sx(missions.beaconPos.x), sz(missions.beaconPos.z), r, 0, Math.PI * 2); ctx.fill();
      }
      // Traffic (white), parked target (gold ring).
      ctx.fillStyle = '#ffffff';
      for (const c of vehicles.all) {
        if (c.dead) continue;
        ctx.fillRect(sx(c.x) - 1.5, sz(c.z) - 1.5, 3, 3);
      }
      // Police (red).
      ctx.fillStyle = '#ff3344';
      for (const c of police.cars) { ctx.beginPath(); ctx.arc(sx(c.x), sz(c.z), 3.5, 0, Math.PI * 2); ctx.fill(); }
      for (const o of police.officers) { ctx.beginPath(); ctx.arc(sx(o.x), sz(o.z), 2.5, 0, Math.PI * 2); ctx.fill(); }
      // Player arrow (green).
      const px = sx(player.x), pz = sz(player.z);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(player.inCar ? player.inCar.heading : player.heading);
      ctx.fillStyle = '#39d353';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    showStart(hasSave) {
      el.start.style.display = 'flex';
      document.getElementById('btn-continue').style.display = hasSave ? 'inline-block' : 'none';
    },
    hideStart() { el.start.style.display = 'none'; },
    showPause(show) { el.pause.style.display = show ? 'flex' : 'none'; },
    showBusted(text) {
      el.bustedText.textContent = text;
      el.busted.style.display = 'flex';
    },
    hideBusted() { el.busted.style.display = 'none'; },
  };
  return hud;
}
