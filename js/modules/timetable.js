/*
 * 시간표 — 요일과 교시로 짠 기초시간표
 * 칸을 누르면 과목을 고친다. 오늘 요일과 지금 교시는 먹색으로 짙게 보인다.
 * 교과 교체나 행사로 하루만 바뀌는 날은 '오늘만 바꾸기'·'다른 날 바꾸기'로 그날만 따로 적는다(timetable.changes).
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;
  const SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '도덕', '음악', '미술', '체육', '실과', '창체', '바른 생활', '슬기로운 생활', '즐거운 생활', '안전한 생활', '자율', '동아리', '봉사'];

  function editCell(day, i) {
    const s = store.state;
    const p = s.timetable.periods[i];
    CD.ui.form({
      title: day + '요일 ' + p.label,
      fields: [{ name: 'subject', label: '과목', value: s.timetable.grid[day][i] || '', list: SUBJECTS, placeholder: '예: 국어 (비우면 빈 칸)', hint: '칸을 비워 두면 그 시간은 수업이 없는 것으로 보여요.' }],
      onSubmit(v) {
        s.timetable.grid[day][i] = String(v.subject || '').slice(0, 12);
        store.save();
        CD.refresh();
      },
    });
  }

  function periodsText(periods) {
    return periods.map((p) => p.label + ' ' + (p.start || '') + (p.end ? '-' + p.end : '')).join('\n');
  }

  function editPeriods() {
    const s = store.state;
    CD.ui.form({
      title: '교시와 시간 고치기',
      fields: [{
        name: 'lines', label: '한 줄에 한 교시씩', type: 'lines', rows: 9, value: periodsText(s.timetable.periods), required: true,
        hint: '"1교시 09:00-09:40"처럼 적어요. 점심이나 쉬는 시간처럼 과목이 없는 줄은 이름에 점심·쉬는·아침을 넣으면 시간표에서 가는 줄로 보여요.',
      }],
      onSubmit(v) {
        const rows = [];
        const bad = [];
        v.lines.forEach((line, n) => {
          const m = line.match(/^(.+?)\s+(\d{1,2}:\d{2})\s*[-~–]\s*(\d{1,2}:\d{2})$/);
          if (!m) { bad.push(n + 1); return; }
          const pad = (t) => t.padStart(5, '0');
          rows.push({ label: m[1].trim().slice(0, 10), start: pad(m[2]), end: pad(m[3]), rest: /점심|쉬는|휴식|아침/.test(m[1]) });
        });
        if (bad.length) return bad.join(', ') + '번째 줄을 읽지 못했어요. "1교시 09:00-09:40"처럼 적어 주세요.';
        if (!rows.length) return '교시를 한 줄 이상 적어 주세요.';
        // 이름이 같은 교시는 과목을 그대로 옮긴다
        const old = s.timetable.periods;
        const grid = {};
        s.timetable.days.forEach((d) => {
          grid[d] = rows.map((r) => { const j = old.findIndex((p) => p.label === r.label); return j >= 0 ? (s.timetable.grid[d][j] || '') : ''; });
        });
        const changes = {};
        for (const [day, c] of Object.entries(s.timetable.changes || {})) {
          changes[day] = { off: c.off, note: c.note, row: rows.map((r) => { const j = old.findIndex((p) => p.label === r.label); return j >= 0 ? (c.row[j] || '') : ''; }) };
        }
        s.timetable.periods = rows;
        s.timetable.grid = grid;
        s.timetable.changes = changes;
        store.save();
        CD.refresh();
      },
    });
  }

  function editDays() {
    const s = store.state;
    const sat = s.timetable.days.includes('토');
    CD.ui.form({
      title: '요일 고치기',
      fields: [{ name: 'sat', label: '토요일 수업', type: 'seg', value: sat ? 'y' : 'n', options: [{ value: 'n', label: '월~금' }, { value: 'y', label: '월~토' }] }],
      onSubmit(v) {
        const want = v.sat === 'y';
        if (want && !sat) { s.timetable.days.push('토'); s.timetable.grid['토'] = s.timetable.periods.map(() => ''); }
        if (!want && sat) { s.timetable.days = s.timetable.days.filter((d) => d !== '토'); delete s.timetable.grid['토']; }
        store.save();
        CD.refresh();
      },
    });
  }

  /* ---------- 하루만 바꾸기 ---------- */
  /** 그날의 기초시간표(요일) */
  function baseRow(tt, iso) {
    const wd = D.weekday(iso);
    return tt.days.includes(wd) ? tt.grid[wd] : tt.periods.map(() => '');
  }

  function changeDay(iso) {
    const s = store.state;
    const tt = s.timetable;
    if (!tt.changes) tt.changes = {};
    const cur = tt.changes[iso];
    const row = cur && !cur.off ? cur.row : baseRow(tt, iso);
    const wd = D.weekday(iso);
    const fields = [
      { name: 'mode', label: '이날 수업', type: 'seg', value: cur && cur.off ? 'off' : 'on', options: [{ value: 'on', label: '수업 있음' }, { value: 'off', label: '수업 없음' }], hint: '재량휴업일처럼 수업이 없으면 ‘수업 없음’을 골라요. 그러면 아래 과목은 쓰지 않아요.', wide: true },
    ];
    tt.periods.forEach((p, i) => {
      if (p.rest) return;
      fields.push({ name: 'p' + i, label: p.label + (p.start ? ' (' + p.start + ')' : ''), value: row[i] || '', list: SUBJECTS, placeholder: '비우면 수업 없음', maxlength: 12 });
    });
    fields.push({ name: 'note', label: '까닭 (오늘 화면에 함께 보여요)', value: cur ? cur.note : '', placeholder: '예: 현장체험학습, 교과 교체', maxlength: 40, wide: true });
    CD.ui.form({
      title: D.shortDate(iso) + (iso === D.iso() ? ' (오늘)' : '') + '만 시간표 바꾸기',
      submit: '저장',
      fields,
      extra: cur ? [{ label: '기초시간표로 되돌리기', danger: true, fn: () => { delete tt.changes[iso]; store.save(); CD.refresh(); CD.ui.toast(D.shortDate(iso) + ' 시간표를 기초시간표로 되돌렸어요.'); } }] : [],
      onSubmit(v) {
        const base = baseRow(tt, iso);
        const next = tt.periods.map((p, i) => (p.rest ? '' : String(v['p' + i] || '').slice(0, 12)));
        const off = v.mode === 'off';
        const note = String(v.note || '').slice(0, 40);
        const same = !off && !note && next.every((x, i) => x === (base[i] || '')) && tt.days.includes(wd);
        if (same) delete tt.changes[iso];
        else tt.changes[iso] = { off, row: off ? base.slice() : next, note };
        // 30일 넘게 지난 날은 정리한다
        const old = D.addDays(D.iso(), -30);
        Object.keys(tt.changes).forEach((d) => { if (d < old) delete tt.changes[d]; });
        store.save();
        CD.refresh();
        CD.ui.toast(same ? '기초시간표와 같아서 바꾼 것을 지웠어요.' : D.shortDate(iso) + ' 시간표를 바꿨어요. 그날만 바꾼 시간표로 보여요.');
      },
    });
  }
  CD.changeDay = changeDay;

  function pickDay() {
    CD.ui.form({
      title: '다른 날 시간표 바꾸기',
      submit: '다음',
      fields: [{ name: 'date', label: '바꿀 날짜', type: 'date', value: D.addDays(D.iso(), 1), required: true }],
      onSubmit(v) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return '날짜를 골라 주세요.';
        setTimeout(() => changeDay(v.date), 0);
      },
    });
  }

  /** 오늘부터 앞으로 바꾼 날 목록 */
  function changeList(tt) {
    const today = D.iso();
    const days = Object.keys(tt.changes || {}).filter((d) => d >= today).sort();
    if (!days.length) return null;
    return h('section', { class: 'section', style: { 'margin-top': '1.6rem' } },
      h('h2', { text: '날짜별로 바꾼 시간표' }),
      h('ul', { class: 'items' }, days.map((d) => {
        const c = tt.changes[d];
        const base = baseRow(tt, d);
        const moved = c.off ? [] : tt.periods.map((p, i) => (!p.rest && (base[i] || '') !== (c.row[i] || '') ? p.label + ' ' + (base[i] || '빈칸') + '→' + (c.row[i] || '수업 없음') : null)).filter(Boolean);
        const what = c.off ? '수업 없음' : (moved.length ? moved.join(', ') : '과목은 그대로');
        return h('li', null, h('button', { type: 'button', on: { click: () => changeDay(d) } },
          h('span', { class: 't', text: D.shortDate(d) + (d === today ? ' (오늘)' : '') + (c.note ? ' · ' + c.note : '') }),
          h('span', { class: 'meta', text: what })));
      })));
  }

  function render(root) {
    const s = store.state;
    const tt = s.timetable;
    const todayWd = D.weekday(D.iso());
    const info = CD.nowInfo ? CD.nowInfo(tt) : { index: -1 };
    const head = h('tr', null, h('th', { class: 'rh' }), tt.days.map((d) => h('th', { class: d === todayWd ? 'today' : '', text: d + (d === todayWd ? ' (오늘)' : '') })));
    const body = tt.periods.map((p, i) => {
      if (p.rest) {
        return h('tr', { class: 'rest' }, h('th', { class: 'rh' }, p.label, h('small', { text: p.start + (p.end ? '~' + p.end : '') })), h('td', { colspan: String(tt.days.length), class: 'muted', style: { 'padding-left': '0.6rem' }, text: '' }));
      }
      return h('tr', null,
        h('th', { class: 'rh' }, p.label, h('small', { text: p.start + (p.end ? '~' + p.end : '') })),
        tt.days.map((d) => {
          const isToday = d === todayWd;
          const isNow = isToday && info.index === i && !info.waiting;
          const subj = tt.grid[d][i];
          return h('td', { class: (isToday ? 'today' : '') + (isNow ? ' now' : '') },
            h('button', { type: 'button', aria: { label: d + '요일 ' + p.label + ' ' + (subj || '빈 칸') + ', 고치기' }, on: { click: () => editCell(d, i) } },
              subj ? subj : h('span', { class: 'ph', text: '+' })));
        }));
    });
    root.append(CD.ui.page('시간표', [CD.ui.btn('오늘만 바꾸기', () => changeDay(D.iso()), 'primary'), CD.ui.btn('다른 날 바꾸기', pickDay), CD.ui.btn('교시와 시간 고치기', editPeriods, 'quiet'), CD.ui.btn('요일 고치기', editDays, 'quiet')],
      h('p', { class: 'help small', style: { 'margin-bottom': '0.9rem' }, text: '칸을 누르면 기초시간표의 과목을 바꿔요. 교과 교체나 행사로 하루만 달라지면 ‘오늘만 바꾸기’를 눌러요. 교시 시간을 맞춰 두면 오늘 화면에 지금 몇 교시인지 보여요.' }),
      h('table', { class: 'tt-table' }, h('thead', null, head), h('tbody', null, body)),
      changeList(tt)));
  }

  CD.modules.register({
    id: 'timetable',
    title: '시간표',
    group: 'day',
    order: 20,
    render,
    tick() { /* 교시가 바뀌면 다시 그린다 */
      const info = CD.nowInfo(store.state.timetable);
      if (info.index !== this._last) { this._last = info.index; CD.refresh(); }
    },
  });
})(window.CD = window.CD || {});
