/*
 * 알림장 — 날짜마다 번호 목록 하나
 * 쓰면 오늘 화면에도 보이고, '크게 보기'로 교실 TV에 띄워 학생들이 옮겨 적는다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function find(date) { return store.state.notices.find((n) => n.date === date); }

  function edit(date) {
    const s = store.state;
    const note = find(date);
    const prev = s.notices.filter((n) => n.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
    CD.ui.form({
      title: D.longDate(date) + ' 알림장',
      fields: [{ name: 'items', label: '한 줄에 하나씩', type: 'lines', rows: 8, value: note ? note.items : [], placeholder: '예: 수학 익힘책 52~53쪽 풀기\n체육복 입고 오기', hint: '번호는 알아서 붙어요.' }],
      extra: [
        prev && !note ? { label: '지난 알림장 가져오기', fn: () => { s.notices.push({ id: CD.uid(), date, items: prev.items.slice() }); store.save(); CD.refresh(); edit(date); } } : null,
        note ? { label: '지우기', danger: true, fn: () => remove(note) } : null,
      ].filter(Boolean),
      onSubmit(v) {
        const items = v.items.map((t) => t.replace(/^\d{1,2}\s*[.)]\s*/, '').slice(0, 120)).filter(Boolean);
        if (note) { if (items.length) note.items = items; else s.notices.splice(s.notices.indexOf(note), 1); }
        else if (items.length) s.notices.push({ id: CD.uid(), date, items });
        store.save();
        CD.refresh();
      },
    });
  }

  function remove(note) {
    const list = store.state.notices;
    const at = list.indexOf(note);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(D.shortDate(note.date) + ' 알림장을 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, note); store.save(); CD.refresh(); } });
  }

  function render(root, ctx) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(ctx.params[0] || '') ? ctx.params[0] : D.iso();
    const note = find(date);
    const big = document.body.classList.contains('big');
    const actions = [
      CD.ui.btn(note ? '고치기' : '쓰기', () => edit(date), 'primary'),
      note ? CD.ui.btn('복사하기', async () => {
        const text = D.longDate(date) + ' 알림장\n' + note.items.map((t, i) => (i + 1) + '. ' + t).join('\n');
        CD.ui.toast(await CD.copyText(text) ? '알림장을 복사했어요. 학급 누리집이나 메신저에 붙여 넣으세요.' : '복사하지 못했어요. 다시 눌러 주세요.');
      }, 'quiet') : null,
      note ? CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet') : null,
    ].filter(Boolean);
    const body = note
      ? h('ol', { class: 'note-list' }, note.items.map((t, i) => h('li', null, h('span', { text: String(i + 1) }), t)))
      : CD.ui.empty(D.longDate(date) + ' 알림장이 없어요', '‘쓰기’를 누르고 한 줄에 하나씩 적어요.');
    const recent = store.state.notices.filter((n) => n.date !== date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    root.append(CD.ui.page('알림장', actions,
      h('div', { class: 'board-head' }, CD.dayNav(date, 'notice')),
      h('div', { class: big ? 'notice-big' : '' }, body),
      recent.length && !big ? h('section', { class: 'section', style: { 'margin-top': '2rem' } },
        h('h2', { text: '지난 알림장' }),
        h('ul', { class: 'items' }, recent.map((n) => h('li', null, h('button', { type: 'button', on: { click: () => CD.go('notice/' + n.date) } },
          h('span', { class: 't', text: D.longDate(n.date) }),
          h('span', { class: 'count muted', text: n.items.length + '줄' }),
          h('span', { class: 'meta', text: n.items.slice(0, 2).join(' · ') })))))) : null));
  }

  CD.modules.register({ id: 'notice', title: '알림장', group: 'day', order: 30, render });
})(window.CD = window.CD || {});
