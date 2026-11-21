/*
 * 학급 대시보드 — 소리 (빙글빙글 돌림판에서 가져옴)
 * 소리 파일 없이 Web Audio로 만든다. 바늘이 칸을 넘을 때 똑딱, 도장이 찍힐 때 쿵, 결과 창이 뜰 때 딩동.
 */
(function (CD) {
  'use strict';

  let ctx = null;
  let master = null;
  let noise = null;
  let isOn = () => true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.3);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  /** 누르거나 키를 칠 때 불러서, 브라우저가 소리를 막지 않게 깨워 둔다. */
  function unlock() {
    if (!isOn()) return;
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function ready() {
    if (!isOn()) return null;
    const c = ensure();
    if (!c || c.state !== 'running') return null;
    return c;
  }

  function envelope(param, t, attack, peak, decay) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noiseBurst(c, t, type, freq, q, peak, decay) {
    const src = c.createBufferSource();
    src.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    envelope(g.gain, t, 0.002, peak, decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.2, decay + 0.05);
  }

  function tone(c, t, type, from, to, peak, attack, decay) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to && to !== from) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    const g = c.createGain();
    envelope(g.gain, t, attack, peak, decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  /** 바늘이 칸 경계를 넘을 때: 종이를 손톱으로 튕기는 듯한 짧은 소리 */
  function tick() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime + 0.002;
    noiseBurst(c, t, 'bandpass', 2400 + Math.random() * 300, 1.3, 0.32, 0.028);
    tone(c, t, 'triangle', 1250, 760, 0.1, 0.002, 0.03);
  }

  /** 도장이 찍힐 때: 낮고 짧은 쿵 */
  function stamp() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime + 0.005;
    tone(c, t, 'sine', 160, 62, 0.6, 0.004, 0.17);
    noiseBurst(c, t, 'lowpass', 700, 0.8, 0.32, 0.07);
  }

  /** 결과 창이 뜰 때: 두 음 딩동 */
  function chime() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime + 0.01;
    [[783.99, 0], [1046.5, 0.12]].forEach(([f, dt]) => {
      tone(c, t + dt, 'triangle', f, f, 0.14, 0.01, 0.9);
      tone(c, t + dt, 'sine', f * 2, f * 2, 0.035, 0.01, 0.5);
    });
  }

  CD.sound = {
    unlock,
    tick,
    stamp,
    chime,
    setEnabledGetter(fn) { isOn = fn; },
  };
})(window.CD = window.CD || {});
