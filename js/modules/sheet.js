/*
 * 학생 한 장 — 한 학생의 출결, 평가, 과제·체크, 관찰 기록을 한 화면에 모으고 인쇄한다
 * 학부모 상담과 생활기록부를 쓸 때 쓴다. 학생 개인 기록이라 관찰 기록처럼 가리개를 씌운다.
 * 목차에는 없고 학생 명단·관찰 기록·평가(학생별로 보기)에서 들어온다. 주소는 #/sheet/<학생 id>
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  const STATUS = [['absent', '결석'], ['late', '지각'], ['early', '조퇴'], ['partial', '결과']];
  const REASON = { sick: '질병', unexcused: '미인정', other: '기타', approved: '출석인정' };
  const CATS = { life: '생활', study: '학습', friend: '교우 관계', praise: '칭찬', talk: '상담', etc: '기타' };
  const LV = { top: '매우잘함', good: '잘함', fair: '보통(노력필요)' };
  const PARTS = [['att', '출결'], ['grades', '평가'], ['checks', '과제와 체크'], ['notes', '관찰 기록'], ['memo', '메모']];
  const PERIODS = [['all', '이번 학년도'], ['s1', '1학기'], ['s2', '2학기']];

  let revealed = false;
  let lastAct = 0;
  const IDLE = 5 * 60 * 1000;
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { lastAct = Date.now(); }, true));
  let period = 'all';
  const parts = new Set(['att', 'grades', 'checks', 'notes']); // 메모는 고를 때만 넣는다

  const one = (n) => String(Math.round(n * 10) / 10);
  const byNo = (a, b) => a.no - b.no || CD.ko.collator.compare(a.name, b.name);
  const day = (iso) => D.shortDate(iso);

  /** 학년도: 설정의 '2026학년도'에서 숫자를 읽고, 없으면 3월을 기준으로 정한다 */
  function schoolYear() {
    const m = String(store.state.profile.year || '').match(/\d{4}/);
    if (m) return Number(m[0]);
    const d = new Date();
    return d.getMonth() < 2 ? d.getFullYear() - 1 : d.getFullYear();
  }
  function range(p) {
    const y = schoolYear();
    if (p === 's1') return [y + '-03-01', y + '-08-31'];
    if (p === 's2') return [y + '-09-01', (y + 1) + '-02-29'];
    return ['0000-01-01', '9999-12-31'];
  }
  function rangeLabel(p) {
    const y = schoolYear();
    if (p === 's1') return y + '학년도 1학기(3~8월)';
    if (p === 's2') return y + '학년도 2학기(9~2월)';
    return store.state.profile.year || '이번 학년도';
  }
  const inRange = (iso, r) => !!iso && iso >= r[0] && iso <= r[1];

  /* ---------- 부분마다 만들기 ---------- */
  function section(title, ...body) {
    return h('section', { class: 'sheet-sec' }, h('h3', { text: title }), ...body);
  }
  const none = (text) => h('p', { class: 'help small', text });

  function attPart(k, r) {
    const s = store.state;
    const counts = {};
    const lines = [];
    let taken = 0;
    Object.keys(s.attendance.taken || {}).forEach((d) => { if (inRange(d, r)) taken++; });
    Object.keys(s.attendance.log).filter((d) => inRange(d, r)).sort().forEach((d) => {
      const rec = s.attendance.log[d][k.id];
      if (!rec) return;
      const c = counts[rec.s] || (counts[rec.s] = { n: 0, by: {} });
      c.n++;
      c.by[rec.r] = (c.by[rec.r] || 0) + 1;
      lines.push(day(d) + ' ' + STATUS.find(([v]) => v === rec.s)[1] + '·' + REASON[rec.r] + (rec.m ? ' (' + rec.m + ')' : ''));
    });
    const grid = h('div', { class: 'sheet-counts' }, STATUS.map(([v, l]) => {
      const c = counts[v];
      return h('div', null, h('span', { text: l }), h('b', { class: 'num', text: String(c ? c.n : 0) }),
        h('small', { text: c ? Object.entries(c.by).map(([rr, n]) => REASON[rr] + ' ' + n).join(', ') : '' }));
    }));
    return section('출결',
      grid,
      lines.length ? h('p', { class: 'sheet-line', text: lines.join(' · ') }) : none('기록된 결석·지각·조퇴·결과가 없어요.'),
      taken ? h('p', { class: 'help small', text: '이 기간에 출결을 확인한 날은 ' + taken + '일이에요. 적지 않은 날은 출석으로 봐요.' }) : null);
  }

  function gradesPart(k, r) {
    const s = store.state;
    const list = s.grades.filter((g) => inRange(g.date, r)).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    if (!list.length) return section('평가', none('이 기간의 평가가 없어요.'));
    const lv = { top: 0, good: 0, fair: 0 };
    const pct = [];
    const classPct = [];
    const rows = list.map((g) => {
      const v = g.res[k.id];
      let result = '·';
      let avg = '';
      if (g.kind === 'unit') {
        const vals = Object.values(g.res).filter((x) => typeof x === 'number');
        if (vals.length) { const a = vals.reduce((x, y) => x + y, 0) / vals.length; avg = one(a); classPct.push(a / g.max * 100); }
        if (typeof v === 'number') { result = one(v) + ' / ' + g.max; pct.push(v / g.max * 100); }
      } else if (v) { result = LV[v]; lv[v]++; }
      return h('tr', null,
        h('td', { class: 'num', text: day(g.date) }),
        h('td', null, h('span', { class: 'muted', text: (g.kind === 'unit' ? '단원평가' : '수행평가') + ' · ' }), (g.subject ? g.subject + ' · ' : '') + g.title),
        h('td', null, h('b', { text: result })),
        h('td', { class: 'num muted', text: avg }));
    });
    const sum = [];
    if (lv.top + lv.good + lv.fair) sum.push('수행평가 매우잘함 ' + lv.top + ' · 잘함 ' + lv.good + ' · 보통(노력필요) ' + lv.fair);
    if (pct.length) sum.push('단원평가 평균 ' + one(pct.reduce((a, b) => a + b, 0) / pct.length) + '점' + (classPct.length ? ' (반 평균 ' + one(classPct.reduce((a, b) => a + b, 0) / classPct.length) + '점)' : '') + ', 100점으로 바꿔 계산');
    return section('평가',
      sum.length ? h('p', { class: 'sheet-line' }, h('b', { text: sum.join(' / ') })) : null,
      h('table', { class: 'table sheet-table' },
        h('thead', null, h('tr', null, h('th', { class: 'num', text: '날짜' }), h('th', { text: '평가' }), h('th', { text: '결과' }), h('th', { class: 'num', text: '반 평균' }))),
        h('tbody', null, rows)));
  }

  function checksPart(k, r) {
    const s = store.state;
    const lines = [];
    const itemLine = (key, label, missWord) => {
      if (!store.isOn(key)) return;
      const items = s[key].filter((it) => inRange(it.due || D.iso(new Date(it.createdAt || Date.now())), r));
      if (!items.length) return;
      const done = items.filter((it) => it.done[k.id]);
      const miss = items.filter((it) => !it.done[k.id]).map((it) => it.title);
      lines.push(h('li', null, h('b', { text: label + ' ' + done.length + '/' + items.length }),
        miss.length ? h('span', { class: 'muted', text: ' · ' + missWord + ': ' + miss.slice(0, 8).join(', ') + (miss.length > 8 ? ' 외 ' + (miss.length - 8) + '개' : '') }) : null));
    };
    itemLine('homework', '과제', '못 낸 것');
    itemLine('forms', '안내장', '안 낸 것');
    itemLine('missions', '미션 성공', '아직 도전 중');
    if (store.isOn('reading')) {
      // 결석한 날은 빼고 센다
      const absent = (d) => ((s.attendance.log[d] || {})[k.id] || {}).s === 'absent';
      const days = Object.keys(s.reading.log).filter((d) => inRange(d, r) && Object.keys(s.reading.log[d]).length && !absent(d));
      if (days.length) lines.push(h('li', null, h('b', { text: '아침독서 ' + days.filter((d) => s.reading.log[d][k.id]).length + '/' + days.length + '일' }), h('span', { class: 'muted', text: ' · 결석한 날은 빼고 셌어요' })));
    }
    if (store.isOn('roles')) {
      const mine = s.roles.list.filter((ro) => ro.sids.includes(k.id));
      if (mine.length) {
        const done = Object.keys(s.roles.log).filter((d) => inRange(d, r)).reduce((n, d) => n + mine.filter((ro) => s.roles.log[d][ro.id]).length, 0);
        lines.push(h('li', null, h('b', { text: '1인1역 ' + mine.map((ro) => ro.name).join(', ') }), h('span', { class: 'muted', text: ' · 한 날 ' + done + '일' })));
      }
    }
    return section('과제와 체크', lines.length ? h('ul', { class: 'sheet-list' }, lines) : none('이 기간의 체크 기록이 없어요.'));
  }

  function notesPart(k, r) {
    const list = store.state.notes.filter((n) => n.sids.includes(k.id) && inRange(n.date, r)).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    return section('관찰 기록' + (list.length ? ' (' + list.length + '개)' : ''),
      list.length
        ? h('ol', { class: 'sheet-notes' }, list.map((n) => h('li', null,
          h('span', { class: 'num when', text: day(n.date) }),
          h('span', { class: 'kind', text: CATS[n.cat] || '기타' }),
          h('p', { text: n.text }))))
        : none('이 기간의 관찰 기록이 없어요.'));
  }

  /** 한 학생의 한 장 (화면과 인쇄가 함께 쓴다) */
  function build(k, p, want) {
    const s = store.state;
    const r = range(p);
    return h('article', { class: 'sheet' },
      h('header', { class: 'sheet-head' },
        h('h2', null, k.no + '번 ' + k.name, k.left ? h('small', { text: ' 전학' }) : null),
        h('p', { class: 'muted', text: [s.profile.title, rangeLabel(p), D.iso().replace(/-/g, '. ') + '. 기준'].filter(Boolean).join(' · ') })),
      want.has('att') && store.isOn('attendance') ? attPart(k, r) : null,
      want.has('grades') && store.isOn('grades') ? gradesPart(k, r) : null,
      want.has('checks') ? checksPart(k, r) : null,
      want.has('notes') && store.isOn('notes') ? notesPart(k, r) : null,
      want.has('memo') ? section('메모', k.note ? h('p', { class: 'sheet-line', text: k.note }) : none('적어 둔 메모가 없어요.')) : null);
  }

  function printSheets(kids) {
    const area = h('section', { id: 'printArea', class: 'print-area sheet-print', aria: { hidden: 'true' } }, kids.map((k) => build(k, period, parts)));
    const old = document.getElementById('printArea');
    if (old) old.remove();
    document.body.append(area);
    document.body.classList.add('printing');
    const done = () => {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('printing');
      area.remove();
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  /* ---------- 가리개 ---------- */
  function curtain(root) {
    root.append(CD.ui.page('학생 한 장', [],
      h('div', { class: 'curtain' },
        h('p', { class: 'empty-title', text: '학생 개인 기록이라 가려 두었어요' }),
        h('p', { class: 'help', text: '교실 TV에 그대로 뜨지 않게 들어올 때마다 한 번 더 눌러야 보여요. 5분 동안 아무것도 누르지 않으면 다시 가려져요. 학생들이 화면을 보지 않을 때 열어 주세요.' }),
        CD.ui.btn('기록 보기', () => { revealed = true; lastAct = Date.now(); if (document.body.classList.contains('big')) CD.setBig(false); else CD.refresh(); }, 'primary big'))));
  }

  function render(root, ctx) {
    // 관찰 기록·평가에서 가리개를 걷고 바로 넘어왔으면 다시 묻지 않는다
    if (!revealed && CD.sheetPass && Date.now() - CD.sheetPass < 3000) { revealed = true; lastAct = Date.now(); }
    CD.sheetPass = 0;
    if (!revealed) { curtain(root); return; }
    const s = store.state;
    const kids = s.students.slice().sort(byNo);
    const here = kids.filter((k) => !k.left);
    if (!kids.length) {
      root.append(CD.ui.page('학생 한 장', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 학생마다 기록을 한 장에 모아 볼 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    const k = kids.find((x) => x.id === ctx.params[0]) || here[0] || kids[0];
    const list = k.left ? kids : here;
    const at = list.indexOf(k);
    const prev = list[(at - 1 + list.length) % list.length];
    const next = list[(at + 1) % list.length];

    const pick = h('select', { aria: { label: '학생 고르기' }, on: { change: (e) => CD.go('sheet/' + e.target.value) } },
      kids.map((x) => h('option', { value: x.id, text: x.no + ' ' + x.name + (x.left ? ' (전학)' : ''), selected: x === k })));
    const nav = h('div', { class: 'day-nav sheet-nav' },
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '앞 학생 ' + prev.name }, on: { click: () => CD.go('sheet/' + prev.id) } }, CD.icon('left')),
      pick,
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '다음 학생 ' + next.name }, on: { click: () => CD.go('sheet/' + next.id) } }, CD.icon('right')));
    const periodSeg = h('div', { class: 'seg', role: 'radiogroup', aria: { label: '기간' } }, PERIODS.map(([v, l]) => h('label', null,
      h('input', { type: 'radio', name: 'sheet-period', value: v, checked: period === v, on: { change: () => { period = v; CD.refresh(); } } }),
      h('span', { text: l }))));
    const partChecks = h('div', { class: 'check-grid sheet-parts', role: 'group', aria: { label: '넣을 것' } }, PARTS.map(([v, l]) => h('label', { class: 'check-item' },
      h('input', { type: 'checkbox', value: v, checked: parts.has(v), on: { change: (e) => { if (e.target.checked) parts.add(v); else parts.delete(v); CD.refresh(); } } }),
      h('span', { text: l }))));

    root.append(CD.ui.page('학생 한 장', [
      CD.ui.btn('인쇄', () => printSheets([k]), 'primary'),
      CD.ui.btn('반 전체 인쇄', () => printSheets(here)),
      CD.ui.btn('가리기', () => { revealed = false; CD.refresh(); }, 'quiet'),
    ],
    h('div', { class: 'tool-row' }, nav, periodSeg),
    h('div', { class: 'tool-row sheet-tools' }, h('span', { class: 'field-label', text: '넣을 것' }), partChecks),
    build(k, period, parts),
    h('p', { class: 'help small', style: { 'margin-top': '1.2rem' }, text: '학부모 상담이나 생활기록부를 쓸 때 보세요. 인쇄하면 학생 한 명이 한 장에 나와요. ‘반 전체 인쇄’는 학생마다 새 장으로 넘어가요. 메모는 선생님만 보는 내용이라 고를 때만 넣어요.' })));
  }

  CD.modules.register({
    id: 'sheet',
    title: '학생 한 장',
    group: 'manage',
    order: 201,
    always: true,
    hidden: true,
    render,
    tick() {
      if (revealed && Date.now() - lastAct > IDLE && !document.querySelector('dialog[open]')) { revealed = false; CD.refresh(); }
    },
    leave(changed) { if (changed) revealed = false; },
  });
})(window.CD = window.CD || {});
