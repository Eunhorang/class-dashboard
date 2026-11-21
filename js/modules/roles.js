/*
 * 1인1역 — 역할마다 맡은 학생, 날마다 '함' 도장
 * 역할 칸을 누르면 그날 역할을 했다는 도장이 찍힌다. '역할 돌리기'로 맡은 사람을 한 칸씩 옮긴다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;
  const PRESET = ['칠판 지우기', '우유 나르기', '창문 열고 닫기', '분리수거', '책꽂이 정리', '화분에 물 주기', '불 끄기', '급식차 정리', '학습지 나눠 주기', '신발장 정리', '복도 줄 세우기', '컴퓨터 끄기'];

  function nameList(sids) {
    const names = sids.map((id) => store.studentById(id)).filter((k) => k && !k.left).map((k) => k.name);
    return names.length ? names.join(', ') : '맡은 사람 없음';
  }

  function editRole(role) {
    const s = store.state;
    CD.ui.form({
      title: role ? '역할 고치기' : '역할 추가',
      submit: role ? '저장' : '추가',
      fields: [
        { name: 'name', label: '역할 이름', value: role ? role.name : '', required: true, placeholder: '예: 칠판 지우기', wide: true },
        { name: 'sids', label: '맡은 학생', type: 'checks', value: role ? role.sids : [], options: store.students().map((k) => ({ value: k.id, label: k.no + ' ' + k.name })) },
      ],
      extra: role ? [{ label: '지우기', danger: true, fn: () => removeRole(role) }] : [],
      onSubmit(v) {
        if (role) { role.name = v.name.slice(0, 30); role.sids = v.sids; }
        else s.roles.list.push({ id: CD.uid(), name: v.name.slice(0, 30), sids: v.sids });
        store.save();
        CD.refresh();
      },
    });
  }

  async function removeRole(role) {
    const ok = await CD.ui.confirm({ title: '역할 지우기', body: CD.ko.josa('‘' + role.name + '’', '을/를') + ' 지울까요?', ok: '지우기', danger: true });
    if (!ok) return;
    const list = store.state.roles.list;
    const at = list.indexOf(role);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(CD.ko.josa('‘' + role.name + '’', '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, role); store.save(); CD.refresh(); } });
  }

  /** 맡은 사람을 다음 역할로 한 칸씩 옮긴다(마지막 역할 사람은 첫 역할로) */
  function rotate() {
    const list = store.state.roles.list;
    if (list.length < 2) return;
    const before = list.map((r) => r.sids.slice());
    const last = list[list.length - 1].sids;
    for (let i = list.length - 1; i > 0; i--) list[i].sids = list[i - 1].sids;
    list[0].sids = last;
    store.save();
    CD.refresh();
    CD.ui.toast('맡은 사람을 다음 역할로 한 칸씩 옮겼어요.', { action: '되돌리기', fn: () => { list.forEach((r, i) => { r.sids = before[i]; }); store.save(); CD.refresh(); } });
  }

  function addPreset() {
    const s = store.state;
    const kids = store.students();
    s.roles.list = PRESET.map((name, i) => ({ id: CD.uid(), name, sids: kids.length ? [kids[(i * 2) % kids.length].id, kids[(i * 2 + 1) % kids.length].id].filter((v, j, a) => a.indexOf(v) === j) : [] }));
    store.save();
    CD.refresh();
    CD.ui.toast('흔히 쓰는 역할 12개를 넣고 번호 순서대로 두 명씩 맡겼어요. 역할을 눌러 고칠 수 있어요.');
  }

  function render(root, ctx) {
    const s = store.state;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(ctx.params[0] || '') ? ctx.params[0] : D.iso();
    const roles = s.roles.list;
    const actions = [
      CD.ui.btn('역할 추가', () => editRole(null), 'primary'),
      roles.length > 1 ? CD.ui.btn('역할 돌리기', rotate) : null,
    ].filter(Boolean);

    if (!roles.length) {
      root.append(CD.ui.page('1인1역', actions, CD.ui.empty('아직 역할이 없어요', '역할을 하나씩 만들거나, 흔히 쓰는 역할 12개를 한꺼번에 넣고 고쳐 써요.', CD.ui.btn('흔히 쓰는 역할 넣기', addPreset, 'primary'))));
      return;
    }
    const log = () => s.roles.log[date] || (s.roles.log[date] = {});
    const countEl = h('span');
    const update = () => {
      const l = s.roles.log[date] || {};
      const n = roles.filter((r) => l[r.id]).length;
      countEl.replaceChildren(n >= roles.length ? CD.ui.doneStamp('다 함') : CD.ui.count(n, roles.length));
    };
    const ul = h('ul', { class: 'roles' });
    roles.forEach((r) => {
      const done = !!(s.roles.log[date] || {})[r.id];
      const li = h('li', { class: 'role' + (done ? ' is-done' : ''), tabindex: '0', role: 'button', aria: { pressed: String(done), label: r.name + ', ' + nameList(r.sids) + (done ? ', 했어요' : '') } },
        h('span', { class: 'rn', text: r.name }),
        h('span', { class: 'stamp-mini', aria: { hidden: 'true' }, text: '함' }),
        h('span', { class: 'who', text: nameList(r.sids) }));
      const toggle = () => {
        const l = log();
        if (l[r.id]) delete l[r.id];
        else l[r.id] = Date.now();
        if (!Object.keys(l).length) delete s.roles.log[date];
        const now = !!(s.roles.log[date] || {})[r.id];
        li.classList.toggle('is-done', now);
        li.classList.toggle('is-new', now);
        li.setAttribute('aria-pressed', String(now));
        if (now) CD.sound.stamp();
        store.save();
        update();
      };
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      li.addEventListener('contextmenu', (e) => { e.preventDefault(); editRole(r); });
      ul.append(li);
    });
    update();

    const editList = h('details', { class: 'role-edit', style: { 'margin-top': '1.4rem' } },
      h('summary', { class: 'text-btn', text: '역할과 맡은 사람 고치기' }),
      h('ul', { class: 'items', style: { 'margin-top': '0.6rem' } }, roles.map((r) => h('li', null,
        h('button', { type: 'button', on: { click: () => editRole(r) } },
          h('span', { class: 't', text: r.name }),
          h('span', { class: 'count muted', text: '고치기' }),
          h('span', { class: 'meta', text: nameList(r.sids) }))))));

    root.append(CD.ui.page('1인1역', actions,
      h('div', { class: 'board-head' }, CD.dayNav(date, 'roles'), countEl),
      h('p', { class: 'help small', style: { 'margin-bottom': '0.8rem' }, text: '역할 칸을 누르면 그날 했다는 도장이 찍혀요. 역할 돌리기는 맡은 사람을 다음 역할로 한 칸씩 옮겨요.' }),
      ul,
      editList));
  }

  CD.modules.register({
    id: 'roles',
    title: '1인1역',
    group: 'check',
    order: 140,
    badge(s) {
      if (!s.roles.list.length) return '';
      const l = s.roles.log[D.iso()] || {};
      const left = s.roles.list.filter((r) => !l[r.id]).length;
      return left && left < s.roles.list.length ? left : '';
    },
    render,
  });
})(window.CD = window.CD || {});
