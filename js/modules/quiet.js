/*
 * 조용히 신호등 — 마이크로 교실 소리 크기를 재서 신호등으로 보여 준다
 * 소리는 녹음하지 않고 이 브라우저 안에서 크기만 잰다. 아무 데도 보내지 않는다.
 * 초록(조용해요)·노랑(조금 커요)·빨강(너무 커요). 민감도로 교실에 맞추고, 초록으로 지낸 시간을 센다.
 * 신호등이라 이 화면에서만 초록·노랑·빨강을 쓴다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;

  let audio = null;   // { ctx, stream, analyser, buf }
  let raf = 0;
  let level = 0;      // 부드럽게 만든 소리 크기 0~100
  let light = 'green';
  let quietMs = 0;    // 초록으로 지낸 시간
  let lastT = 0;
  let want = 'green'; // 바뀌려는 불
  let wantSince = 0;  // 그 불이 이어진 때부터(0.6초 넘게 이어져야 바꾼다: 문턱에서 깜빡이지 않게)
  let els = null;
  let error = '';

  const LABEL = { green: '조용해요', yellow: '조금 커요', red: '너무 커요' };

  function lightFor(v) {
    const sens = store.state.quiet.sens; // 1(둔하게) ~ 10(예민하게)
    const shift = (sens - 5) * 5;
    if (v + shift >= 70) return 'red';
    if (v + shift >= 45) return 'yellow';
    return 'green';
  }

  async function start() {
    if (audio) return;
    error = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { error = '이 브라우저에서는 마이크를 쓸 수 없어요.'; CD.refresh(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      audio = { ctx, stream, analyser, buf: new Float32Array(analyser.fftSize) };
      level = 0;
      lastT = performance.now();
      CD.refresh();
      loop();
    } catch (e) {
      error = e && e.name === 'NotAllowedError' ? '마이크를 쓰도록 허락해 주세요. 주소창의 마이크 표시에서 허락할 수 있어요.'
        : e && e.name === 'NotFoundError' ? '마이크를 찾지 못했어요. 마이크가 연결돼 있는지 확인해 주세요.'
          : '마이크를 켜지 못했어요.';
      CD.refresh();
    }
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (audio) {
      audio.stream.getTracks().forEach((t) => t.stop());
      audio.ctx.close().catch(() => {});
      audio = null;
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!audio) return;
    audio.analyser.getFloatTimeDomainData(audio.buf);
    let sum = 0;
    for (let i = 0; i < audio.buf.length; i++) sum += audio.buf[i] * audio.buf[i];
    const rms = Math.sqrt(sum / audio.buf.length);
    const db = 20 * Math.log10(rms + 1e-8);            // 대략 -60(조용) ~ -10(아주 시끄러움)
    const raw = Math.max(0, Math.min(100, ((db + 60) / 50) * 100));
    level += (raw - level) * (raw > level ? 0.25 : 0.04);  // 커질 때는 빨리, 작아질 때는 천천히
    const now = performance.now();
    const next = lightFor(level);
    if (light === 'green') quietMs += now - lastT;
    lastT = now;
    if (next !== want) { want = next; wantSince = now; }
    if (want !== light && (now - wantSince >= 600 || !light)) { light = want; paintLight(); }
    if (els) {
      els.meter.style.setProperty('width', Math.round(level) + '%');
      const sec = Math.floor(quietMs / 1000);
      els.timer.textContent = Math.floor(sec / 60) + '분 ' + String(sec % 60).padStart(2, '0') + '초';
    }
  }

  function paintLight() {
    if (!els) return;
    els.box.dataset.light = audio ? light : '';
    els.word.textContent = audio ? LABEL[light] : '신호등이 꺼져 있어요';
  }

  function render(root) {
    const s = store.state;
    const big = document.body.classList.contains('big');
    const lamp = (c) => h('span', { class: 'lamp ' + c });
    const box = h('div', { class: 'signal', role: 'img', aria: { label: '조용히 신호등' } }, lamp('red'), lamp('yellow'), lamp('green'));
    const word = h('p', { class: 'signal-word', aria: { live: 'polite' } });
    const meter = h('span', { class: 'meter-fill' });
    const timer = h('b', { class: 'num', text: '0분 00초' });
    els = { box, word, meter, timer };
    const sens = h('input', { type: 'range', min: 1, max: 10, step: 1, value: s.quiet.sens, aria: { label: '민감도' }, on: { input: (e) => { s.quiet.sens = Number(e.target.value); store.save(); light = ''; } } });
    root.append(CD.ui.page('조용히 신호등', [
      audio ? CD.ui.btn('멈추기', () => { stop(); CD.refresh(); }) : CD.ui.btn('시작', start, 'primary'),
      CD.ui.btn('시간 다시 재기', () => { quietMs = 0; }, 'quiet teacher-only'),
      CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet'),
    ],
    h('div', { class: 'quiet-stage' },
      box,
      h('div', { class: 'quiet-info' },
        word,
        h('div', { class: 'meter', aria: { hidden: 'true' } }, meter, h('i', { class: 'mark y' }), h('i', { class: 'mark r' })),
        h('p', { class: 'quiet-time' }, '조용히 지낸 시간 ', timer),
        error ? h('p', { class: 'help', text: error }) : null)),
    h('div', { class: 'tool-row teacher-only', style: { 'margin-top': '1.2rem' } },
      h('label', { class: 'sens' }, h('span', { text: '민감도' }), h('small', { text: '둔하게' }), sens, h('small', { text: '예민하게' }))),
    h('p', { class: 'help small teacher-only', text: '소리는 녹음하지 않고 이 브라우저 안에서 크기만 재요. 아무 데도 보내지 않아요. 교실이 조용한데 노랑이 자주 뜨면 민감도를 낮추세요.' })));
    paintLight();
  }

  CD.modules.register({
    id: 'quiet',
    title: '조용히 신호등',
    group: 'play',
    order: 340,
    render,
    // 다른 화면으로 가면 마이크를 끈다(같은 화면을 다시 그릴 때는 그대로)
    leave(changed) { if (changed) { stop(); quietMs = 0; } els = null; },
  });
})(window.CD = window.CD || {});
