/*
 * 행사 — 학교와 학급 행사 안내
 * 다가오는 행사는 D-day와 함께 오늘 화면에도 보인다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function edit(ev) {
    const s = store.state;
    CD.ui.form({
      title: ev ? '행사 고치기' : '행사 추가',
      submit: ev ? '저장' : '추가',
      fields: [
        { name: 'title', label: '행사 이름', value: ev ? ev.title : '', required: true, placeholder: '예: 현장체험학습', wide: true },
        { name: 'date', label: '날짜', type: 'date', value: ev ? ev.date : D.addDays(D.iso(), 7), required: true },
        { name: 'scope', label: '구분', type: 'seg', value: ev ? ev.scope : 'school', options: [{ value: 'school', label: '학교 행사' }, { value: 'class', label: '학급 행사' }] },
        { name: 'memo', label: '메모', value: ev ? ev.memo : '', placeholder: '예: 도시락, 물, 편한 옷', wide: true },
      ],
      extra: ev ? [{ label: '지우기', danger: true, fn: () => remove(ev) }] : [],
      onSubmit(v) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return '날짜를 골라 주세요.';
        const data = { title: v.title.slice(0, 60), date: v.date, scope: v.scope === 'class' ? 'class' : 'school', memo: (v.memo || '').slice(0, 100) };
        if (ev) Object.assign(ev, data);
        else s.events.push(Object.assign({ id: CD.uid() }, data));
        store.save();
        CD.refresh();
      },
    });
  }

  function remove(ev) {
    const list = store.state.events;
    const at = list.indexOf(ev);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(CD.ko.josa('‘' + ev.title + '’', '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, ev); store.save(); CD.refresh(); } });
  }

  function rows(list, past) {
    return h('ul', { class: 'items' }, list.map((ev) => h('li', null, h('button', { type: 'button', on: { click: () => edit(ev) } },
      h('span', { class: 't', text: ev.title }),
      h('span', { class: 'count num' }, h('b', { text: past ? D.shortDate(ev.date, false) : D.dday(ev.date) })),
      h('span', { class: 'meta', text: D.longDate(ev.date) + ' · ' + (ev.scope === 'class' ? '학급 행사' : '학교 행사') + (ev.memo ? ' · ' + ev.memo : '') })))));
  }

  function render(root) {
    const s = store.state;
    const all = s.events.slice().sort((a, b) => a.date.localeCompare(b.date));
    const up = all.filter((e) => D.daysFrom(e.date) >= 0);
    const past = all.filter((e) => D.daysFrom(e.date) < 0).reverse().slice(0, 10);
    const add = CD.ui.btn('행사 추가', () => edit(null), 'primary');
    const neis = CD.neis && CD.neis.on() ? (CD.neis.ensure(), CD.neis.schedule()) : [];
    const neisSec = CD.neis && CD.neis.on() ? h('section', { class: 'section' },
      h('h2', { text: '학사일정 (나이스)' }),
      neis.length ? h('ul', { class: 'items' }, neis.map((x) => h('li', null, h('div', { class: 'row' },
        h('span', { class: 't', text: x.name }),
        h('span', { class: 'count num' }, h('b', { text: D.dday(x.date) })),
        h('span', { class: 'meta', text: D.longDate(x.date) + (x.end && x.end !== x.date ? ' ~ ' + D.longDate(x.end) : '') + (x.off ? ' · 휴업일' : '') })))))
        : CD.ui.empty(CD.neis.loading() ? '학사일정을 받아 오는 중이에요' : '앞으로 8주 안의 학사일정이 없어요'),
      h('p', { class: 'help small', style: { 'margin-top': '0.6rem' }, text: '나이스 교육정보 개방 포털에서 받아 와요. 오늘 화면의 다가오는 행사에도 ‘학사’로 함께 보여요.' })) : null;
    if (!all.length) {
      if (neisSec) { root.append(CD.ui.page('행사', [add], neisSec)); return; }
      root.append(CD.ui.page('행사', [add], CD.ui.empty('등록된 행사가 없어요', '학교 행사와 학급 행사를 넣으면 오늘 화면에 D-day로 보여요.', CD.ui.btn('행사 추가', () => edit(null), 'primary'))));
      return;
    }
    root.append(CD.ui.page('행사', [add],
      h('section', { class: 'section' }, h('h2', { text: '다가오는 행사' }), up.length ? rows(up, false) : CD.ui.empty('다가오는 행사가 없어요')),
      neisSec,
      past.length ? h('section', { class: 'section' }, h('h2', { text: '지난 행사' }), rows(past, true)) : null));
  }

  CD.modules.register({
    id: 'events',
    title: '행사',
    group: 'manage',
    order: 220,
    badge(s) { const n = s.events.filter((e) => { const d = D.daysFrom(e.date); return d >= 0 && d <= 7; }).length; return n || ''; },
    render,
  });
})(window.CD = window.CD || {});
