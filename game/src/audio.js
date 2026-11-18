// audio.js — fully synthesised WebAudio sound for Porto Alba II: no audio files.
// Engine hum, police siren, gunshots, pickup blips and a looping bassline groove.
export function createAudio() {
  const audio = {
    ctx: null, master: null, muted: false, musicOn: false,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    musicTimer: 0, musicStep: 0,
  };
  audio.ensure = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0.0;
      const lp = audio.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      audio.engineOsc.connect(lp); lp.connect(audio.engineGain); audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0.0;
      audio.sirenOsc.connect(audio.sirenGain); audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
    } catch (e) { audio.ctx = null; }
  };
  audio.setMuted = (m) => {
    audio.muted = m;
    if (audio.master) audio.master.gain.value = m ? 0 : 0.5;
  };
  audio.setEngine = (speed01, driving) => {
    if (!audio.ctx) return;
    const t = audio.ctx.currentTime;
    audio.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.06 : 0.015, t, 0.1);
    audio.engineOsc.frequency.setTargetAtTime(55 + speed01 * 160, t, 0.1);
  };
  audio.setSiren = (on, time) => {
    if (!audio.ctx) return;
    const t = audio.ctx.currentTime;
    audio.sirenGain.gain.setTargetAtTime(on ? 0.035 : 0.0, t, 0.2);
    if (on) audio.sirenOsc.frequency.setTargetAtTime(650 + Math.sin(time * 4) * 220, t, 0.05);
  };
  function blip(freq, dur, type, vol) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  audio.shot = () => {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const len = Math.floor(audio.ctx.sampleRate * 0.12);
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource(); src.buffer = buf;
    const g = audio.ctx.createGain(); g.gain.value = 0.4;
    const f = audio.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start(t);
    blip(140, 0.08, 'square', 0.12);
  };
  audio.pickup = () => { blip(880, 0.12, 'sine', 0.18); setTimeout(() => blip(1320, 0.16, 'sine', 0.18), 90); };
  audio.cash = () => { blip(660, 0.1, 'triangle', 0.2); setTimeout(() => blip(990, 0.2, 'triangle', 0.2), 100); };
  audio.busted = () => { blip(220, 0.5, 'sawtooth', 0.2); setTimeout(() => blip(165, 0.7, 'sawtooth', 0.2), 200); };
  audio.crash = () => { blip(90, 0.25, 'square', 0.25); };
  // Bassline groove: A minor walk, one note per 8th at 112 BPM.
  const BASS = [55, 0, 55, 65.4, 0, 55, 49, 58.3, 55, 0, 55, 82.4, 73.4, 65.4, 49, 49];
  audio.updateMusic = (dt, playing) => {
    if (!audio.ctx || audio.muted || !playing) return;
    audio.musicTimer -= dt;
    if (audio.musicTimer > 0) return;
    audio.musicTimer = 60 / 112 / 2;
    const f = BASS[audio.musicStep % BASS.length];
    audio.musicStep++;
    if (f > 0) blip(f, 0.22, 'triangle', 0.12);
    if (audio.musicStep % 4 === 0) blip(220, 0.05, 'square', 0.03);
  };
  return audio;
}
