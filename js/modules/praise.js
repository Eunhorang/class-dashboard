/*
 * 칭찬 온도계 — 반 전체가 칭찬 도장을 모아 목표를 채운다
 * 누가 몇 개 받았는지 견주지 않고 반 전체의 도장만 센다. 목표를 채우면 '달성' 도장과 함께 보상을 보여 준다.
 * '+1 도장'은 크게 보기에서도 남겨 두어 TV에 띄운 채로 누르면 온도계가 올라가는 모습을 함께 본다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;
  const NS = 'http://www.w3.org/2000/svg';

  const P = () => store.state.praise;

  function add(n, why) {
    const p = P();
    const before = p.count;
    p.count = Math.max(0, p.count + n);
    p.log.push({ at: Date.now(), n, why: why || '' });
    if (p.log.length > 500) p.log = p.log.slice(-500);
    store.save();
    CD.sound.unlock();
    if (n > 0) CD.sound.stamp();
    if (before < p.goal && p.count >= p.goal) setTimeout(() => CD.sound.chime(), 350);
    CD.refresh();
    const el = document.querySelector('.thermo-count');
    if (el && n > 0) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    if (n > 0) CD.ui.toast('칭찬 도장 ' + n + '개' + (why ? ' · ' + why : '') + (p.count >= p.goal && before < p.goal ? ' · 목표를 채웠어요!' : ''), { action: '되돌리기', fn: () => { p.count = before; p.log.pop(); store.save(); CD.refresh(); } });
  }

  function editGoal() {
    const p = P();
    CD.ui.form({
      title: '목표와 보상',
      fields: [
        { name: 'goal', label: '목표 도장 수', type: 'number', value: p.goal, min: 1, max: 999, required: true },
        { name: 'reward', label: '채우면 받을 보상', value: p.reward, placeholder: '예: 금요일 6교시에 다 같이 영화 보기', maxlength: 60, wide: true },
        { name: 'reasons', label: '자주 주는 칭찬 (한 줄에 하나)', type: 'lines', rows: 5, value: p.reasons, hint: '누르면 그 까닭과 함께 도장 하나를 찍는 단추가 돼요. 열두 개까지 쓸 수 있어요.', wide: true },
      ],
      onSubmit(v) {
        const goal = Math.round(Number(v.goal));
        if (!(goal >= 1 && goal <= 999)) return '목표는 1에서 999 사이로 적어 주세요.';
        p.goal = goal;
        p.reward = String(v.reward || '').slice(0, 60);
        p.reasons = v.reasons.map((t) => t.slice(0, 20)).filter(Boolean).slice(0, 12);
        store.save();
        CD.refresh();
      },
    });
  }

  async function restart() {
    const p = P();
    const done = p.count >= p.goal;
    const ok = await CD.ui.confirm({
      title: '새 목표 시작하기',
      body: (done ? '목표를 채운 이번 온도계를 지난 기록으로 남기고 ' : '지금 ' + p.count + '개를 지난 기록으로 남기고 ') + '도장을 0개부터 다시 모을까요?',
      ok: '새로 시작',
    });
    if (!ok) return;
    const first = p.log.length ? p.log[0].at : Date.now();
    p.rounds.push({ start: first, end: Date.now(), goal: p.goal, count: p.count, reward: p.reward });
    if (p.rounds.length > 30) p.rounds = p.rounds.slice(-30);
    p.count = 0;
    p.log = [];
    store.save();
    CD.refresh();
    editGoal();
  }

  /** 세운 온도계 그림 (SVG). pct는 0~1 */
  function thermometer(pct, done) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 420');
    svg.setAttribute('class', 'thermo');
    svg.setAttribute('aria-hidden', 'true');
    const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
    const top = 20;
    const bottom = 330;
    const fillTop = bottom - (bottom - top) * Math.min(1, pct);
    // 눈금
    for (let i = 0; i <= 10; i++) {
      const y = bottom - ((bottom - top) * i) / 10;
      svg.append(el('line', { x1: 82, x2: i % 5 === 0 ? 100 : 93, y1: y, y2: y, class: 'tick' }));
    }
    svg.append(
      el('rect', { x: 38, y: top - 14, width: 34, height: bottom - top + 40, rx: 17, class: 'tube' }),
      el('rect', { x: 46, y: fillTop, width: 18, height: bottom - fillTop + 30, rx: 9, class: 'mercury' }),
      el('circle', { cx: 55, cy: 370, r: 40, class: 'bulb-ring' }),
      el('circle', { cx: 55, cy: 370, r: 30, class: 'mercury' }));
    if (done) svg.classList.add('is-done');
    return svg;
  }

  function render(root) {
    const p = P();
    const pct = p.goal ? p.count / p.goal : 0;
    const done = p.count >= p.goal;
    const big = document.body.classList.contains('big');
    const reasons = h('div', { class: 'row-btns praise-reasons' }, p.reasons.map((r) => h('button', { type: 'button', class: 'btn', text: r, on: { click: () => add(1, r) } })));
    const recent = p.log.slice(-8).reverse();
    root.append(CD.ui.page('칭찬 온도계', [
      CD.ui.btn('목표와 보상', editGoal, 'teacher-only'),
      CD.ui.btn('새 목표 시작', restart, (done ? 'primary' : 'quiet') + ' teacher-only'),
      CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet'),
    ],
    h('div', { class: 'praise-layout' },
      h('div', { class: 'praise-stage' },
        h('div', { class: 'thermo-wrap' }, thermometer(pct, done), done ? CD.ui.doneStamp('달성') : null),
        h('div', { class: 'praise-info' },
          h('p', { class: 'thermo-count num' }, h('b', { text: String(p.count) }), h('small', { text: ' / ' + p.goal })),
          h('p', { class: 'praise-reward', text: p.reward ? (done ? '목표를 채웠어요! ' : '채우면 ') + p.reward : (done ? '목표를 채웠어요!' : '목표까지 ' + Math.max(0, p.goal - p.count) + '개 남았어요') }),
          h('div', { class: 'row-btns' },
            CD.ui.btn('+1 도장', () => add(1, ''), 'primary big'),
            CD.ui.btn('-1', () => { if (p.count > 0) add(-1, '빼기'); }, 'quiet big teacher-only')),
          reasons)),
      h('div', { class: 'praise-side teacher-only' },
        h('h2', { text: '최근 도장' }),
        recent.length ? h('ul', { class: 'items' }, recent.map((x) => h('li', null, h('div', { class: 'row' },
          h('span', { class: 't', text: (x.n > 0 ? '+' : '') + x.n + (x.why ? ' · ' + x.why : '') }),
          h('span', { class: 'meta', text: D.shortDate(D.iso(new Date(x.at))) + ' ' + String(new Date(x.at).getHours()).padStart(2, '0') + ':' + String(new Date(x.at).getMinutes()).padStart(2, '0') }))))) : CD.ui.empty('아직 찍은 도장이 없어요'),
        p.rounds.length ? h('section', { class: 'section', style: { 'margin-top': '1.4rem' } },
          h('h2', { text: '지난 목표' }),
          h('ul', { class: 'items' }, p.rounds.slice().reverse().map((r) => h('li', null, h('div', { class: 'row' },
            h('span', { class: 't', text: r.count + ' / ' + r.goal + (r.reward ? ' · ' + r.reward : '') }),
            h('span', { class: 'meta', text: D.shortDate(D.iso(new Date(r.start))) + ' ~ ' + D.shortDate(D.iso(new Date(r.end))) })))))) : null)),
    h('p', { class: 'help small teacher-only', style: { 'margin-top': '1.2rem' }, text: '누가 몇 개 받았는지 세지 않고 반 전체의 도장만 모아요. 크게 보기로 TV에 띄운 채 ‘+1 도장’을 누르면 온도계가 올라가요.' })));
  }

  /** 오늘 화면의 한 줄 */
  CD.praiseBar = () => {
    if (!store.isOn('praise')) return null;
    const p = P();
    const pct = Math.min(1, p.goal ? p.count / p.goal : 0);
    const bar = h('span', { class: 'praise-bar' }, h('span'));
    bar.firstChild.style.setProperty('width', Math.round(pct * 100) + '%');
    return h('a', { class: 'praise-home', href: '#/praise', aria: { label: '칭찬 온도계 ' + p.count + ' / ' + p.goal } },
      h('span', { class: 'k', text: '칭찬 온도계' }),
      bar,
      h('b', { class: 'num', text: p.count + '/' + p.goal }),
      p.reward ? h('span', { class: 'r', text: p.reward }) : null);
  };

  CD.modules.register({
    id: 'praise',
    title: '칭찬 온도계',
    group: 'check',
    order: 160,
    badge(s) { return s.praise.count >= s.praise.goal ? '달성' : ''; },
    render,
  });
})(window.CD = window.CD || {});
