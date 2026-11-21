/*
 * 뽑기 — 돌림판·순서 정하기·모둠 나누기 (빙글빙글 돌림판에서 가져옴)
 * 학생 명단을 그대로 쓴다. 돌림판에서 뺀 이름은 이 화면을 쓰는 동안만 빠진다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;
  const SPIN = 5;

  const out = new Set();       // 이번에 돌림판에서 뺀 학생 id
  let order = null;            // 마지막으로 정한 순서
  let groups = null;           // 마지막으로 나눈 모둠
  let by = 'size';
  let size = 4;
  let count = 4;
  let ro = null;
  let wheel = null;
  let skipAbsent = true;       // 오늘 결석한 학생은 빼고 뽑기 (자리 뽑기처럼 모두 넣을 때는 끈다)

  function tabs(mode) {
    return h('div', { class: 'seg', role: 'radiogroup', aria: { label: '뽑는 방법' } },
      [{ v: 'wheel', l: '돌림판' }, { v: 'order', l: '순서 정하기' }, { v: 'groups', l: '모둠 나누기' }].map((o) => h('label', null,
        h('input', { type: 'radio', name: 'pmode', value: o.v, checked: mode === o.v, on: { change: () => CD.go('pick/' + o.v) } }),
        h('span', { text: o.l }))));
  }

  /* ---------- 돌림판 ---------- */
  function renderWheel(body, kids) {
    const pool = () => kids.filter((k) => !out.has(k.id));
    const canvas = h('canvas', { role: 'img', aria: { label: '돌림판' } });
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    needle.setAttribute('class', 'needle');
    needle.setAttribute('viewBox', '0 0 64 40');
    needle.setAttribute('aria-hidden', 'true');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M3 20 47.5 5.2c5-1.7 10.5 2 10.5 7.3v15c0 5.3-5.5 9-10.5 7.3z');
    p1.setAttribute('fill', '#D2392C');
    const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c1.setAttribute('cx', '49'); c1.setAttribute('cy', '20'); c1.setAttribute('r', '4.6'); c1.setAttribute('fill', '#fff');
    needle.append(p1, c1);
    const hub = h('button', { type: 'button', class: 'hub', text: '돌리기' });
    const wrap = h('div', { class: 'wheel-wrap' }, h('div', { class: 'disc' }, canvas), needle, hub);
    const box = h('div', { class: 'wheel-box' }, wrap);
    const result = h('div', { class: 'pick-result', aria: { live: 'polite' } });
    const status = h('p', { class: 'help', style: { 'text-align': 'center' } });
    const side = h('div');
    let lastPick = null;
    let spinning = false;

    wheel = CD.createWheel({
      wrap, canvas, needle,
      reducedMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      onTick: () => CD.sound.tick(),
      onGrab: () => CD.sound.unlock(),
      onTap: () => spin(),
      onFling: (v) => spin(v),
    });

    function paintSide() {
      const picks = store.state.pick.picks.slice(-12).reverse();
      side.replaceChildren(...[
        h('div', { class: 'section-head' }, h('h2', { text: '뽑힌 순서' }), picks.length ? h('button', { type: 'button', class: 'text-btn', text: '기록 지우기', on: { click: () => { store.state.pick.picks = []; store.save(); paintSide(); } } }) : null),
        picks.length
          ? h('ol', { class: 'items' }, picks.map((p, i) => h('li', null, h('div', { class: 'row' },
            h('span', { class: 't', text: p.name }),
            h('span', { class: 'count muted num', text: String(store.state.pick.picks.length - i) + '번째' })))))
          : CD.ui.empty('아직 뽑지 않았어요'),
        out.size ? h('div', { class: 'row-btns', style: { 'margin-top': '1rem' } },
          CD.ui.btn('뺀 ' + out.size + '명 다시 넣기', () => { out.clear(); lastPick = null; result.replaceChildren(); refresh(); }, 'quiet')) : null].filter(Boolean));
    }

    function refresh() {
      const names = pool().map((k) => k.name);
      wheel.setLabels(names);
      hub.disabled = !names.length || spinning;
      status.textContent = names.length ? kids.length + '명 가운데 ' + names.length + '명이 돌림판에 있어요' : '모두 뽑혔어요. 뺀 사람을 다시 넣어 주세요.';
      paintSide();
    }

    async function spin(velocity) {
      const p = pool();
      if (spinning || !p.length) return;
      CD.sound.unlock();
      spinning = true;
      hub.disabled = true;
      result.replaceChildren();
      const index = CD.rand.int(p.length);
      await wheel.spin({ index, seconds: SPIN, velocity });
      spinning = false;
      hub.disabled = false;
      wheel.highlight(index);
      CD.sound.stamp();
      const k = p[index];
      lastPick = k;
      store.state.pick.picks.push({ name: k.name, at: Date.now() });
      store.save();
      setTimeout(() => CD.sound.chime(), 350);
      result.replaceChildren(h('span', { text: k.name }), CD.ui.doneStamp(store.state.pick.picks.length + '번째'));
      result.append(h('span', { class: 'row-btns', style: { 'font-size': '1rem', 'margin-left': '1rem' } },
        CD.ui.btn('돌림판에서 빼기', () => { out.add(k.id); wheel.clearHighlight(); refresh(); result.replaceChildren(); }, 'primary'),
        CD.ui.btn('그대로 두기', () => { wheel.clearHighlight(); result.replaceChildren(); }, 'quiet')));
      CD.ui.announce(k.name + ', 뽑혔어요.');
      paintSide();
    }
    hub.addEventListener('click', () => spin());

    const layout = () => {
      const r = box.getBoundingClientRect();
      if (r.width < 10) return;
      const d = Math.floor(Math.min(r.width - Math.max(16, r.width * 0.035) * 2, r.height - 4));
      wheel.resize(Math.max(200, d));
    };
    ro = new ResizeObserver(layout);
    ro.observe(box);
    body.append(h('div', { class: 'wheel-area' }, h('div', null, box, result, status), side));
    refresh();
    if (document.fonts && document.fonts.load) document.fonts.load('650 24px "Pretendard Variable"', kids.map((k) => k.name).join('') + '뽑힘').then(() => wheel.draw()).catch(() => {});
  }

  /* ---------- 순서 정하기 ---------- */
  function renderOrder(body, kids) {
    const grid = h('ol', { class: 'order-grid' });
    const paint = () => {
      grid.replaceChildren(...(order || []).map((name, i) => h('li', null, h('span', { class: 'no', text: String(i + 1) }), name)));
    };
    const make = () => { order = CD.rand.shuffle(kids.map((k) => k.name)); paint(); CD.sound.unlock(); CD.sound.stamp(); };
    body.append(h('div', { class: 'tool-row' },
      h('p', { class: 'help', style: { 'margin-right': 'auto' }, text: kids.length + '명을 무작위 순서로 세워요. 발표 순서나 자리 순서를 정할 때 써요.' }),
      order ? CD.ui.btn('복사하기', async () => CD.ui.toast(await CD.copyText(order.map((n, i) => (i + 1) + '. ' + n).join('\n')) ? '순서를 복사했어요.' : '복사하지 못했어요.'), 'quiet') : null,
      CD.ui.btn(order ? '다시 정하기' : '순서 정하기', () => { make(); CD.refresh(); }, 'primary')),
      order ? grid : CD.ui.empty('아직 순서를 정하지 않았어요', '‘순서 정하기’를 누르면 1번부터 차례가 나와요.'));
    paint();
  }

  /* ---------- 모둠 나누기 ---------- */
  function groupCount(n) {
    if (by === 'count') return Math.max(1, Math.min(count, n));
    const k1 = Math.max(1, Math.floor(n / size));
    const k2 = Math.max(1, Math.ceil(n / size));
    const dev = (k) => { const base = Math.floor(n / k); const extra = n % k; return (k - extra) * Math.abs(base - size) + extra * Math.abs(base + 1 - size); };
    return dev(k2) < dev(k1) ? k2 : k1;
  }
  function renderGroups(body, kids) {
    const n = kids.length;
    const k = groupCount(n);
    const val = h('output', { text: by === 'count' ? count + '모둠' : size + '명씩' });
    const step = (d) => {
      if (by === 'count') count = CD.clamp(count + d, 2, Math.max(2, n));
      else size = CD.clamp(size + d, 2, Math.max(2, n));
      CD.refresh();
    };
    const lo = Math.floor(n / k);
    const hi = Math.ceil(n / k);
    body.append(h('div', { class: 'tool-row' },
      h('div', { class: 'seg', role: 'radiogroup', aria: { label: '나누는 기준' } },
        [{ v: 'size', l: '모둠 인원으로' }, { v: 'count', l: '모둠 수로' }].map((o) => h('label', null,
          h('input', { type: 'radio', name: 'gby', value: o.v, checked: by === o.v, on: { change: () => { by = o.v; CD.refresh(); } } }),
          h('span', { text: o.l })))),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', aria: { label: '하나 줄이기' }, on: { click: () => step(-1) } }, CD.icon('minus')),
        val,
        h('button', { type: 'button', aria: { label: '하나 늘리기' }, on: { click: () => step(1) } }, CD.icon('plus'))),
      h('p', { class: 'help', style: { 'margin-right': 'auto' }, text: n + '명을 ' + k + '모둠으로 나누면 한 모둠에 ' + (lo === hi ? lo : lo + '~' + hi) + '명이에요' }),
      groups ? CD.ui.btn('복사하기', async () => CD.ui.toast(await CD.copyText(groups.map((g, i) => (i + 1) + '모둠: ' + g.join(', ')).join('\n')) ? '모둠을 복사했어요.' : '복사하지 못했어요.'), 'quiet') : null,
      CD.ui.btn(groups ? '다시 나누기' : '나누기', () => {
        const names = CD.rand.shuffle(kids.map((x) => x.name));
        groups = Array.from({ length: k }, () => []);
        names.forEach((nm, i) => groups[i % k].push(nm));
        CD.sound.unlock();
        CD.sound.stamp();
        CD.refresh();
      }, 'primary')));
    if (!groups) { body.append(CD.ui.empty('아직 모둠을 나누지 않았어요', '인원이 딱 나누어떨어지지 않으면 모둠끼리 한 명까지만 차이 나게 나눠요.')); return; }
    body.append(h('div', { class: 'groups-grid' }, groups.map((g, i) => h('section', { class: 'group' },
      h('h3', null, (i + 1) + '모둠', h('small', { text: g.length + '명' })),
      h('ol', null, g.map((nm) => h('li', { text: nm })))))));
  }

  function render(root, ctx) {
    const mode = ['wheel', 'order', 'groups'].includes(ctx.params[0]) ? ctx.params[0] : 'wheel';
    const all = store.students();
    const absent = CD.absentIds ? CD.absentIds() : new Set();
    const away = all.filter((k) => absent.has(k.id));
    const kids = skipAbsent ? all.filter((k) => !absent.has(k.id)) : all;
    const big = document.body.classList.contains('big');
    const awaySwitch = away.length ? h('label', { class: 'switch' },
      h('input', { type: 'checkbox', checked: skipAbsent, on: { change: (e) => { skipAbsent = e.target.checked; CD.refresh(); } } }),
      h('span', { class: 'track' }),
      h('span', { text: '결석한 ' + (away.length <= 3 ? away.map((k) => k.name).join(', ') : away.length + '명') + ' 빼기' })) : null;
    const page = CD.ui.page('뽑기', [CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet')], h('div', { class: 'tool-row' }, tabs(mode), awaySwitch));
    root.append(page);
    if (!all.length) {
      page.append(CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 돌림판과 모둠 나누기에 바로 쓰여요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary')));
      return;
    }
    if (!kids.length) {
      page.append(CD.ui.empty('뽑을 학생이 없어요', '결석한 학생 빼기를 끄면 모두 넣어서 뽑아요.'));
      return;
    }
    const body = h('div', { class: 'stage-card' });
    page.append(body);
    if (mode === 'wheel') renderWheel(body, kids);
    else if (mode === 'order') renderOrder(body, kids);
    else renderGroups(body, kids);
  }

  CD.modules.register({
    id: 'pick',
    title: '뽑기',
    group: 'play',
    order: 310,
    render,
    leave() { if (ro) { ro.disconnect(); ro = null; } wheel = null; },
    resize() { if (ro) { /* ResizeObserver가 다시 잰다 */ } },
  });
})(window.CD = window.CD || {});
