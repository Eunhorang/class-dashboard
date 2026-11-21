/*
 * 아침독서 — 날짜마다 도장판 하나
 * 아침에 책을 읽은 학생 이름을 누르면 '읽음' 도장이 찍힌다. 지난 날짜도 넘겨 보며 고칠 수 있다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function dayNav(date, base) {
    const lbl = h('span', { class: 'lbl', text: D.longDate(date) });
    return h('div', { class: 'day-nav' },
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '전날' }, on: { click: () => CD.go(base + '/' + D.addDays(date, -1)) } }, CD.icon('left')),
      lbl,
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '다음 날' }, on: { click: () => CD.go(base + '/' + D.addDays(date, 1)) } }, CD.icon('right')),
      date !== D.iso() ? CD.ui.btn('오늘로', () => CD.go(base), 'quiet sm') : null);
  }
  CD.dayNav = dayNav;

  /** 이번 달에 도장을 받은 날 수 */
  function monthCounts(s, date) {
    const ym = date.slice(0, 7);
    const counts = {};
    let days = 0;
    for (const [d, log] of Object.entries(s.reading.log)) {
      if (!d.startsWith(ym)) continue;
      if (Object.keys(log).length) days++;
      for (const id of Object.keys(log)) counts[id] = (counts[id] || 0) + 1;
    }
    return { counts, days };
  }

  function render(root, ctx) {
    const s = store.state;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(ctx.params[0] || '') ? ctx.params[0] : D.iso();
    const all = store.students();
    const away = CD.absentIds ? all.filter((k) => CD.absentIds(date).has(k.id)) : [];
    const students = all.filter((k) => !away.includes(k));
    if (!all.length) {
      root.append(CD.ui.page('아침독서', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣어야 도장을 찍을 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    const log = () => s.reading.log[date] || (s.reading.log[date] = {});
    const countEl = h('span');
    const missEl = h('p', { class: 'missing' });
    const update = () => {
      const l = s.reading.log[date] || {};
      const n = students.filter((k) => l[k.id]).length;
      countEl.replaceChildren(n >= students.length ? CD.ui.doneStamp('다 함') : CD.ui.count(n, students.length));
      const miss = students.filter((k) => !l[k.id]).map((k) => k.name);
      const awayNote = away.length ? h('span', { class: 'muted', text: (students.length ? ' · ' : '') + '결석으로 뺀 사람: ' + away.map((k) => k.name).join(', ') }) : null;
      if (!students.length) { countEl.replaceChildren(); missEl.replaceChildren(awayNote); return; }
      missEl.replaceChildren(...(miss.length ? [h('b', { text: '아직 안 읽은 사람 ' + miss.length + '명: ' }), miss.join(', ')] : ['모두 읽었어요.']), ...(awayNote ? [awayNote] : []));
    };
    const board = CD.ui.board({
      students,
      stamp: '읽음',
      doneWord: '읽었어요',
      label: D.longDate(date) + ' 아침독서',
      isDone: (k) => !!(s.reading.log[date] || {})[k.id],
      onToggle(k) {
        const l = log();
        if (l[k.id]) delete l[k.id];
        else l[k.id] = Date.now();
        if (!Object.keys(l).length) delete s.reading.log[date];
        store.save();
        update();
        return !!(s.reading.log[date] || {})[k.id];
      },
    });
    update();
    const { counts, days } = monthCounts(s, date);
    const month = Number(date.slice(5, 7));
    const best = students.map((k) => ({ k, n: counts[k.id] || 0 })).sort((a, b) => b.n - a.n);
    const monthLine = days
      ? month + '월에 아침독서를 기록한 날은 ' + days + '일이에요. 가장 많이 읽은 사람: ' + best.filter((x) => x.n && x.n === best[0].n).map((x) => x.k.name).slice(0, 5).join(', ') + ' (' + best[0].n + '일)'
      : month + '월 기록이 아직 없어요.';

    root.append(CD.ui.page('아침독서', [CD.ui.btn('모두 찍기', () => {
      const before = Object.assign({}, s.reading.log[date] || {});
      const l = log();
      students.forEach((k) => { if (!l[k.id]) l[k.id] = Date.now(); });
      store.save();
      CD.refresh();
      CD.ui.toast('모두 도장을 찍었어요.', { action: '되돌리기', fn: () => { s.reading.log[date] = before; store.save(); CD.refresh(); } });
    }, 'quiet')],
    h('div', { class: 'board-head' }, dayNav(date, 'reading'), countEl),
    missEl,
    board,
    h('p', { class: 'help small', style: { 'margin-top': '1.2rem' }, text: monthLine })));
  }

  CD.modules.register({
    id: 'reading',
    title: '아침독서',
    group: 'check',
    order: 130,
    badge(s) {
      const away = CD.absentIds ? CD.absentIds() : new Set();
      const kids = store.students().filter((k) => !away.has(k.id));
      if (!kids.length) return '';
      const l = s.reading.log[D.iso()] || {};
      const left = kids.filter((k) => !l[k.id]).length;
      return left && left < kids.length ? left : '';
    },
    render,
  });
})(window.CD = window.CD || {});
