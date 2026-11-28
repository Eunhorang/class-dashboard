/*
 * 학생 관찰 기록 — 학생마다 날짜·영역별로 쌓는 누가 기록
 * 학생 개인 기록이라 들어올 때마다 가리개를 씌우고, 오늘 화면에는 보이지 않는다.
 * 기록이 적은 학생을 먼저 알려 주어 고르게 살피게 돕는다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  const CATS = [['life', '생활'], ['study', '학습'], ['friend', '교우 관계'], ['praise', '칭찬'], ['talk', '상담'], ['etc', '기타']];
  const CL = Object.fromEntries(CATS);

  let revealed = false;   // 이번에 들어와서 가리개를 걷었는지
  let lastAct = 0;        // 마지막으로 누르거나 친 때
  const IDLE = 5 * 60 * 1000;
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { lastAct = Date.now(); }, true));
  let catFilter = 'all';
  let query = '';

  function namesOf(sids) {
    return sids.map((id) => store.studentById(id)).filter(Boolean).map((k) => k.name);
  }

  function edit(note, presetSid) {
    const s = store.state;
    const kids = s.students.slice().sort((a, b) => a.no - b.no);
    CD.ui.form({
      title: note ? '관찰 기록 고치기' : '관찰 기록 쓰기',
      submit: note ? '저장' : '기록하기',
      fields: [
        { name: 'date', label: '날짜', type: 'date', value: note ? note.date : D.iso(), required: true },
        { name: 'cat', label: '영역', type: 'seg', value: note ? note.cat : 'life', options: CATS.map(([v, l]) => ({ value: v, label: l })) },
        { name: 'sids', label: '학생 (여러 명이면 함께 골라요)', type: 'checks', value: note ? note.sids : (presetSid ? [presetSid] : []), options: kids.map((k) => ({ value: k.id, label: k.no + ' ' + k.name + (k.left ? ' (전학)' : '') })) },
        { name: 'text', label: '관찰한 내용', type: 'textarea', rows: 5, value: note ? note.text : '', required: true, placeholder: '본 것을 있는 그대로 적어요. 예: 모둠 활동에서 친구의 의견을 끝까지 듣고 정리해 발표함.' },
      ],
      extra: note ? [{ label: '지우기', danger: true, fn: () => remove(note) }] : [],
      onSubmit(v) {
        if (!v.sids.length) return '학생을 한 명 이상 골라 주세요.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return '날짜를 골라 주세요.';
        const data = { date: v.date, cat: v.cat || 'etc', sids: v.sids, text: v.text.slice(0, 1000) };
        if (note) Object.assign(note, data);
        else s.notes.push(Object.assign({ id: CD.uid(), at: Date.now() }, data));
        store.save();
        CD.refresh();
        CD.ui.toast(note ? '기록을 고쳤어요.' : namesOf(v.sids).join(', ') + ' 관찰 기록을 남겼어요.');
      },
    });
  }

  async function remove(note) {
    const ok = await CD.ui.confirm({ title: '관찰 기록 지우기', body: D.shortDate(note.date) + ' 기록을 지울까요?', ok: '지우기', danger: true });
    if (!ok) return;
    const list = store.state.notes;
    const at = list.indexOf(note);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast('기록을 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, note); store.save(); CD.refresh(); } });
  }

  function exportCsv() {
    const s = store.state;
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [['번호', '이름', '날짜', '영역', '관찰한 내용'].map(q).join(',')];
    s.students.slice().sort((a, b) => a.no - b.no).forEach((k) => {
      s.notes.filter((n) => n.sids.includes(k.id)).sort((a, b) => a.date.localeCompare(b.date)).forEach((n) => {
        lines.push([k.no, q(k.name), q(n.date), q(CL[n.cat]), q(n.text)].join(','));
      });
    });
    CD.download('관찰기록-' + (s.profile.title || '학급').replace(/[\\/:*?"<>|\s]+/g, '-') + '-' + D.iso() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    CD.ui.toast('관찰 기록을 CSV 파일로 저장했어요. 학생 개인 기록이니 안전한 곳에 두세요.');
  }

  function curtain(root) {
    root.append(CD.ui.page('학생 관찰 기록', [],
      h('div', { class: 'curtain' },
        h('p', { class: 'empty-title', text: '학생 개인 기록이라 가려 두었어요' }),
        h('p', { class: 'help', text: '교실 TV에 그대로 뜨지 않게 들어올 때마다 한 번 더 눌러야 보여요. 5분 동안 아무것도 누르지 않으면 다시 가려져요. 학생들이 화면을 보지 않을 때 열어 주세요.' }),
        CD.ui.btn('기록 보기', () => { revealed = true; lastAct = Date.now(); if (document.body.classList.contains('big')) CD.setBig(false); else CD.refresh(); }, 'primary big'))));
  }

  function render(root, ctx) {
    if (!revealed) { curtain(root); return; }
    const s = store.state;
    const kids = s.students.slice().sort((a, b) => a.no - b.no);
    if (!kids.length) {
      root.append(CD.ui.page('학생 관찰 기록', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 학생마다 관찰 기록을 남길 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    const sel = kids.find((k) => k.id === ctx.params[0]) || null;
    const counts = {};
    const last = {};
    s.notes.forEach((n) => n.sids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; if (!last[id] || n.date > last[id]) last[id] = n.date; }));

    const shown = kids.filter((k) => !k.left || counts[k.id]);  // 전학 간 학생은 기록이 있을 때만

    // 왼쪽: 학생 목록
    const ul = h('ul', { class: 'items' },
      h('li', null, h('button', { type: 'button', aria: { current: String(!sel) }, on: { click: () => CD.go('notes') } },
        h('span', { class: 't', text: '모든 학생' }),
        h('span', { class: 'count num' }, h('b', { text: String(s.notes.length) }), h('small', { text: '개' })),
        h('span', { class: 'meta', text: '날짜순으로 모두 보기' }))),
      shown.map((k) => h('li', null, h('button', { type: 'button', aria: { current: String(sel === k) }, on: { click: () => CD.go('notes/' + k.id) } },
        h('span', { class: 't', text: k.no + ' ' + k.name }),
        h('span', { class: 'count num' }, h('b', { text: String(counts[k.id] || 0) }), h('small', { text: '개' })),
        h('span', { class: 'meta', text: last[k.id] ? '마지막 ' + D.shortDate(last[k.id]) : '아직 기록 없음' })))));

    // 좁은 화면에서는 긴 목록 대신 고르기 칸으로
    const picker = h('label', { class: 'note-pick' },
      h('span', { text: '학생' }),
      h('select', { aria: { label: '학생 고르기' }, on: { change: (e) => CD.go(e.target.value ? 'notes/' + e.target.value : 'notes') } },
        h('option', { value: '', text: '모든 학생 (' + s.notes.length + '개)', selected: !sel }),
        shown.map((k) => h('option', { value: k.id, text: k.no + ' ' + k.name + ' (' + (counts[k.id] || 0) + '개)', selected: sel === k }))));

    // 기록이 적은 학생 알림
    const active = kids.filter((k) => !k.left);
    const fewest = active.slice().sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0) || (last[a.id] || '').localeCompare(last[b.id] || '')).slice(0, 4);
    const nudge = active.length && s.notes.length ? h('p', { class: 'help small', style: { 'margin-bottom': '0.9rem' }, text: '기록이 적은 학생: ' + fewest.map((k) => k.name + ' ' + (counts[k.id] || 0) + '개').join(', ') + '. 고르게 살펴보세요.' }) : null;

    // 오른쪽: 기록
    const filterSeg = h('div', { class: 'seg', role: 'radiogroup', aria: { label: '영역 고르기' } },
      [['all', '모두']].concat(CATS).map(([v, l]) => h('label', null,
        h('input', { type: 'radio', name: 'ncat', value: v, checked: catFilter === v, on: { change: () => { catFilter = v; CD.refresh(); } } }),
        h('span', { text: l }))));
    const search = h('input', { type: 'search', placeholder: '내용 찾기', value: query, aria: { label: '기록 내용 찾기' }, style: { 'max-width': '16rem' } });
    search.addEventListener('input', CD.debounce(() => { query = search.value.trim(); CD.refresh(); const el = document.querySelector('.view-notes input[type="search"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 300));
    const list = s.notes
      .filter((n) => !sel || n.sids.includes(sel.id))
      .filter((n) => catFilter === 'all' || n.cat === catFilter)
      .filter((n) => !query || n.text.includes(query) || namesOf(n.sids).some((nm) => nm.includes(query)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
    const entries = list.length
      ? h('ol', { class: 'note-log' }, list.map((n) => h('li', null,
        h('div', { class: 'nl-head' },
          h('b', { class: 'num', text: D.shortDate(n.date) }),
          h('span', { class: 'kind', text: CL[n.cat] }),
          h('span', { class: 'nl-who', text: namesOf(n.sids).join(', ') || '지운 학생' }),
          CD.ui.btn('고치기', () => edit(n), 'quiet sm')),
        h('p', { class: 'nl-text', text: n.text }))))
      : CD.ui.empty(sel ? sel.name + ' 기록이 없어요' : '맞는 기록이 없어요', sel ? '‘기록 쓰기’로 오늘 본 모습을 남겨 보세요.' : null);

    root.append(CD.ui.page('학생 관찰 기록', [
      CD.ui.btn(sel ? sel.name + ' 기록 쓰기' : '기록 쓰기', () => edit(null, sel && sel.id), 'primary'),
      sel ? CD.ui.btn(sel.name + ' 한 장 보기', () => { CD.sheetPass = Date.now(); CD.go('sheet/' + sel.id); }) : null,
      s.notes.length ? CD.ui.btn('엑셀 파일로 저장', exportCsv, 'quiet') : null,
      CD.ui.btn('가리기', () => { revealed = false; CD.refresh(); }, 'quiet'),
    ].filter(Boolean),
    nudge,
    h('div', { class: 'split' },
      h('div', { class: 'note-roster' }, ul),
      h('div', null, picker, h('div', { class: 'tool-row' }, filterSeg, search), entries))));
  }

  CD.modules.register({
    id: 'notes',
    title: '관찰 기록',
    group: 'manage',
    order: 205,
    render,
    tick() {
      if (revealed && Date.now() - lastAct > IDLE && !document.querySelector('dialog[open]')) { revealed = false; CD.refresh(); }
    },
    leave(changed) { if (changed) revealed = false; },
  });
})(window.CD = window.CD || {});
