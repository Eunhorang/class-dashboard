/*
 * 학급운영비 — 받은 돈과 쓴 돈을 적는 장부
 * 예산(처음 받은 돈)에서 쓴 돈을 빼 남은 돈을 보여 준다. 엑셀에서 여는 CSV 파일로 내보낼 수 있다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function totals(b, list) {
    const inSum = list.filter((e) => e.kind === 'in').reduce((t, e) => t + e.amount, 0);
    const outSum = list.filter((e) => e.kind === 'out').reduce((t, e) => t + e.amount, 0);
    return { inSum, outSum, left: b.base + inSum - outSum };
  }

  function entryForm(kind, entry) {
    const b = store.state.budget;
    const isIn = (entry ? entry.kind : kind) === 'in';
    CD.ui.form({
      title: entry ? '장부 고치기' : (isIn ? '받은 돈 적기' : '쓴 돈 적기'),
      submit: entry ? '저장' : '적기',
      fields: [
        { name: 'date', label: '날짜', type: 'date', value: entry ? entry.date : D.iso(), required: true },
        { name: 'amount', label: '금액 (원)', type: 'number', value: entry ? entry.amount : '', min: 0, step: 10, required: true, placeholder: '예: 24000' },
        { name: 'item', label: isIn ? '받은 곳' : '쓴 곳', value: entry ? entry.item : '', required: true, placeholder: isIn ? '예: 학급운영비 2차' : '예: 미술 활동 재료', wide: true },
        { name: 'memo', label: '메모', value: entry ? entry.memo : '', placeholder: '예: 영수증 받음', wide: true },
      ],
      extra: entry ? [{ label: '지우기', danger: true, fn: () => remove(entry) }] : [],
      onSubmit(v) {
        const amount = Math.round(Number(v.amount));
        if (!(amount > 0)) return '금액은 0보다 큰 숫자로 적어 주세요.';
        const data = { date: v.date, kind: isIn ? 'in' : 'out', item: v.item.slice(0, 60), amount, memo: (v.memo || '').slice(0, 100) };
        if (entry) Object.assign(entry, data);
        else b.entries.push(Object.assign({ id: CD.uid() }, data));
        store.save();
        CD.refresh();
      },
    });
  }

  function baseForm() {
    const b = store.state.budget;
    CD.ui.form({
      title: '예산 정하기',
      fields: [{ name: 'base', label: '올해 처음 받은 학급운영비 (원)', type: 'number', value: b.base || '', min: 0, step: 1000, placeholder: '예: 300000', hint: '나중에 더 받은 돈은 ‘받은 돈 적기’로 따로 적어요.' }],
      onSubmit(v) {
        b.base = Math.max(0, Math.round(Number(v.base) || 0));
        store.save();
        CD.refresh();
      },
    });
  }

  function remove(entry) {
    const list = store.state.budget.entries;
    const at = list.indexOf(entry);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(CD.ko.josa('‘' + entry.item + '’', '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, entry); store.save(); CD.refresh(); } });
  }

  function csv(b, rows) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [['날짜', '구분', '내용', '금액', '남은 돈', '메모'].map(q).join(',')];
    lines.push([q(''), q('예산'), q('처음 받은 학급운영비'), b.base, b.base, q('')].join(','));
    rows.forEach((r) => lines.push([q(r.e.date), q(r.e.kind === 'in' ? '받음' : '씀'), q(r.e.item), (r.e.kind === 'in' ? '' : '-') + r.e.amount, r.left, q(r.e.memo)].join(',')));
    return '﻿' + lines.join('\r\n');
  }

  function render(root, ctx) {
    const b = store.state.budget;
    const all = b.entries.slice().sort((x, y) => x.date.localeCompare(y.date));
    // 남은 돈은 날짜 순서대로 쌓아서 계산한다
    let run = b.base;
    const rows = all.map((e) => { run += e.kind === 'in' ? e.amount : -e.amount; return { e, left: run }; });
    const months = Array.from(new Set(all.map((e) => e.date.slice(0, 7)))).sort().reverse();
    const month = months.includes(ctx.params[0]) ? ctx.params[0] : 'all';
    const shown = rows.filter((r) => month === 'all' || r.e.date.startsWith(month)).reverse();
    const t = totals(b, all);
    const actions = [
      CD.ui.btn('쓴 돈 적기', () => entryForm('out'), 'primary'),
      CD.ui.btn('받은 돈 적기', () => entryForm('in')),
      CD.ui.btn(b.base ? '예산 바꾸기' : '예산 정하기', baseForm, 'quiet'),
      all.length ? CD.ui.btn('엑셀 파일로 저장', () => {
        CD.download('학급운영비-' + D.iso() + '.csv', csv(b, rows), 'text/csv;charset=utf-8');
        CD.ui.toast('CSV 파일로 저장했어요. 엑셀에서 열 수 있어요.');
      }, 'quiet') : null,
    ].filter(Boolean);

    const summary = h('div', { class: 'money' },
      h('div', null, h('span', { text: '예산' + (t.inSum ? ' (받은 돈 포함)' : '') }), h('b', { text: CD.won(b.base + t.inSum) })),
      h('div', null, h('span', { text: '쓴 돈' }), h('b', { text: CD.won(t.outSum) })),
      h('div', { class: t.left < 0 ? 'low' : '' }, h('span', { text: t.left < 0 ? '모자란 돈' : '남은 돈' }), h('b', { text: CD.won(t.left) })));

    if (!all.length) {
      root.append(CD.ui.page('학급운영비', actions, summary, CD.ui.empty('아직 적은 내용이 없어요', '먼저 예산을 정하고 돈을 쓸 때마다 ‘쓴 돈 적기’로 남겨요.')));
      return;
    }
    const filter = months.length > 1 ? h('div', { class: 'seg', role: 'radiogroup', aria: { label: '달 고르기' }, style: { 'margin-bottom': '1rem' } },
      [{ v: 'all', l: '전체' }].concat(months.slice(0, 8).map((m) => ({ v: m, l: Number(m.slice(5, 7)) + '월' }))).map((o) => h('label', null,
        h('input', { type: 'radio', name: 'bm', value: o.v, checked: o.v === month, on: { change: () => CD.go('budget' + (o.v === 'all' ? '' : '/' + o.v)) } }),
        h('span', { text: o.l })))) : null;
    const table = h('table', { class: 'table' },
      h('thead', null, h('tr', null, ['날짜', '구분', '내용', '메모'].map((x) => h('th', { text: x })), h('th', { class: 'num', text: '금액' }), h('th', { class: 'num', text: '남은 돈' }), h('th', { text: '' }))),
      h('tbody', null, shown.map((r) => h('tr', null,
        h('td', { style: { 'font-variant-numeric': 'tabular-nums', 'white-space': 'nowrap' }, text: D.shortDate(r.e.date) }),
        h('td', null, h('span', { class: 'kind ' + r.e.kind, text: r.e.kind === 'in' ? '받음' : '씀' })),
        h('td', null, h('b', { text: r.e.item })),
        h('td', { class: 'muted', text: r.e.memo }),
        h('td', { class: 'num', text: (r.e.kind === 'in' ? '+' : '-') + CD.won(r.e.amount) }),
        h('td', { class: 'num', text: CD.won(r.left) }),
        h('td', { style: { 'text-align': 'right' } }, CD.ui.btn('고치기', () => entryForm(r.e.kind, r.e), 'quiet sm'))))));
    root.append(CD.ui.page('학급운영비', actions, summary, filter, table));
  }

  CD.modules.register({ id: 'budget', title: '학급운영비', group: 'manage', order: 210, render });
})(window.CD = window.CD || {});
