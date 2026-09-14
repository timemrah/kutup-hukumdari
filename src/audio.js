// Prosedürel ses: rüzgar, pençe, ısırma, yemek, uyku. Harici dosya yok.
export class GameAudio {
  constructor() { this.ctx = null; this.vol = 0.7; this.windGain = null; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // rüzgar: filtrelenmiş gürültü
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.05 * this.vol;
    src.connect(f); f.connect(this.windGain); this.windGain.connect(this.ctx.destination);
    src.start();
  }
  setVol(v) { this.vol = v; if (this.windGain) this.windGain.gain.value = 0.05 * v + 0.001; }
  blip(freq, dur, type = 'sine', gain = 0.2) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain * this.vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  noise(dur = 0.18, gain = 0.3, freq = 1800) {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = gain * this.vol;
    s.connect(f); f.connect(g); g.connect(this.ctx.destination);
    s.start();
  }
  claw() { this.noise(0.22, 0.5, 2600); this.blip(160, 0.15, 'sawtooth', 0.12); }
  bite() { this.noise(0.15, 0.5, 900); this.blip(95, 0.25, 'square', 0.15); }
  hurt() { this.blip(220, 0.3, 'sawtooth', 0.2); }
  eat() { this.noise(0.12, 0.35, 700); setTimeout(() => this.noise(0.12, 0.3, 500), 130); }
  splash() { this.noise(0.35, 0.4, 1200); }
  sleep() { this.blip(392, 0.4, 'sine', 0.12); setTimeout(() => this.blip(330, 0.5, 'sine', 0.12), 250); }
  win() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.4, 'triangle', 0.2), i * 180)); }
}
