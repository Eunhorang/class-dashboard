/*
 * 타이머 — 활동 시간을 크게 띄우는 타이머와 스톱워치
 * 다른 화면으로 가도 시간은 계속 흐르고, 끝나면 소리로 알린다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;
  const PRESETS = [60, 180, 300, 600, 900];

  // 화면과 상관없이 돌아가는 시계
  const run = { mode: 'down', total: 300, startAt: 0, elapsed: 0, running: false, ended: false };
  let tickId = 0;
  let view = null;

  const now = () => performance.now();
  function elapsedMs() { return run.elapsed + (run.running ? now() - run.startAt : 0); }
  function remainingMs() { return run.total * 1000 - elapsedMs(); }

  function fmt(ms, withTenth) {
    const neg = ms < 0;
    const t = Math.abs(ms);
    const totalSec = withTenth ? Math.floor(t / 1000) : Math.ceil(t / 1000);
    const m = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    let s = (neg ? '-' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    if (withTenth) s += '.' + Math.floor((t % 1000) / 100);
    return s;
  }

  function loop() {
    if (run.mode === 'down' && run.running && remainingMs() <= 0 && !run.ended) {
      run.ended = true;
      run.elapsed = run.total * 1000;
      run.running = false;
      CD.sound.chime();
      setTimeout(() => CD.sound.chime(), 700);
      setTimeout(() => CD.sound.chime(), 1400);
      CD.ui.toast('시간이 다 됐어요.');
      CD.ui.announce('시간이 다 됐어요.');
    }
    paint();
    if (!run.running) { clearInterval(tickId); tickId = 0; }
  }
  function startLoop() { if (!tickId) tickId = setInterval(loop, 100); }

  function paint() {
    if (!view) return;
    const ms = run.mode === 'down' ? remainingMs() : elapsedMs();
    view.digits.textContent = run.mode === 'down' ? fmt(Math.max(0, ms)) : fmt(ms, true);
    view.digits.classList.toggle('is-over', run.mode === 'down' && run.ended);
    view.start.textContent = run.running ? '멈춤' : (elapsedMs() > 0 && !run.ended ? '이어서' : '시작');
    if (view.bar) view.bar.style.width = run.mode === 'down' ? (Math.max(0, Math.min(1, remainingMs() / (run.total * 1000))) * 100).toFixed(1) + '%' : '0%';
  }

  function toggle() {
    CD.sound.unlock();
    if (run.ended) reset();
    if (run.running) { run.elapsed += now() - run.startAt; run.running = false; }
    else { run.startAt = now(); run.running = true; startLoop(); }
    paint();
  }
  function reset() {
    run.running = false;
    run.elapsed = 0;
    run.ended = false;
    paint();
  }
  function setTotal(sec) {
    run.mode = 'down';
    run.total = sec;
    store.state.timer.last = sec;
    store.save();
    reset();
  }

  function customForm() {
    CD.ui.form({
      title: '시간 정하기',
      fields: [
        { name: 'm', label: '분', type: 'number', value: Math.floor(run.total / 60), min: 0, max: 180 },
        { name: 's', label: '초', type: 'number', value: run.total % 60, min: 0, max: 59 },
      ],
      onSubmit(v) {
        const sec = Math.round(Number(v.m) || 0) * 60 + Math.round(Number(v.s) || 0);
        if (sec < 5) return '5초보다 길게 정해 주세요.';
        setTotal(Math.min(sec, 3 * 3600));
        CD.refresh();
      },
    });
  }

  function onKey(e) {
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); toggle(); }
    if (e.key === 'r' || e.key === 'R') reset();
  }

  function render(root) {
    if (!run.running && !run.elapsed && run.mode === 'down') run.total = store.state.timer.last || 300;
    const mode = h('div', { class: 'seg', role: 'radiogroup', aria: { label: '종류' } },
      [{ v: 'down', l: '타이머' }, { v: 'up', l: '스톱워치' }].map((o) => h('label', null,
        h('input', { type: 'radio', name: 'tmode', value: o.v, checked: run.mode === o.v, on: { change: () => { run.mode = o.v; reset(); CD.refresh(); } } }),
        h('span', { text: o.l }))));
    const presets = run.mode === 'down' ? h('div', { class: 'row-btns' },
      PRESETS.map((sec) => CD.ui.btn(sec / 60 + '분', () => { setTotal(sec); CD.refresh(); }, run.total === sec ? 'primary' : 'quiet', { aria: { pressed: String(run.total === sec) } })),
      CD.ui.btn('직접 정하기', customForm, 'quiet')) : null;
    view = {
      digits: h('p', { class: 'timer-digits', aria: { live: 'off' } }),
      start: CD.ui.btn('시작', toggle, 'primary big'),
      bar: run.mode === 'down' ? h('i', { style: { display: 'block', height: '100%', width: '100%', background: 'var(--ink)', 'border-radius': '6px', transition: 'width .1s linear' } }) : null,
    };
    const barWrap = view.bar ? h('div', { style: { height: '10px', background: '#eef0f2', 'border-radius': '6px', overflow: 'hidden', margin: '0.5rem auto 0', 'max-width': '46rem' } }, view.bar) : null;
    root.append(CD.ui.page('타이머', [CD.ui.btn(document.body.classList.contains('big') ? '작게 보기' : '크게 보기', () => CD.setBig(!document.body.classList.contains('big')), 'quiet')],
      h('div', { class: 'tool-row' }, mode, presets),
      h('div', { class: 'stage-card' },
        view.digits,
        barWrap,
        h('div', { class: 'play-bar' }, view.start, CD.ui.btn('처음으로', reset, 'big')),
        h('p', { class: 'help small', style: { 'text-align': 'center', margin: '0.5rem auto 0' }, text: '스페이스바로 시작하고 멈춰요. R을 누르면 처음으로 돌아가요.' }))));
    document.addEventListener('keydown', onKey);
    paint();
    if (run.running) startLoop();
  }

  CD.modules.register({
    id: 'timer',
    title: '타이머',
    group: 'play',
    order: 320,
    render,
    leave() { document.removeEventListener('keydown', onKey); view = null; },
  });
})(window.CD = window.CD || {});
