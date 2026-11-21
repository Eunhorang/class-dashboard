/*
 * 과제·안내장·미션 — 같은 모양의 체크 화면 세 개
 * 왼쪽에서 항목을 고르고, 오른쪽 도장판에서 학생 이름을 눌러 도장을 찍는다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  function makeCheck(cfg) {
    const kids = () => store.students();
    const items = () => store.state[cfg.key];
    const doneCount = (it, list) => list.filter((k) => it.done[k.id]).length;

    function sorted(list) {
      const total = kids().length;
      return items().slice().sort((a, b) => {
        const fa = total && doneCount(a, kids()) >= total;
        const fb = total && doneCount(b, kids()) >= total;
        if (fa !== fb) return fa ? 1 : -1;
        return (a.due || '9999').localeCompare(b.due || '9999') || b.createdAt - a.createdAt;
      });
    }

    function editForm(item) {
      CD.ui.form({
        title: item ? cfg.noun + ' 고치기' : cfg.addLabel,
        submit: item ? '저장' : '추가',
        fields: [
          { name: 'title', label: cfg.noun + ' 이름', value: item ? item.title : '', required: true, placeholder: cfg.placeholder, wide: true },
          { name: 'due', label: cfg.dueLabel + ' (없으면 비워 두기)', type: 'date', value: item ? item.due : (cfg.defaultDue ? D.nextSchoolDay() : '') },
        ],
        extra: item ? [{ label: '지우기', danger: true, fn: () => remove(item) }] : [],
        onSubmit(v) {
          if (item) {
            item.title = v.title.slice(0, 80);
            item.due = v.due || '';
            store.save();
            CD.refresh();
          } else {
            const it = { id: CD.uid(), title: v.title.slice(0, 80), due: v.due || '', createdAt: Date.now(), done: {} };
            store.state[cfg.key].push(it);
            store.save();
            CD.go(cfg.id + '/' + it.id);
          }
        },
      });
    }

    async function remove(item) {
      const ok = await CD.ui.confirm({ title: cfg.noun + ' 지우기', body: CD.ko.josa('‘' + item.title + '’', '과/와') + ' 찍어 둔 도장을 모두 지울까요?', ok: '지우기', danger: true });
      if (!ok) return;
      const list = store.state[cfg.key];
      const at = list.indexOf(item);
      list.splice(at, 1);
      store.save();
      CD.go(cfg.id);
      CD.ui.toast(CD.ko.josa('‘' + item.title + '’', '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, item); store.save(); CD.go(cfg.id + '/' + item.id); } });
    }

    function render(root, ctx) {
      const list = sorted(items());
      const students = kids();
      const add = CD.ui.btn(cfg.addLabel, () => editForm(null), 'primary');

      if (!students.length) {
        root.append(CD.ui.page(cfg.title, [add], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣어야 도장을 찍을 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
        return;
      }
      if (!list.length) {
        root.append(CD.ui.page(cfg.title, [add], CD.ui.empty(cfg.emptyTitle, cfg.emptyText, CD.ui.btn(cfg.addLabel, () => editForm(null), 'primary'))));
        return;
      }
      const sel = list.find((x) => x.id === ctx.params[0]) || list[0];

      // 왼쪽: 항목 목록
      const ul = h('ul', { class: 'items' });
      const rowFor = (it) => {
        const n = doneCount(it, students);
        const full = n >= students.length;
        const meta = [it.due ? cfg.dueLabel + ' ' + D.shortDate(it.due) + ' · ' + D.dday(it.due) : '마감 없음'].join('');
        return h('li', null, h('button', { type: 'button', aria: { current: String(it === sel) }, on: { click: () => CD.go(cfg.id + '/' + it.id) } },
          h('span', { class: 't', text: it.title }),
          full ? h('span', { class: 'count' }, CD.ui.doneStamp('다 함')) : h('span', { class: 'count num' }, h('b', { text: String(n) }), h('small', { text: '/' + students.length })),
          h('span', { class: 'meta', text: meta })));
      };
      list.forEach((it) => ul.append(rowFor(it)));

      // 오른쪽: 도장판
      const countEl = h('span');
      const missEl = h('p', { class: 'missing' });
      const update = () => {
        const n = doneCount(sel, students);
        countEl.replaceChildren(n >= students.length ? CD.ui.doneStamp('다 함') : CD.ui.count(n, students.length));
        const miss = students.filter((k) => !sel.done[k.id]).map((k) => k.name);
        missEl.replaceChildren(...(miss.length ? [h('b', { text: cfg.missingWord + ' ' + miss.length + '명: ' }), miss.join(', ')] : [cfg.allDoneText]));
        const btn = ul.querySelector('[aria-current="true"]');
        if (btn) btn.parentElement.replaceWith(rowFor(sel));
      };
      const board = CD.ui.board({
        students,
        stamp: cfg.stamp,
        doneWord: cfg.doneWord,
        label: sel.title + ' 체크',
        isDone: (k) => !!sel.done[k.id],
        onToggle(k) {
          if (sel.done[k.id]) delete sel.done[k.id];
          else sel.done[k.id] = Date.now();
          store.save();
          update();
          return !!sel.done[k.id];
        },
      });
      const allBtn = CD.ui.btn('모두 찍기', () => {
        const before = Object.assign({}, sel.done);
        students.forEach((k) => { if (!sel.done[k.id]) sel.done[k.id] = Date.now(); });
        store.save();
        CD.refresh();
        CD.ui.toast('모두 도장을 찍었어요.', { action: '되돌리기', fn: () => { sel.done = before; store.save(); CD.refresh(); } });
      }, 'quiet sm');
      const editBtn = CD.ui.btn('고치기', () => editForm(sel), 'quiet sm');
      const head = h('div', { class: 'board-head' },
        h('h2', { text: sel.title }),
        countEl,
        sel.due ? h('span', { class: 'muted', text: cfg.dueLabel + ' ' + D.longDate(sel.due) + ' · ' + D.dday(sel.due) }) : null,
        h('div', { class: 'row-btns' }, allBtn, editBtn));
      update();

      root.append(CD.ui.page(cfg.title, [add],
        h('p', { class: 'help small', style: { 'margin-bottom': '1rem' }, text: cfg.hint }),
        h('div', { class: 'split' }, h('div', null, ul), h('div', null, head, missEl, board))));
    }

    CD.modules.register({
      id: cfg.id,
      title: cfg.title,
      group: 'check',
      order: cfg.order,
      badge(s) {
        const total = store.students().length;
        if (!total) return '';
        const open = s[cfg.key].filter((it) => doneCount(it, store.students()) < total).length;
        return open || '';
      },
      render,
    });
  }

  makeCheck({
    id: 'homework', key: 'homework', title: '과제', order: 110, noun: '과제', addLabel: '과제 추가', dueLabel: '마감',
    stamp: '냄', doneWord: '냈어요', missingWord: '못 낸 사람', allDoneText: '모두 냈어요.', defaultDue: true,
    placeholder: '예: 수학 익힘책 52~53쪽', emptyTitle: '아직 과제가 없어요', emptyText: '과제를 추가하면 학생 이름을 눌러 낸 사람에게 도장을 찍어요.',
    hint: '학생 이름을 누르면 도장이 찍히고 다시 누르면 지워져요.',
  });
  makeCheck({
    id: 'forms', key: 'forms', title: '안내장', order: 120, noun: '안내장', addLabel: '안내장 추가', dueLabel: '회수',
    stamp: '냄', doneWord: '냈어요', missingWord: '안 낸 사람', allDoneText: '모두 냈어요.', defaultDue: true,
    placeholder: '예: 현장체험학습 동의서', emptyTitle: '받을 안내장이 없어요', emptyText: '신청서나 동의서를 나눠 준 뒤 추가하면 누가 냈는지 도장으로 확인해요.',
    hint: '안내장이나 신청서를 받으면 그 학생 이름을 눌러 도장을 찍어요.',
  });
  makeCheck({
    id: 'missions', key: 'missions', title: '미션', order: 150, noun: '미션', addLabel: '미션 추가', dueLabel: '기한',
    stamp: '성공', doneWord: '성공했어요', missingWord: '아직 도전 중', allDoneText: '모두 성공했어요.', defaultDue: false,
    placeholder: '예: 줄넘기 100번 넘기', emptyTitle: '아직 미션이 없어요', emptyText: '반 전체가 도전할 미션을 만들고 성공한 학생에게 도장을 찍어 줘요.',
    hint: '미션에 성공한 학생 이름을 누르면 성공 도장이 찍혀요.',
  });
})(window.CD = window.CD || {});
