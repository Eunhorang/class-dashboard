/*
 * 시간표 — 요일과 교시로 짠 기초시간표
 * 칸을 누르면 과목을 고친다. 오늘 요일과 지금 교시는 먹색으로 짙게 보인다.
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
        s.timetable.periods = rows;
        s.timetable.grid = grid;
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
    root.append(CD.ui.page('시간표', [CD.ui.btn('교시와 시간 고치기', editPeriods), CD.ui.btn('요일 고치기', editDays, 'quiet')],
      h('p', { class: 'help small', style: { 'margin-bottom': '0.9rem' }, text: '칸을 누르면 과목을 바꿔요. 교시 시간을 맞춰 두면 오늘 화면에 지금 몇 교시인지 보여요.' }),
      h('table', { class: 'tt-table' }, h('thead', null, head), h('tbody', null, body))));
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
