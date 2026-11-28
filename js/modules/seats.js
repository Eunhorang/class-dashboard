/*
 * 자리 배치 — 교실 줄·칸에 맞춰 자리를 정하고 무작위로 바꾼다
 * '자리 바꾸기'는 자리 고정, 앞쪽 두 줄, 떨어뜨릴 짝 조건을 지키며 섞는다. 빈자리는 뒤쪽에 남긴다.
 * 두 자리를 차례로 누르면 서로 바꾼다. 화면은 학생 쪽에서 본 모습(칠판이 위)이 기본이고
 * '선생님 쪽에서 보기'로 뒤집는다. 인쇄는 A4 가로 한 장.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  let picked = null;  // 처음 누른 자리 번호 또는 { sid } (자리 없는 학생)
  let undo = null;    // 바로 전 배치

  const seats = () => store.state.seats;
  const activeIds = () => new Set(store.students().map((k) => k.id));

  /** 지금 반 학생만 남긴 자리 목록(전학·지운 학생은 빈자리로) */
  function cleanCells() {
    const s = seats();
    const ok = activeIds();
    const total = s.rows * s.cols;
    const out = [];
    const seen = new Set();
    for (let i = 0; i < total; i++) {
      const sid = s.cells[i] || '';
      if (sid && ok.has(sid) && !seen.has(sid)) { out.push(sid); seen.add(sid); } else out.push('');
    }
    return out;
  }
  const rowOf = (i) => Math.floor(i / seats().cols);
  function adjacent(a, b) {
    const c = seats().cols;
    const ra = Math.floor(a / c);
    const rb = Math.floor(b / c);
    return (ra === rb && Math.abs((a % c) - (b % c)) === 1) || ((a % c) === (b % c) && Math.abs(ra - rb) === 1);
  }

  function save(cells, msg, canUndo) {
    const s = seats();
    if (canUndo) undo = s.cells.slice();
    s.cells = cells;
    s.at = Date.now();
    store.save();
    picked = null;
    CD.refresh();
    if (msg) CD.ui.toast(msg, canUndo ? { action: '되돌리기', fn: () => { if (!undo) return; s.cells = undo; undo = null; store.save(); CD.refresh(); } } : undefined);
  }

  /* ---------- 무작위로 자리 바꾸기 ---------- */
  function shuffle() {
    const s = seats();
    const kids = store.students();
    const total = s.rows * s.cols;
    if (kids.length > total) { CD.ui.toast('자리가 ' + (kids.length - total) + '개 모자라요. ‘교실 모양’에서 줄이나 칸을 늘려 주세요.'); return; }
    const now = cleanCells();
    const base = new Array(total).fill('');
    const placed = new Set();
    now.forEach((sid, i) => { if (sid && s.fixed[sid]) { base[i] = sid; placed.add(sid); } });
    const rest = kids.map((k) => k.id).filter((id) => !placed.has(id));
    const free = [];
    for (let i = 0; i < total; i++) if (!base[i]) free.push(i);
    const use = free.slice(0, rest.length); // 앞에서부터 쓰고 남는 자리는 뒤쪽 빈자리로
    const fronts = rest.filter((id) => s.front[id]);
    const others = rest.filter((id) => !s.front[id]);
    const pairs = s.apart.filter(([a, b]) => rest.includes(a) || rest.includes(b));
    let best = null;
    let bestBad = Infinity;
    for (let t = 0; t < 4000 && bestBad > 0; t++) {
      const pos = CD.rand.shuffle(use);
      const frontPos = pos.filter((i) => rowOf(i) < 2);
      const cells = base.slice();
      const f = CD.rand.shuffle(fronts);
      const taken = new Set();
      f.forEach((id, n) => { if (n < frontPos.length) { cells[frontPos[n]] = id; taken.add(frontPos[n]); } });
      const left = pos.filter((i) => !taken.has(i));
      const o = CD.rand.shuffle(others.concat(f.slice(frontPos.length)));
      o.forEach((id, n) => { cells[left[n]] = id; });
      const at = {};
      cells.forEach((id, i) => { if (id) at[id] = i; });
      const bad = pairs.filter(([a, b]) => at[a] != null && at[b] != null && adjacent(at[a], at[b])).length
        + Math.max(0, f.length - frontPos.length) * 10;
      if (bad < bestBad) { bestBad = bad; best = cells; }
    }
    CD.sound.unlock();
    CD.sound.stamp();
    const why = [];
    if (fronts.length > use.filter((i) => rowOf(i) < 2).length) why.push('앞쪽 두 줄 자리가 모자라 몇 명은 뒤로 갔어요');
    else if (bestBad > 0) why.push('떨어뜨릴 짝 가운데 붙은 짝이 있어요. 한 번 더 눌러 보세요');
    save(best, '자리를 바꿨어요.' + (why.length ? ' ' + why.join('. ') + '.' : ''), true);
  }

  /* ---------- 누르는 자리 ---------- */
  function press(i) {
    const s = seats();
    const cells = cleanCells();
    if (picked && typeof picked === 'object') {
      // 자리 없는 학생을 이 자리에 앉힌다(앉아 있던 학생은 자리 없는 학생으로)
      const sid = picked.sid;
      cells[i] = sid;
      save(cells, null, false);
      return;
    }
    if (picked === null) { if (!cells[i] && !s.cells.some(Boolean)) return; picked = i; CD.refresh(); return; }
    if (picked === i) { picked = null; CD.refresh(); return; }
    const a = cells[picked];
    cells[picked] = cells[i];
    cells[i] = a;
    save(cells, null, false);
  }

  /* ---------- 교실 모양과 조건 ---------- */
  function editShape() {
    const s = seats();
    CD.ui.form({
      title: '교실 모양',
      fields: [
        { name: 'rows', label: '줄 수 (앞뒤)', type: 'number', value: s.rows, min: 1, max: 10, required: true },
        { name: 'cols', label: '한 줄의 자리 수 (좌우)', type: 'number', value: s.cols, min: 1, max: 12, required: true },
        { name: 'pair', label: '책상 놓는 법', type: 'seg', value: s.pair ? 'y' : 'n', options: [{ value: 'y', label: '짝으로 붙이기' }, { value: 'n', label: '한 자리씩 떨어뜨리기' }], wide: true },
      ],
      onSubmit(v) {
        const rows = Math.round(Number(v.rows));
        const cols = Math.round(Number(v.cols));
        if (!(rows >= 1 && rows <= 10) || !(cols >= 1 && cols <= 12)) return '줄은 1~10, 자리 수는 1~12로 적어 주세요.';
        // 앉아 있던 학생 순서대로 다시 앉히고, 자리가 남으면 자리 없던 학생도 앉힌다
        const seated = cleanCells().filter(Boolean);
        store.students().forEach((k) => { if (!seated.includes(k.id)) seated.push(k.id); });
        const total = rows * cols;
        s.rows = rows;
        s.cols = cols;
        s.pair = v.pair === 'y';
        s.cells = Array.from({ length: total }, (_, i) => seated[i] || '');
        store.save();
        picked = null;
        CD.refresh();
        const n = store.students().length;
        if (n > total) CD.ui.toast('자리가 ' + (n - total) + '개 모자라요. 자리가 없는 학생은 아래에 따로 보여요.');
      },
    });
  }

  function editRules() {
    const s = seats();
    const kids = store.students();
    const opts = kids.map((k) => ({ value: k.id, label: k.no + ' ' + k.name }));
    const nameOf = (id) => (kids.find((k) => k.id === id) || {}).name;
    CD.ui.form({
      title: '자리 조건',
      submit: '저장',
      fields: [
        { name: 'fixed', label: '자리 고정 (자리 바꾸기를 해도 그대로)', type: 'checks', value: kids.filter((k) => s.fixed[k.id]).map((k) => k.id), options: opts, wide: true },
        { name: 'front', label: '앞쪽 두 줄에 앉힐 학생 (시력, 집중 등)', type: 'checks', value: kids.filter((k) => s.front[k.id]).map((k) => k.id), options: opts, wide: true },
        { name: 'apart', label: '떨어뜨릴 짝 (한 줄에 두 사람)', type: 'textarea', rows: 4, value: s.apart.map(([a, b]) => [nameOf(a), nameOf(b)]).filter(([a, b]) => a && b).map((p) => p.join(' ')).join('\n'), placeholder: '김민준 이서연\n박도윤 최하은', hint: '이름 사이는 한 칸 띄어요. 옆자리와 앞뒤 자리에 붙지 않게 섞어요.', wide: true },
      ],
      onSubmit(v) {
        const byName = {};
        kids.forEach((k) => { (byName[k.name] = byName[k.name] || []).push(k.id); });
        const apart = [];
        const bad = [];
        String(v.apart || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, n) => {
          const parts = line.split(/[\s,·]+/).filter(Boolean);
          const ids = parts.map((p) => byName[p]);
          if (parts.length !== 2 || ids.some((x) => !x || x.length !== 1) || ids[0][0] === ids[1][0]) bad.push(n + 1);
          else apart.push([ids[0][0], ids[1][0]]);
        });
        if (bad.length) return bad.join(', ') + '번째 줄의 이름을 찾지 못했어요. 명단에 있는 이름 두 개를 한 칸 띄어 적어 주세요(같은 이름이 둘이면 쓸 수 없어요).';
        s.fixed = Object.fromEntries(v.fixed.map((id) => [id, true]));
        s.front = Object.fromEntries(v.front.map((id) => [id, true]));
        s.apart = apart;
        store.save();
        CD.refresh();
        CD.ui.toast('자리 조건을 저장했어요. ‘자리 바꾸기’를 누르면 조건대로 섞어요.');
      },
    });
  }

  /* ---------- 교실 그리기 (화면과 인쇄가 함께 쓴다) ---------- */
  function room(cells, forPrint) {
    const s = seats();
    const teacher = s.view === 'teacher';
    const byId = {};
    store.state.students.forEach((k) => { byId[k.id] = k; });
    // 짝으로 붙이면 두 자리마다 통로를 둔다
    const colPos = (c) => (s.pair ? c + Math.floor(c / 2) : c) + 1;
    const template = [];
    for (let c = 0; c < s.cols; c++) { template.push('minmax(0, 1fr)'); if (s.pair && c % 2 === 1 && c < s.cols - 1) template.push('0.9rem'); }
    const grid = h('div', { class: 'seat-grid' });
    grid.style.setProperty('grid-template-columns', template.join(' '));
    for (let i = 0; i < cells.length; i++) {
      const r = Math.floor(i / s.cols);
      const c = i % s.cols;
      const vr = teacher ? s.rows - 1 - r : r;
      const vc = teacher ? s.cols - 1 - c : c;
      const k = byId[cells[i]];
      const attrs = { class: 'desk' + (k ? '' : ' is-empty') + (picked === i ? ' is-picked' : '') };
      const inner = k ? [h('span', { class: 'no num', text: String(k.no) }), h('b', { class: 'nm', text: k.name })] : [h('span', { class: 'nm', text: '빈자리' })];
      const el = forPrint
        ? h('div', attrs, inner)
        : h('button', Object.assign(attrs, { type: 'button', aria: { label: (vr + 1) + '번째 줄 ' + (vc + 1) + '번째 자리, ' + (k ? k.name : '빈자리') + (picked === i ? ', 골랐어요' : '') }, on: { click: () => press(i) } }), inner);
      el.style.setProperty('grid-row', String(vr + 1));
      el.style.setProperty('grid-column', String(colPos(vc)));
      grid.append(el);
    }
    const board = h('div', { class: 'seat-board', text: '칠판 · 교탁' });
    return h('div', { class: 'seat-room' + (teacher ? ' is-teacher' : '') }, teacher ? [grid, board] : [board, grid]);
  }

  function printChart(cells) {
    const s = store.state;
    const area = h('section', { id: 'printArea', class: 'print-area seat-print', aria: { hidden: 'true' } },
      h('header', { class: 'pr-head' },
        h('h1', { text: (s.profile.title || '우리 반') + ' 자리 배치표' }),
        h('p', { text: [s.profile.year, (seats().view === 'teacher' ? '선생님 쪽에서 본 모습' : '학생 쪽에서 본 모습'), D.iso().replace(/-/g, '. ') + '.'].filter(Boolean).join(' · ') })),
      room(cells, true));
    const old = document.getElementById('printArea');
    if (old) old.remove();
    document.body.append(area);
    document.body.classList.add('printing');
    const done = () => { window.removeEventListener('afterprint', done); document.body.classList.remove('printing'); area.remove(); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  function render(root) {
    const s = seats();
    const kids = store.students();
    if (!kids.length) {
      root.append(CD.ui.page('자리 배치', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 교실 모양에 맞춰 자리를 정할 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    const cells = cleanCells();
    const seated = new Set(cells.filter(Boolean));
    const unseated = kids.filter((k) => !seated.has(k.id));
    const viewSeg = h('div', { class: 'seg', role: 'radiogroup', aria: { label: '보는 방향' } },
      [['student', '학생 쪽에서 보기'], ['teacher', '선생님 쪽에서 보기']].map(([v, l]) => h('label', null,
        h('input', { type: 'radio', name: 'seat-view', value: v, checked: s.view === v, on: { change: () => { s.view = v; store.save(); CD.refresh(); } } }),
        h('span', { text: l }))));
    const rulesCount = Object.keys(s.fixed).length + Object.keys(s.front).length + s.apart.length;
    const big = document.body.classList.contains('big');
    root.append(CD.ui.page('자리 배치', [
      CD.ui.btn('자리 바꾸기', shuffle, 'primary teacher-only'),
      CD.ui.btn('자리 조건' + (rulesCount ? ' ' + rulesCount : ''), editRules, 'teacher-only'),
      CD.ui.btn('교실 모양', editShape, 'quiet teacher-only'),
      CD.ui.btn('인쇄', () => printChart(cells), 'quiet teacher-only'),
      CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet'),
    ],
    h('div', { class: 'tool-row teacher-only' }, viewSeg,
      h('p', { class: 'help small', text: picked !== null ? '바꿀 자리를 하나 더 누르세요. 같은 자리를 다시 누르면 취소돼요.' : '두 자리를 차례로 누르면 서로 바꿔요.' + (s.at ? ' 마지막으로 바꾼 날: ' + D.shortDate(D.iso(new Date(s.at))) : '') })),
    room(cells, false),
    unseated.length ? h('div', { class: 'seat-wait teacher-only' },
      h('p', null, h('b', { text: '자리가 없는 학생 ' + unseated.length + '명' }), ' · 이름을 누른 다음 앉힐 자리를 누르세요.'),
      h('div', { class: 'row-btns' }, unseated.map((k) => h('button', {
        type: 'button', class: 'btn sm' + (picked && picked.sid === k.id ? ' primary' : ''), text: k.no + ' ' + k.name,
        on: { click: () => { picked = picked && picked.sid === k.id ? null : { sid: k.id }; CD.refresh(); } },
      })))) : null));
  }

  CD.modules.register({
    id: 'seats',
    title: '자리 배치',
    group: 'manage',
    order: 202,
    render,
    leave(changed) { if (changed) picked = null; },
  });
})(window.CD = window.CD || {});
