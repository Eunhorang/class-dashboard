/*
 * 출결 — 날마다 결석·지각·조퇴·결과를 적고, 달마다 모아 본다
 * 나이스와 같은 이름을 쓴다. 기록이 없는 학생은 출석으로 본다.
 * 오늘 결석한 학생은 아침독서 체크와 뽑기에서 저절로 빠진다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  const STATUS = [['absent', '결석'], ['late', '지각'], ['early', '조퇴'], ['partial', '결과']];
  const REASON = [['sick', '질병'], ['unexcused', '미인정'], ['other', '기타'], ['approved', '출석인정']];
  const SL = Object.fromEntries(STATUS);
  const RL = Object.fromEntries(REASON);

  /** 그날 결석한 학생 id 모음 (다른 기능이 함께 쓴다) */
  function absentIds(date) {
    if (!store.isOn('attendance')) return new Set();
    const log = store.state.attendance.log[date || D.iso()] || {};
    return new Set(Object.keys(log).filter((id) => log[id].s === 'absent'));
  }
  CD.absentIds = absentIds;

  function label(rec) { return SL[rec.s] + '·' + RL[rec.r]; }

  /** 오늘 출결 한 줄 요약 (오늘 화면에서 쓴다) */
  function summary(date) {
    const s = store.state;
    const log = s.attendance.log[date] || {};
    const kids = store.students();
    const by = {};
    kids.forEach((k) => { const r = log[k.id]; if (r) (by[r.s] = by[r.s] || []).push(k.name + '(' + RL[r.r] + ')'); });
    const absent = (by.absent || []).length;
    return { taken: !!s.attendance.taken[date] || Object.keys(log).length > 0, present: kids.length - absent, total: kids.length, by };
  }
  CD.attendanceSummary = summary;

  function mark(date, k) {
    const s = store.state;
    const cur = (s.attendance.log[date] || {})[k.id];
    CD.ui.form({
      title: k.no + '번 ' + k.name + ' · ' + D.shortDate(date),
      fields: [
        { name: 's', label: '출결', type: 'seg', value: cur ? cur.s : 'absent', options: [{ value: 'present', label: '출석' }].concat(STATUS.map(([v, l]) => ({ value: v, label: l }))) },
        { name: 'r', label: '사유', type: 'seg', value: cur ? cur.r : 'sick', options: REASON.map(([v, l]) => ({ value: v, label: l })), hint: '출석인정은 체험학습이나 경조사처럼 출석으로 인정되는 경우예요.' },
        { name: 'm', label: '메모', value: cur ? cur.m : '', placeholder: '예: 감기, 병원 진료 후 등교', wide: true },
      ],
      onSubmit(v) {
        const log = s.attendance.log[date] || (s.attendance.log[date] = {});
        if (v.s === 'present') delete log[k.id];
        else log[k.id] = { s: v.s, r: v.r || 'sick', m: (v.m || '').slice(0, 60) };
        if (!Object.keys(log).length) delete s.attendance.log[date];
        s.attendance.taken[date] = Date.now();
        store.save();
        CD.refresh();
      },
    });
  }

  function renderDay(root, date) {
    const s = store.state;
    const kids = store.students();
    const log = s.attendance.log[date] || {};
    const sum = summary(date);
    const parts = STATUS.map(([v, l]) => (sum.by[v] || []).length ? l + ' ' + sum.by[v].length : null).filter(Boolean);
    const line = h('p', { class: 'missing' },
      h('b', { text: '출석 ' + sum.present + '명' + (parts.length ? ' · ' + parts.join(' · ') : '') }),
      parts.length ? ' — ' + STATUS.map(([v, l]) => (sum.by[v] || []).length ? l + ': ' + sum.by[v].join(', ') : null).filter(Boolean).join(' / ') : '');
    const confirmed = sum.taken;
    const board = h('div', { class: 'board', role: 'group', aria: { label: D.longDate(date) + ' 출결' } }, kids.map((k) => {
      const rec = log[k.id];
      return h('button', {
        type: 'button',
        class: 'cell' + (rec ? ' is-att is-' + rec.s : ''),
        aria: { label: k.name + ', ' + (rec ? label(rec) + (rec.m ? ', ' + rec.m : '') : '출석') + '. 눌러서 바꾸기' },
        on: { click: () => mark(date, k) },
      },
      h('span', { class: 'no num', text: String(k.no) }),
      h('span', { class: 'nm', text: k.name }),
      rec ? h('span', { class: 'att-label', text: label(rec) }) : h('span'));
    }));
    const actions = [
      confirmed ? null : CD.ui.btn('모두 출석으로 확인', () => {
        s.attendance.taken[date] = Date.now();
        store.save();
        CD.refresh();
        CD.ui.toast(D.shortDate(date) + ' 출결을 확인했어요.');
      }, 'primary'),
      CD.ui.btn('이달 모아 보기', () => CD.go('attendance/month/' + date.slice(0, 7))),
    ].filter(Boolean);
    root.append(CD.ui.page('출결', actions,
      h('div', { class: 'board-head' }, CD.dayNav(date, 'attendance'), confirmed ? CD.ui.doneStamp('확인') : null),
      line,
      board,
      h('p', { class: 'help small', style: { 'margin-top': '1rem' }, text: '학생 이름을 누르면 결석·지각·조퇴·결과와 사유를 적어요. 아무것도 적지 않은 학생은 출석이에요. 오늘 결석한 학생은 아침독서와 뽑기에서 저절로 빠져요.' })));
  }

  function renderMonth(root, ym) {
    const s = store.state;
    const kids = s.students.slice().sort((a, b) => a.no - b.no);
    const [y, m] = ym.split('-').map(Number);
    const prev = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
    const next = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
    const rows = kids.map((k) => {
      const c = { absent: 0, late: 0, early: 0, partial: 0 };
      const days = [];
      Object.keys(s.attendance.log).filter((d) => d.startsWith(ym)).sort().forEach((d) => {
        const r = s.attendance.log[d][k.id];
        if (!r) return;
        c[r.s]++;
        days.push(D.shortDate(d, false) + ' ' + label(r) + (r.m ? '(' + r.m + ')' : ''));
      });
      return { k, c, days };
    });
    const tot = { absent: 0, late: 0, early: 0, partial: 0 };
    rows.forEach((r) => STATUS.forEach(([v]) => { tot[v] += r.c[v]; }));
    const csv = () => {
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const lines = [['번호', '이름', '결석', '지각', '조퇴', '결과', '날짜와 사유'].map(q).join(',')];
      rows.forEach((r) => lines.push([r.k.no, q(r.k.name), r.c.absent, r.c.late, r.c.early, r.c.partial, q(r.days.join(' / '))].join(',')));
      CD.download('출결-' + ym + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      CD.ui.toast(m + '월 출결을 CSV 파일로 저장했어요. 엑셀에서 열 수 있어요.');
    };
    const nav = h('div', { class: 'day-nav' },
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '지난달' }, on: { click: () => CD.go('attendance/month/' + prev) } }, CD.icon('left')),
      h('span', { class: 'lbl', text: y + '년 ' + m + '월' }),
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '다음 달' }, on: { click: () => CD.go('attendance/month/' + next) } }, CD.icon('right')));
    const table = h('table', { class: 'table' },
      h('thead', null, h('tr', null, h('th', { class: 'num', text: '번호' }), h('th', { text: '이름' }), STATUS.map(([, l]) => h('th', { class: 'num', text: l })), h('th', { text: '날짜와 사유' }))),
      h('tbody', null, rows.map((r) => h('tr', null,
        h('td', { class: 'num', text: String(r.k.no) }),
        h('td', null, h('b', { text: r.k.name }), r.k.left ? h('span', { class: 'muted', text: ' 전학' }) : null),
        STATUS.map(([v]) => h('td', { class: 'num', text: r.c[v] ? String(r.c[v]) : '·' })),
        h('td', { class: 'muted', text: r.days.join(' / ') }))),
      h('tr', null, h('td'), h('td', null, h('b', { text: '모두' })), STATUS.map(([v]) => h('td', { class: 'num' }, h('b', { text: String(tot[v]) }))), h('td'))));
    root.append(CD.ui.page('출결', [CD.ui.btn('날짜별로 보기', () => CD.go('attendance')), CD.ui.btn('엑셀 파일로 저장', csv, 'quiet')],
      h('div', { class: 'board-head' }, nav),
      h('p', { class: 'help small', style: { 'margin-bottom': '0.8rem' }, text: '나이스에 옮겨 적기 좋게 이달 기록을 학생별로 모았어요.' }),
      table));
  }

  function render(root, ctx) {
    if (!store.students().length) {
      root.append(CD.ui.page('출결', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 날마다 출결을 적을 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    if (ctx.params[0] === 'month') {
      const ym = /^\d{4}-\d{2}$/.test(ctx.params[1] || '') ? ctx.params[1] : D.iso().slice(0, 7);
      renderMonth(root, ym);
      return;
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(ctx.params[0] || '') ? ctx.params[0] : D.iso();
    renderDay(root, date);
  }

  CD.modules.register({
    id: 'attendance',
    title: '출결',
    group: 'check',
    order: 105,
    badge(s) {
      const today = D.iso();
      if (['토', '일'].includes(D.weekday(today)) || !store.students().length) return '';
      const log = s.attendance.log[today] || {};
      const n = Object.values(log).filter((r) => r.s === 'absent').length;
      return n || '';
    },
    render,
  });
})(window.CD = window.CD || {});
