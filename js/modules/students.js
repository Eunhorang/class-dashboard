/*
 * 학생 명단 — 모든 체크와 게임이 함께 쓰는 명단
 * 엑셀·나이스에서 복사한 명단을 붙여 넣으면 번호 칸은 빼고 이름만 들어간다.
 * 전학 간 학생은 '전학'으로 표시해 체크에서 빼고, 지난 기록은 남겨 둔다.
 * '명단 인쇄'는 A4 한 장짜리 명렬표를 만든다. 확인용 빈칸을 붙이면 종이 체크표로 쓸 수 있다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function nextNo() {
    return store.state.students.reduce((m, k) => Math.max(m, k.no), 0) + 1;
  }

  function addMany(names) {
    const s = store.state;
    let no = nextNo();
    const have = new Set(s.students.map((k) => k.name));
    const dup = names.filter((n) => have.has(n));
    names.forEach((name) => s.students.push({ id: CD.uid(), no: no++, name: name.slice(0, 30), note: '', left: false }));
    store.save();
    CD.refresh();
    let msg = names.length + '명을 넣었어요.';
    if (dup.length) msg += ' 이미 있던 이름도 함께 들어갔어요: ' + dup.slice(0, 3).join(', ') + (dup.length > 3 ? ' 외' : '');
    CD.ui.toast(msg);
  }

  function addForm() {
    CD.ui.form({
      title: '학생 넣기',
      submit: '넣기',
      fields: [{
        name: 'names', label: '이름', type: 'textarea', rows: 8, required: true,
        placeholder: '한 줄에 한 명씩 적거나, 엑셀·나이스에서 번호와 이름 칸을 그대로 복사해 붙여 넣어요.',
        hint: '번호 칸이나 "1. 김민준"처럼 앞에 붙은 번호는 알아서 빼고 번호는 지금 명단 다음부터 이어서 매겨요.',
      }],
      onSubmit(v) {
        const names = CD.ko.parseNames(v.names);
        if (!names.length) return '이름을 찾지 못했어요. 한 줄에 한 명씩 적어 주세요.';
        addMany(names);
      },
    });
  }

  function importWheel() {
    const lists = store.wheelLists();
    if (!lists.length) { CD.ui.toast('이 브라우저의 빙글빙글 돌림판에 저장된 목록이 없어요.'); return; }
    CD.ui.form({
      title: '돌림판 목록 불러오기',
      submit: '불러오기',
      fields: [{ name: 'i', label: '목록', type: 'select', value: '0', options: lists.map((l, i) => ({ value: String(i), label: l.title + ' (' + l.names.length + '명)' })) }],
      onSubmit(v) { addMany(lists[Number(v.i)].names); },
    });
  }

  function editForm(k) {
    CD.ui.form({
      title: k.name + ' 고치기',
      fields: [
        { name: 'no', label: '번호', type: 'number', value: k.no, min: 1, max: 99, required: true },
        { name: 'name', label: '이름', value: k.name, required: true },
        { name: 'note', label: '메모 (선생님만 봐요)', value: k.note, placeholder: '예: 우유 알레르기', wide: true },
        { name: 'left', label: '상태', type: 'seg', value: k.left ? 'left' : 'in', options: [{ value: 'in', label: '우리 반' }, { value: 'left', label: '전학 감' }], hint: '전학 간 학생은 체크와 게임에서 빠지고 지난 기록은 남아요.' },
      ],
      extra: [{ label: '명단에서 지우기', danger: true, fn: () => remove(k) }],
      onSubmit(v) {
        k.no = Math.max(1, Math.round(Number(v.no) || k.no));
        k.name = String(v.name).slice(0, 30);
        k.note = String(v.note || '').slice(0, 100);
        k.left = v.left === 'left';
        store.save();
        CD.refresh();
      },
    });
  }

  async function remove(k) {
    const ok = await CD.ui.confirm({ title: '학생 지우기', body: CD.ko.josa(k.name, '을/를') + ' 명단에서 지울까요? 전학이라면 지우지 말고 ‘전학 감’으로 표시하는 편이 기록이 남아 좋아요.', ok: '지우기', danger: true });
    if (!ok) return;
    const list = store.state.students;
    const at = list.indexOf(k);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(CD.ko.josa(k.name, '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, k); store.save(); CD.refresh(); } });
  }

  function renumber() {
    const s = store.state;
    const before = s.students.map((k) => k.no);
    const sorted = s.students.slice().sort((a, b) => CD.ko.collator.compare(a.name, b.name));
    sorted.forEach((k, i) => { k.no = i + 1; });
    store.save();
    CD.refresh();
    CD.ui.toast('가나다순으로 번호를 다시 매겼어요.', { action: '되돌리기', fn: () => { s.students.forEach((k, i) => { k.no = before[i]; }); store.save(); CD.refresh(); } });
  }

  /* ---------- 명단 인쇄 ---------- */
  function printForm() {
    const s = store.state;
    const hasLeft = s.students.some((k) => k.left);
    CD.ui.form({
      title: '명단 인쇄',
      submit: '인쇄하기',
      fields: [
        { name: 'title', label: '제목', value: (s.profile.title || '우리 반') + ' 학생 명단', required: true, maxlength: 60, wide: true },
        { name: 'cols', label: '확인용 빈칸', type: 'seg', value: '0', options: [{ value: '0', label: '없음' }, { value: '5', label: '5칸' }, { value: '8', label: '8칸' }, { value: '12', label: '12칸' }], hint: '안내장 회수나 과제 확인을 종이에 표시할 때 붙여요. 칸 머리는 비워 두니 손으로 적어요.', wide: true },
        { name: 'more', label: '함께 넣을 것', type: 'checks', value: [], options: [{ value: 'memo', label: '메모' }].concat(hasLeft ? [{ value: 'left', label: '전학 간 학생' }] : []), hint: '메모는 선생님만 보는 내용이라 꼭 필요할 때만 넣어요.', wide: true },
      ],
      onSubmit(v) {
        const opt = { title: v.title.slice(0, 60), cols: Number(v.cols) || 0, memo: v.more.includes('memo'), left: v.more.includes('left') };
        // 창이 닫힌 뒤에 인쇄 창을 연다
        setTimeout(() => printRoster(opt), 60);
      },
    });
  }

  function printRoster(o) {
    const s = store.state;
    const kids = s.students.filter((k) => o.left || !k.left).sort((a, b) => a.no - b.no || CD.ko.collator.compare(a.name, b.name));
    const blanks = Array.from({ length: o.cols }, () => null);
    const plain = !o.cols && !o.memo;
    // 한 장(A4 세로, 위아래 여백과 머리를 빼면 약 248mm)에 들어가게 줄 높이를 정한다.
    // 40명쯤까지 한 장에 들어가고, 더 많으면 다음 장으로 넘어가며 머리줄이 다시 찍힌다
    const rowMm = Math.min(11, Math.max(5.8, (246 - kids.length * 0.2) / Math.max(1, kids.length)));
    const table = h('table', { class: 'pr-table' + (plain ? ' is-plain' : '') },
      h('thead', null, h('tr', null,
        h('th', { class: 'pr-no', text: '번호' }),
        h('th', { class: 'pr-name', text: '이름' }),
        o.memo ? h('th', { class: 'pr-memo', text: '메모' }) : null,
        blanks.map(() => h('th', { class: 'pr-blank' })))),
      h('tbody', null, kids.map((k) => h('tr', null,
        h('td', { class: 'pr-no', text: String(k.no) }),
        h('td', { class: 'pr-name' }, k.name, k.left ? h('small', { text: ' 전학' }) : null),
        o.memo ? h('td', { class: 'pr-memo', text: k.note || '' }) : null,
        blanks.map(() => h('td', { class: 'pr-blank' }))))));
    table.style.setProperty('--pr-row', rowMm.toFixed(1) + 'mm');
    const area = h('section', { id: 'printArea', class: 'print-area', aria: { hidden: 'true' } },
      h('header', { class: 'pr-head' },
        h('h1', { text: o.title }),
        h('p', { text: [s.profile.year, kids.length + '명', D.iso().replace(/-/g, '. ') + '.'].filter(Boolean).join(' · ') })),
      table);
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

  function render(root) {
    const s = store.state;
    const list = s.students.slice().sort((a, b) => a.no - b.no || CD.ko.collator.compare(a.name, b.name));
    const actions = [
      CD.ui.btn('학생 넣기', addForm, 'primary'),
      store.wheelLists().length ? CD.ui.btn('돌림판 목록 불러오기', importWheel) : null,
      list.length > 1 ? CD.ui.btn('가나다순 번호 매기기', renumber, 'quiet') : null,
      list.length ? CD.ui.btn('명단 인쇄', printForm, 'quiet') : null,
    ].filter(Boolean);
    if (!list.length) {
      root.append(CD.ui.page('학생 명단', actions, CD.ui.empty('아직 학생이 없어요', '엑셀이나 나이스에서 번호와 이름 칸을 복사해 ‘학생 넣기’에 붙여 넣으면 한꺼번에 들어가요.', CD.ui.btn('학생 넣기', addForm, 'primary'))));
      return;
    }
    const inClass = list.filter((k) => !k.left).length;
    const table = h('table', { class: 'table' },
      h('thead', null, h('tr', null, h('th', { class: 'num', text: '번호' }), h('th', { text: '이름' }), h('th', { text: '메모' }), h('th', { text: '상태' }), h('th', { text: '' }))),
      h('tbody', null, list.map((k) => h('tr', null,
        h('td', { class: 'num', text: String(k.no) }),
        h('td', null, h('b', { text: k.name })),
        h('td', { class: 'muted', text: k.note }),
        h('td', { text: k.left ? '전학 감' : '' , class: k.left ? 'muted' : '' }),
        h('td', { style: { 'text-align': 'right' } }, CD.ui.btn('고치기', () => editForm(k), 'quiet sm'))))));
    root.append(CD.ui.page('학생 명단', actions,
      h('p', { class: 'help', style: { 'margin-bottom': '1rem' }, text: '우리 반 ' + inClass + '명' + (list.length > inClass ? ' · 전학 ' + (list.length - inClass) + '명' : '') + '. 출결과 여러 체크, 관찰 기록, 뽑기와 게임이 모두 이 명단을 써요.' }),
      table));
  }

  CD.modules.register({
    id: 'students',
    title: '학생 명단',
    group: 'manage',
    order: 200,
    badge() { return store.students().length || ''; },
    render,
  });
})(window.CD = window.CD || {});
